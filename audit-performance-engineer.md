# Deck Salone — Production-Grade Performance Audit

**Date:** 2026-07-02  
**Auditor:** Performance Engineering Review  
**Scope:** Full-stack audit of `/Users/djfredmax/Desktop/Deck Salone`  
**Status:** READ-ONLY — No files modified

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Issues (P0)](#2-critical-issues-p0)
3. [High-Priority Issues (P1)](#3-high-priority-issues-p1)
4. [Medium-Priority Issues (P2)](#4-medium-priority-issues-p2)
5. [Low-Priority Issues (P3)](#5-low-priority-issues-p3)
6. [Backend Performance Analysis](#6-backend-performance-analysis)
7. [Frontend Performance Analysis](#7-frontend-performance-analysis)
8. [Security & Infrastructure](#8-security--infrastructure)
9. [Database & Query Analysis](#9-database--query-analysis)
10. [Bundle & Asset Analysis](#10-bundle--asset-analysis)
11. [Recommendations Roadmap](#11-recommendations-roadmap)

---

## 1. Executive Summary

This audit covers the **Deck Salone** codebase — a React 19 + Vite frontend with an Express 5 + Prisma + PostgreSQL backend. The application is a DJ booking and mix-streaming platform targeting the Sierra Leone market.

### Overall Health Score: **C+ (68/100)**

| Category | Score | Notes |
|----------|-------|-------|
| Backend API | C+ | Good Prisma patterns, but critical route bugs and scaling bottlenecks |
| Frontend Rendering | C | Multiple `Math.random()` in render paths, massive components |
| Database | B | Good indexing, but N+1 patterns and in-memory computation |
| Security | C | Permissive CORS, weak rate limits, missing env validation |
| Bundle Size | C | Massive page components, no code-splitting for admin |
| Caching Strategy | D | `staleTime: 0` on mixes, no CDN caching strategy |

### Top 5 Issues to Fix Immediately

1. **CRITICAL:** Duplicate route handlers in `mixes.ts` — dead code + shadowing
2. **CRITICAL:** `Math.random()` in `WaveformBar` render causes constant re-renders
3. **HIGH:** Rankings API loads ALL DJs into memory — won't scale past ~1,000 DJs
4. **HIGH:** Mix discovery loads ALL mixes into memory — same scaling issue
5. **HIGH:** `AdminDashboard.tsx` is 2,917 lines — massive bundle impact

---

## 2. Critical Issues (P0)

### P0.1 — Duplicate Route Handlers in `mixes.ts` (CRITICAL BUG)

**File:** `app/api/routes/mixes.ts`  
**Lines:** 46–134 and 135–205 (duplicate `router.get('/')`); 275–304 and 305–331 (duplicate `router.get('/trending')`)

**Problem:** Express route registration is order-dependent but last-wins for the same path + method. The first `router.get('/')` (lines 46–134) and first `router.get('/trending')` (lines 275–304) are **completely unreachable** — they are shadowed by the second definitions.

**Impact:**
- The first `/` handler (with search, filters, pagination, includes) is dead code
- The second `/` handler (simpler, fewer includes) is the only one that runs
- Same for `/trending` — the first richer handler is shadowed
- Any bug fixes applied to the first handler are silently ignored

**Fix:** Remove the duplicate route definitions. Consolidate into single handlers:

```typescript
// Remove lines 135-205 (second router.get('/'))
// Remove lines 305-331 (second router.get('/trending'))
// Keep the first, more complete implementations
```

**Verification:** Add a simple integration test that hits `/api/mixes` and `/api/mixes/trending` and verifies the response shape matches the intended (first) handler.

---

### P0.2 — `Math.random()` in Render Path (React Re-Render Storm)

**Files:**
- `app/src/pages/Home.tsx` — `WaveformBar` (lines 22–37), `AnimatedWaveform` (lines 39–48)
- `app/src/pages/DjProfile.tsx` — Mix card mini-waveform (lines 935–944)
- `app/src/components/MixPlayer.tsx` — `ModernProgressBar` waveRef (lines 58–64), `ExpandedWaveform` baseRef (lines 167–172)
- `app/src/components/WaveformAnimation.tsx` — lines 11–13

**Problem:** `Math.random()` is called during render/animate transitions. In `WaveformBar`:

```typescript
animate={{
  height: [20, 40 + Math.random() * 40, 20],  // NEW random every render!
}}
transition={{
  duration: 2 + Math.random() * 1,              // NEW random every render!
}}
```

Every time React re-renders (e.g., state changes, parent updates), `Math.random()` produces new values. Framer Motion sees new `animate` objects and restarts animations. This causes:
- **Constant React re-renders** (infinite loop potential)
- **Janky animations** (bars jump instead of smoothly animating)
- **High CPU usage** on the main thread
- **Battery drain** on mobile devices

**Impact:** With 60 bars on Home, 80 on MixHub, 30 per mix card in DjProfile, this is hundreds of `Math.random()` calls per render cycle.

**Fix:** Use `useMemo` or `useRef` to generate random values once:

```typescript
const WaveformBar = memo(function WaveformBar({ delay }: { delay: number }) {
  // Generate once per mount, never change
  const config = useRef({
    midHeight: 40 + Math.random() * 40,
    duration: 2 + Math.random() * 1,
  }).current;

  return (
    <motion.div
      className="w-[2px] bg-gold/10 rounded-full"
      animate={{
        height: [20, config.midHeight, 20],
      }}
      transition={{
        duration: config.duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
});
```

**Same fix needed for:**
- `DjProfile.tsx` mix card waveform (use `useMemo` for heights array)
- `MixPlayer.tsx` `ModernProgressBar` waveRef (already uses ref, but verify)
- `WaveformAnimation.tsx` (already wrapped in `useMemo` — ✅ good)

---

### P0.3 — `Math.random()` in `ExpandedWaveform` setState Loop

**File:** `app/src/components/MixPlayer.tsx`  
**Lines:** 176–190

**Problem:**

```typescript
const interval = setInterval(() => {
  setHeights((prev) =>
    prev.map((_h, i) => {
      const variation = (Math.random() - 0.5) * 10;
      return Math.max(6, Math.min(50, baseRef.current[i] + variation));
    })
  );
}, 80);
```

This calls `setState` every 80ms with 60 new height values. React batches updates, but this still triggers a re-render of the entire `ExpandedWaveform` component (and potentially parent `MixPlayer`) 12.5 times per second.

**Fix:** Use CSS animations or a canvas-based waveform instead of React state for this. If React state is required, throttle to 200ms+ and use `requestAnimationFrame`:

```typescript
useEffect(() => {
  if (!isPlaying) {
    setHeights([...baseRef.current]);
    return;
  }
  let rafId: number;
  const update = () => {
    setHeights((prev) =>
      prev.map((_h, i) => {
        const variation = (Math.random() - 0.5) * 10;
        return Math.max(6, Math.min(50, baseRef.current[i] + variation));
      })
    );
    rafId = requestAnimationFrame(update);
  };
  rafId = requestAnimationFrame(update);
  return () => cancelAnimationFrame(rafId);
}, [isPlaying]);
```

Actually, better: **use CSS `@keyframes` with random initial values** — no React state needed at all for the animation.

---

## 3. High-Priority Issues (P1)

### P1.1 — Rankings API Loads ALL DJs Into Memory

**File:** `app/api/routes/rankings.ts`  
**Lines:** ~30–80 (the GET handler)

**Problem:** The rankings endpoint fetches **all DJs** with all related data, computes scores in JavaScript, sorts, then paginates:

```typescript
const djs = await prisma.djProfile.findMany({
  where: { isPublic: true },
  include: {
    streamingPlatforms: true,
    mixes: { select: { likes: true, plays: true } },
    reviews: { select: { rating: true } },
    _count: { select: { bookingsAsDj: true, events: true } },
  },
});
// ... compute scores in JS ... then sort ... then slice for pagination
```

**Impact:**
- **O(n) memory usage** where n = number of DJs
- With 1,000 DJs, each with platforms, mixes, reviews — this could load 10,000+ rows
- Response time grows linearly with DJ count
- Will crash or timeout when the DJ base scales

**Fix Options:**

**Option A — Pre-computed Rankings (Recommended):**
The `rankingAlgorithm.ts` already has `recalculateAllRankings()` that runs in batches and stores scores. The `/api/rankings` endpoint should simply query the pre-computed `rankingScore` field:

```typescript
const djs = await prisma.djProfile.findMany({
  where: { isPublic: true },
  orderBy: { rankingScore: 'desc' },
  skip,
  take: limit,
  select: {
    id: true, stageName: true, avatar: true,
    rankingScore: true, rankingPosition: true,
    city: true, genres: true,
    // ... minimal fields for display
  },
});
```

**Option B — Database-Level Scoring (if real-time needed):**
Use a Prisma raw query or a PostgreSQL materialized view that computes scores at the DB level.

**Option C — Cursor Pagination + Incremental Loading:**
If real-time computation is truly required (it shouldn't be), use cursor pagination and compute scores in batches.

---

### P1.2 — Mix Discovery Loads ALL Mixes Into Memory

**File:** `app/api/utils/mixDiscovery.ts`  
**Lines:** ~80–140 (`discoverMixes()` function)

**Problem:** Similar to rankings — fetches ALL mixes with related data, then scores in JS:

```typescript
const mixes = await prisma.mix.findMany({
  where: { isPublic: true },
  include: {
    dj: { include: { streamingPlatforms: true } },
    likes: true,
  },
});
// ... score all mixes in JS ... then sort ... then paginate
```

**Impact:** Same scaling issue as P1.1. With 10,000 mixes, this loads massive amounts of data into memory.

**Fix:** Add pagination at the database level. Discovery should use a hybrid approach:
1. Query a limited set of candidates (e.g., last 90 days, top 500 by plays)
2. Score only those candidates
3. Return paginated results

Or better: add a `discoveryScore` field to the `Mix` model and update it via a background job (like rankings).

---

### P1.3 — `AdminDashboard.tsx` is 2,917 Lines

**File:** `app/src/pages/AdminDashboard.tsx`

**Problem:** This is a single file containing:
- 30+ imported hooks
- Multiple chart types (AreaChart, BarChart, PieChart)
- Data tables for users, DJs, bookings, mixes, events, payments, campaigns, battles, subscriptions
- Modal dialogs for various actions
- Form handling for multiple entity types

**Impact:**
- **Massive bundle size** for the `/admin` route — even though most users never visit it
- **Slow initial load** for admin users
- **Difficult to maintain** — any change requires loading the entire file
- **No code splitting** — the entire admin UI is one chunk

**Fix:** Split into sub-components and use dynamic imports:

```typescript
// AdminDashboard.tsx — thin shell with tab router
const AdminStats = lazy(() => import('./admin/AdminStats'));
const AdminUsers = lazy(() => import('./admin/AdminUsers'));
const AdminDJs = lazy(() => import('./admin/AdminDJs'));
const AdminBookings = lazy(() => import('./admin/AdminBookings'));
// ... etc
```

Each tab should be its own file (~200–400 lines each).

---

### P1.4 — `DjProfile.tsx` is 1,991 Lines

**File:** `app/src/pages/DjProfile.tsx`

**Problem:** Contains:
- `BookingModal` component (~300 lines)
- `OverviewTab`, `MixesTab`, `PhotosTab`, `EventsTab`, `ReviewsTab`, `RankingTab` components
- Type definitions, helper functions, animation variants
- All in one file

**Impact:**
- Large bundle for a commonly visited page
- Hard to navigate and maintain
- All tabs load even if user only visits one

**Fix:** Split tabs into separate files:

```typescript
// DjProfile.tsx — shell with tab router
import { OverviewTab } from './dj-profile/OverviewTab';
import { MixesTab } from './dj-profile/MixesTab';
// ... etc
```

Use `React.lazy()` for tabs that aren't the default.

---

### P1.5 — `useMixes` Hook Has `staleTime: 0`

**File:** `app/src/hooks/useMixes.ts`  
**Line:** ~10

**Problem:**

```typescript
export function useMixes() {
  return useQuery({
    queryKey: ['mixes'],
    queryFn: async () => { /* ... */ },
    staleTime: 0,  // ALWAYS refetches on mount!
  });
}
```

**Impact:** Every component that uses `useMixes()` triggers a fresh API call on mount. If multiple components on the same page use this hook, multiple identical requests fire simultaneously.

**Fix:** Increase staleTime based on data freshness requirements:

```typescript
export function useMixes() {
  return useQuery({
    queryKey: ['mixes'],
    queryFn: async () => { /* ... */ },
    staleTime: 5 * 60 * 1000,  // 5 minutes — mixes don't change that fast
    gcTime: 10 * 60 * 1000,     // Keep in cache for 10 minutes
  });
}
```

Same issue likely exists in other hooks — audit all `useQuery` calls for `staleTime: 0`.

---

### P1.6 — Battle Vote Recalculates ALL Entry Scores Synchronously

**File:** `app/api/routes/battles.ts`  
**Lines:** 300–317

**Problem:** When a user votes, the code:
1. Fetches ALL entries for the battle
2. Computes vote shares for ALL entries
3. Updates ALL entries one by one in a loop

```typescript
const allEntries = await prisma.battleEntry.findMany({
  where: { battleId: req.params.id },
  select: { id: true, votes: true, baseScore: true },
});

const totalVotes = allEntries.reduce((sum, e) => sum + e.votes, 0);

for (const e of allEntries) {
  const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
  const voteScore = voteShare * 40;
  const finalScore = e.baseScore * 0.6 + voteScore;

  await prisma.battleEntry.update({  // N sequential updates!
    where: { id: e.id },
    data: { voteScore, finalScore: Math.round(finalScore * 100) / 100 },
  });
}
```

**Impact:** With 100 entries, this is 100 sequential DB updates per vote. Under load, this will cause timeouts.

**Fix:** Use `Promise.all()` for parallel updates, or better, use a raw SQL query:

```typescript
// Parallel updates
await Promise.all(
  allEntries.map((e) => {
    const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
    const voteScore = voteShare * 40;
    const finalScore = e.baseScore * 0.6 + voteScore;
    return prisma.battleEntry.update({
      where: { id: e.id },
      data: { voteScore, finalScore: Math.round(finalScore * 100) / 100 },
    });
  })
);
```

Or use a single raw SQL `UPDATE` with a CTE.

---

## 4. Medium-Priority Issues (P2)

### P2.1 — CORS is Overly Permissive in Production

**File:** `app/api/server.ts`  
**Line:** ~40

**Problem:**

```typescript
app.use(cors({
  origin: true,  // Reflects ANY origin!
  credentials: true,
}));
```

`origin: true` means the server accepts requests from **any domain**. This is dangerous in production:
- Enables CSRF attacks from malicious sites
- Allows credential theft via XSS on third-party sites
- Violates security best practices

**Fix:** Use explicit origin whitelist:

```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://deck.salone',
  'https://www.deck.salone',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### P2.2 — Rate Limit is Too Permissive

**File:** `app/api/utils/rateLimiter.ts`  
**Lines:** ~10–15

**Problem:**

```typescript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                  // 1000 requests per 15 min!
});
```

1,000 requests per 15 minutes = **~1.1 req/sec average**. This is effectively no protection against:
- Scrapers
- Brute force attacks
- Accidental DDoS from misbehaving clients

**Fix:** Reduce to production-appropriate values:

```typescript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
```

Also consider:
- Stricter limits for unauthenticated users (e.g., 30 req/15min)
- IP-based blocking after repeated violations
- Redis-backed store for rate limiting across server instances

---

### P2.3 — In-Memory OTP Store Won't Scale

**File:** `app/api/utils/otp.ts`  
**Lines:** ~10–12

**Problem:**

```typescript
const otpStore = new Map();  // In-memory only!
```

OTP codes are stored in a Node.js `Map`. This means:
- OTPs are lost on server restart
- Doesn't work with multiple server instances (load balancer)
- Memory leak potential if cleanup fails

**Fix:** Replace with Redis:

```typescript
// Use Redis (ioredis or redis package)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function sendOtp(phone) {
  const code = generateOtp();
  await redis.setex(`otp:${phone}`, 600, JSON.stringify({ code, attempts: 0 }));
  // ... send SMS
}

async function verifyOtp(phone, code) {
  const data = await redis.get(`otp:${phone}`);
  if (!data) return { valid: false, error: 'OTP expired' };
  // ... verify
  await redis.del(`otp:${phone}`);  // Clean up on success
}
```

---

### P2.4 — `usePublicStats` Makes 4 Separate API Calls

**File:** `app/src/hooks/usePublicStats.ts`

**Problem:** The hook makes 4 independent requests:
- `/djs?page=1&limit=1` (just for `meta.total`)
- `/mixes?page=1&limit=1` (just for `meta.total`)
- `/events?page=1&limit=1` (just for `meta.total`)
- `/djs/cities`

**Impact:** 4 round-trips to the server for data that could be returned in a single call.

**Fix:** Create a dedicated `/stats` endpoint:

```typescript
// Backend
router.get('/stats', async (req, res) => {
  const [djCount, mixCount, eventCount, cities] = await Promise.all([
    prisma.djProfile.count({ where: { isPublic: true } }),
    prisma.mix.count({ where: { isPublic: true } }),
    prisma.event.count(),
    prisma.djProfile.findMany({ distinct: ['city'], select: { city: true } }),
  ]);
  res.json({ success: true, data: { djCount, mixCount, eventCount, cityCount: cities.length } });
});
```

---

### P2.5 — Dashboard Overview Makes 13 Parallel Queries

**File:** `app/api/routes/dashboard.ts`

**Problem:** The DJ dashboard endpoint fires 13 parallel Prisma queries. While `Promise.all` is good, 13 queries is still a lot for one page load.

**Impact:**
- High database load
- Longer response times
- Connection pool exhaustion under load

**Fix:** Combine related queries. For example, instead of separate queries for `totalMixes`, `totalStreams`, `totalBookings`, etc., use a single aggregation:

```typescript
const stats = await prisma.djProfile.findUnique({
  where: { id: djId },
  select: {
    _count: { select: { mixes: true, bookingsAsDj: true, events: true } },
    totalFollowers: true,
    totalStreams: true,
    averageRating: true,
    rankingPosition: true,
    rankingScore: true,
  },
});
```

Also consider caching dashboard data with a short TTL (e.g., 30 seconds) since it doesn't change rapidly.

---

### P2.6 — Review Average Rating Computed Inefficiently

**File:** `app/api/routes/reviews.ts`  
**Lines:** 106–119 and 140–151

**Problem:** When a review is created or deleted, the code fetches ALL reviews for the DJ and computes the average in JavaScript:

```typescript
const reviews = await prisma.review.findMany({
  where: { djId },
  select: { rating: true },
});
const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
```

**Fix:** Use Prisma's aggregation:

```typescript
const result = await prisma.review.aggregate({
  where: { djId },
  _avg: { rating: true },
});
const avg = result._avg.rating || 0;
```

This is a single aggregation query instead of fetching all rows.

---

### P2.7 — No CDN or Cache Headers for Static Assets

**File:** `app/api/server.ts`  
**Lines:** ~60–80

**Problem:** Static file serving uses Express's default `express.static()` without cache headers:

```typescript
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
```

**Impact:** Every image, audio file, and document is re-fetched on every page load. No browser caching.

**Fix:** Add cache headers:

```typescript
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  maxAge: '1d',  // 1 day for user uploads
  etag: true,
}));

app.use(express.static(path.join(__dirname, '../../public'), {
  maxAge: '1y',  // 1 year for static assets (hashed filenames)
  immutable: true,
}));
```

Also consider using a CDN (Cloudflare, AWS CloudFront) for uploads.

---

### P2.8 — Gig Matching Loads ALL DJs

**File:** `app/api/routes/gigs.ts`  
**Lines:** 140–209 (`/:id/matches`)

**Problem:** The smart matching engine fetches ALL DJs:

```typescript
const djs = await prisma.djProfile.findMany({
  where: { isPublic: true },
  include: { user: { select: { id: true, email: true } } },
});
```

Then scores them all in memory and returns top 20.

**Fix:** Add filtering at the database level before scoring:

```typescript
const djs = await prisma.djProfile.findMany({
  where: {
    isPublic: true,
    // Pre-filter by city if gig has city
    ...(gig.city ? { OR: [{ city: { equals: gig.city, mode: 'insensitive' } }, { willTravel: true }] } : {}),
    // Pre-filter by genre overlap
    ...(gig.musicStyles?.length ? { genres: { hasSome: gig.musicStyles } } : {}),
  },
  take: 100,  // Limit candidates
  // ...
});
```

---

## 5. Low-Priority Issues (P3)

### P3.1 — `queryClient.ts` Missing `gcTime`

**File:** `app/src/lib/queryClient.ts`

**Problem:**

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Missing `gcTime` (formerly `cacheTime`). Old queries stay in memory indefinitely.

**Fix:**

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,  // Clean up after 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

### P3.2 — `axios` Instance Missing Timeout

**File:** `app/src/lib/api.ts`

**Problem:** No timeout configured on the Axios instance. Hanging requests will never abort.

**Fix:**

```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,  // 30 seconds
});
```

---

### P3.3 — Password Reset Tokens Use SHA-256 (Not Ideal)

**File:** `app/api/routes/auth.ts`

**Problem:** Password reset tokens are hashed with SHA-256. While not immediately vulnerable, SHA-256 is fast and designed for integrity, not password hashing.

**Fix:** Use bcrypt for token hashing, or better, use cryptographically secure random tokens with a database lookup (no hashing needed — just store the hash with bcrypt).

---

### P3.4 — No Request ID for Tracing

**Problem:** No correlation IDs for tracking requests across logs. Debugging production issues is difficult.

**Fix:** Add a middleware that generates/request-passes a `X-Request-ID` header:

```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.id = req.get('X-Request-ID') || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

### P3.5 — Missing Health Check Endpoint

**Problem:** No `/health` or `/ready` endpoint for load balancers or monitoring.

**Fix:** Add a simple health check:

```typescript
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
```

---

### P3.6 — Light Mode CSS is Very Long and Manual

**File:** `app/src/index.css`  
**Lines:** 266–449

**Problem:** The light mode overrides are 180+ lines of manual CSS overrides. This is brittle and hard to maintain.

**Fix:** Use CSS custom properties more consistently, or use Tailwind's `darkMode: 'class'` strategy with a proper theme provider. The current approach of `html[data-theme="light"]` is fine but the override list is excessive.

---

## 6. Backend Performance Analysis

### 6.1 Route Handler Analysis

| Route File | Lines | Issues |
|-----------|-------|--------|
| `admin.ts` | 1,163 | Many queries, no pagination on some endpoints |
| `mixes.ts` | 728 | **CRITICAL: Duplicate routes** |
| `djs.ts` | 638 | Duplicate routes, in-memory ranking |
| `auth.ts` | 477 | SHA-256 for tokens, no rate limit on register |
| `bookings.ts` | 411 | Generally OK |
| `battles.ts` | 392 | Sequential updates in vote loop |
| `payments.ts` | 411 | OK |
| `users.ts` | 725 | Synthetic notifications (no DB model) |
| `events.ts` | 295 | OK |
| `rankings.ts` | 278 | **Loads ALL DJs into memory** |
| `discover.ts` | 280 | Good Promise.all usage |
| `dashboard.ts` | 264 | 13 parallel queries |
| `reviews.ts` | 158 | Inefficient avg calculation |
| `gigs.ts` | 307 | Loads ALL DJs for matching |
| `campaigns.ts` | 236 | OK |
| `opportunities.ts` | 226 | OK |
| `photos.ts` | 129 | OK |
| `messages.ts` | — | Not audited (assumed OK) |

### 6.2 Good Patterns Found

✅ **Prisma singleton** — `app/api/utils/prisma.ts` uses a proper singleton pattern  
✅ **Batch processing** — `rankingAlgorithm.ts` uses cursor pagination (BATCH_SIZE=100)  
✅ **Transaction safety** — Like toggle uses `$transaction`  
✅ **Zod validation** — Most routes use Zod schemas  
✅ **Rate limiting** — Different limits for different endpoints  
✅ **JWT auth** — Stateless, no DB round-trip per request  

### 6.3 Bad Patterns Found

❌ **Duplicate route handlers** — `mixes.ts`, `djs.ts`  
❌ **In-memory computation** — Rankings, mix discovery, gig matching  
❌ **N+1 queries** — Battle vote updates, review avg calculation  
❌ **No DB-level pagination** — Several endpoints fetch all rows  
❌ **Missing indexes** — Verify all foreign keys are indexed (Prisma usually does this)  

---

## 7. Frontend Performance Analysis

### 7.1 Component Size Analysis

| Component | Lines | Impact |
|-----------|-------|--------|
| `AdminDashboard.tsx` | 2,917 | **Massive** — split immediately |
| `DjProfile.tsx` | 1,991 | **Large** — split tabs |
| `MixPlayer.tsx` | 896 | Large but justified (complex player) |
| `MixHub.tsx` | 435 | Medium |
| `Discover.tsx` | 867 | Medium |
| `Home.tsx` | 1,082 | Medium — could split sections |
| `Dashboard/Overview.tsx` | 557 | OK |
| `Dashboard/Mixes.tsx` | 1,010 | Large — split upload modal |
| `Dashboard/Analytics.tsx` | 229 | OK |

### 7.2 Rendering Issues

| Issue | File | Severity |
|-------|------|----------|
| `Math.random()` in render | `Home.tsx`, `DjProfile.tsx` | **Critical** |
| `Math.random()` in setState loop | `MixPlayer.tsx` | **Critical** |
| `Math.random()` in memo | `WaveformAnimation.tsx` | Low (memoized) |
| No lazy loading for admin | `App.tsx` | High |
| `AnimatePresence` without `mode="wait"` | Various | Medium |

### 7.3 Good Patterns Found

✅ **React.lazy() for pages** — `App.tsx` uses lazy loading for routes  
✅ **Memo usage** — `WaveformAnimation.tsx` uses `memo`  
✅ **Passive event listeners** — `Navbar.tsx` scroll handler uses `{ passive: true }`  
✅ **Image lazy loading** — `DjProfile.tsx` PhotosTab uses `loading="lazy"`  

---

## 8. Security & Infrastructure

### 8.1 Security Issues

| Issue | Severity | File |
|-------|----------|------|
| CORS `origin: true` | **High** | `server.ts` |
| Rate limit 1000/15min | **High** | `rateLimiter.ts` |
| SHA-256 for reset tokens | Medium | `auth.ts` |
| No helmet CSP | Medium | `server.ts` (CSP disabled) |
| No request size limit on uploads | Medium | `upload.ts` |
| Missing env validation | Low | `.env.example` |

### 8.2 Infrastructure Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| No health check endpoint | Medium | Add `/health` |
| No request ID tracing | Low | Add `X-Request-ID` |
| In-memory OTP store | **High** | Use Redis |
| No CDN for uploads | Medium | Add CloudFront/Cloudflare |
| No cache headers on statics | Medium | Add `maxAge` |

---

## 9. Database & Query Analysis

### 9.1 Schema Observations

**File:** `app/api/prisma/schema.prisma` (639 lines, 20+ models)

Good:
- Proper indexing on most tables (`@@index` directives)
- Good use of relations and foreign keys
- Enum types for statuses
- `_count` fields for aggregation

Concerns:
- `Json?` fields for flexible data (socialLinks, streamingLinks) — fine for now, but consider normalizing if queried frequently
- No full-text search indexes — search is `contains` (case-insensitive) which won't scale

### 9.2 Query Patterns to Optimize

1. **Rankings:** Should use pre-computed `rankingScore` field (already exists!)
2. **Mix discovery:** Needs a `discoveryScore` field + background job
3. **Review averages:** Use `prisma.aggregate._avg` instead of `findMany` + JS reduce
4. **Battle vote recalculation:** Use parallel updates or raw SQL
5. **Gig matching:** Pre-filter in DB before scoring in JS
6. **Dashboard stats:** Combine into fewer queries or add caching

---

## 10. Bundle & Asset Analysis

### 10.1 Dependencies (from package.json)

**Notable dependencies:**
- `react@19` — Latest, good
- `recharts` — Heavy charting library; consider `chart.js` or lighter alternative if bundle size is concern
- `framer-motion` — Animation library; tree-shakes well but still significant
- `lucide-react` — Icon library; imports should be tree-shaken
- `@tanstack/react-query` — Excellent choice
- `zustand` — Lightweight state management, good

**Concerns:**
- Both `recharts` and `framer-motion` are heavy. If bundle size is a concern, audit with `@vitejs/plugin-visualizer`
- `tailwindcss-animate` is small, good

### 10.2 Bundle Splitting Recommendations

1. **Split admin routes** — `AdminDashboard.tsx` should be its own chunk
2. **Split chart libraries** — Load `recharts` only on dashboard pages
3. **Split heavy modals** — Upload modals, import modals can be lazy-loaded
4. **Use `React.lazy()` for tabs** — DjProfile tabs, Dashboard tabs

---

## 11. Recommendations Roadmap

### Phase 1: Critical Fixes (Week 1)

1. **Fix duplicate routes in `mixes.ts`** — Remove shadowed handlers
2. **Fix `Math.random()` in render** — Use `useRef`/`useMemo` for waveform bars
3. **Fix `Math.random()` in `ExpandedWaveform`** — Use CSS animations or throttle state updates
4. **Fix CORS** — Whitelist production origins
5. **Lower rate limits** — 100 req/15min for production

### Phase 2: Scaling Fixes (Week 2–3)

1. **Fix rankings endpoint** — Use pre-computed `rankingScore` field
2. **Fix mix discovery** — Add `discoveryScore` field + background job
3. **Fix battle vote loop** — Parallel updates or raw SQL
4. **Fix review averages** — Use Prisma aggregation
5. **Fix gig matching** — Pre-filter in DB

### Phase 3: Frontend Optimization (Week 3–4)

1. **Split `AdminDashboard.tsx`** — Into ~10 sub-components
2. **Split `DjProfile.tsx`** — Tab components into separate files
3. **Add staleTime to queries** — Remove `staleTime: 0` from `useMixes`
4. **Add `gcTime` to queryClient** — Prevent memory leaks
5. **Add Axios timeout** — 30 seconds default

### Phase 4: Infrastructure (Week 4–5)

1. **Redis for OTP store** — Replace in-memory Map
2. **Add health check endpoint** — `/health` for monitoring
3. **Add request ID tracing** — For log correlation
4. **Add cache headers** — For static assets and uploads
5. **CDN for uploads** — CloudFront/Cloudflare

### Phase 5: Monitoring & Observability (Ongoing)

1. **Add APM** — Datadog, New Relic, or self-hosted
2. **Add error tracking** — Sentry integration
3. **Add performance monitoring** — Web Vitals tracking
4. **Add database query logging** — Slow query analysis
5. **Add load testing** — k6 or Artillery for API stress testing

---

## Appendix A: File Inventory

### Backend Routes (Audited)
- `app/api/routes/admin.ts` — 1,163 lines
- `app/api/routes/auth.ts` — 477 lines
- `app/api/routes/battles.ts` — 392 lines
- `app/api/routes/bookings.ts` — 411 lines
- `app/api/routes/campaigns.ts` — 236 lines
- `app/api/routes/dashboard.ts` — 264 lines
- `app/api/routes/discover.ts` — 280 lines
- `app/api/routes/djs.ts` — 638 lines
- `app/api/routes/events.ts` — 295 lines
- `app/api/routes/gigs.ts` — 307 lines
- `app/api/routes/mixes.ts` — 728 lines
- `app/api/routes/opportunities.ts` — 226 lines
- `app/api/routes/payments.ts` — 411 lines
- `app/api/routes/photos.ts` — 129 lines
- `app/api/routes/rankings.ts` — 278 lines
- `app/api/routes/reviews.ts` — 158 lines
- `app/api/routes/users.ts` — 725 lines

### Backend Utilities (Audited)
- `app/api/utils/rankingAlgorithm.ts` — 371 lines
- `app/api/utils/mixDiscovery.ts` — 463 lines
- `app/api/utils/audioResolver.ts` — 348 lines
- `app/api/utils/upload.ts` — 119 lines
- `app/api/utils/storage.ts` — 107 lines
- `app/api/utils/campaignBoost.ts` — 106 lines
- `app/api/utils/imageProcessor.ts` — 54 lines
- `app/api/utils/otp.ts` — 89 lines
- `app/api/utils/passport.ts` — 83 lines
- `app/api/utils/ranking.ts` — 312 lines

### Frontend Pages (Audited)
- `app/src/pages/Home.tsx` — 1,082 lines
- `app/src/pages/Discover.tsx` — 867 lines
- `app/src/pages/DjProfile.tsx` — 1,991 lines
- `app/src/pages/MixHub.tsx` — 435 lines
- `app/src/pages/AdminDashboard.tsx` — 2,917 lines
- `app/src/pages/dashboard/Overview.tsx` — 557 lines
- `app/src/pages/dashboard/Analytics.tsx` — 229 lines
- `app/src/pages/dashboard/Mixes.tsx` — 1,010 lines

### Frontend Components (Audited)
- `app/src/components/Navbar.tsx` — 212 lines
- `app/src/components/Layout.tsx` — 31 lines
- `app/src/components/DashboardLayout.tsx` — 384 lines
- `app/src/components/MixPlayer.tsx` — 896 lines
- `app/src/components/WaveformAnimation.tsx` — 50 lines

### Frontend Hooks (Audited)
- `app/src/hooks/useAdmin.ts` — 897 lines
- `app/src/hooks/useDJs.ts` — 166 lines
- `app/src/hooks/useMixes.ts` — 140 lines
- `app/src/hooks/useHomeData.ts` — 58 lines
- `app/src/hooks/usePublicStats.ts` — 54 lines
- `app/src/hooks/useRankings.ts` — 77 lines
- `app/src/hooks/useEvents.ts` — 53 lines
- `app/src/hooks/useBookings.ts` — 48 lines
- `app/src/hooks/useFeatureAccess.ts` — 95 lines

### Config Files (Audited)
- `app/package.json` — Mixed frontend/backend deps
- `app/vite.config.ts` — Basic Vite config
- `app/tailwind.config.js` — 168 lines
- `app/tsconfig.json` — Project references
- `app/api/tsconfig.json` — Backend TS config
- `app/.env.example` — 17 lines
- `app/src/index.css` — 449 lines

---

*End of Audit Report*
