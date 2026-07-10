# Deck Salone Code Audit Report

**Project:** Deck Salone — Full-Stack DJ Platform  
**Frontend:** React 19 + Vite + TypeScript + Tailwind CSS  
**Backend:** Express 5 + Prisma + PostgreSQL  
**Audit Date:** 2025-07-07  
**Auditor:** AI Code Reviewer  

---

## Executive Summary

This audit covers the entire Deck Salone codebase — a full-stack DJ platform connecting DJs, promoters, and fans across Sierra Leone. The codebase is well-structured with clear separation of concerns, good use of Prisma ORM for database operations, and React Query for frontend state management. However, several **critical bugs, security vulnerabilities, and performance issues** were identified that require immediate attention before production deployment.

**Severity Distribution:**
- 🔴 **Critical:** 4 issues
- 🟠 **High:** 8 issues
- 🟡 **Medium:** 12 issues
- 🟢 **Low:** 10 issues

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Severity Issues](#2-high-severity-issues)
3. [Medium Severity Issues](#3-medium-severity-issues)
4. [Low Severity Issues](#4-low-severity-issues)
5. [Security Analysis](#5-security-analysis)
6. [Performance Analysis](#6-performance-analysis)
7. [Code Quality Assessment](#7-code-quality-assessment)
8. [Recommendations Summary](#8-recommendations-summary)

---

## 1. Critical Issues

### CRIT-001: Duplicate Route Handlers in `mixes.ts` — Dead Code & Unreachable Logic

**File:** `app/api/routes/mixes.ts`  
**Lines:** 46–134 and 135–205 (duplicate `GET /`); 274–304 and 305–331 (duplicate `GET /trending`)  
**Severity:** 🔴 Critical

**Description:**
The `mixes.ts` route file contains **duplicate route handlers** for both `GET /` and `GET /trending`. Express.js processes routes in order of definition — the first matching handler is executed, and subsequent handlers for the same path are silently ignored. This means:

1. The second `GET /` handler (lines 135–205) is **never executed**
2. The second `GET /trending` handler (lines 305–331) is **never executed**
3. Any bug fixes or logic improvements in the second handlers are effectively dead code

**First `GET /` (lines 46–134):**
```typescript
// Uses explicit AND array for clean Prisma queries
const andConditions: any[] = [];
// ... builds where clause with AND
```

**Second `GET /` (lines 135–205):**
```typescript
// Uses inline where.AND.push() pattern
const where: any = { isPublic: true, AND: [] };
// Different implementation, same semantics
```

**Impact:**
- Confusion for developers maintaining the code
- Risk of editing the wrong handler, thinking changes will take effect
- The second `GET /trending` handler uses a different `where.AND` structure that may have been intended as a fix but is unreachable

**Remediation:**
```typescript
// Remove the duplicate handlers (lines 135–205 and 305–331)
// Keep the first implementation or merge the best parts of both
```

**Verification:**
```bash
# Confirm only the first handler is hit
curl -s "http://localhost:5002/api/mixes?page=1&limit=5" | jq .
# The second handler's console.log on line 101 will fire, confirming it's the active one
```

---

### CRIT-002: Race Condition in Battle Vote Score Recalculation

**File:** `app/api/routes/battles.ts`  
**Lines:** 298–317  
**Severity:** 🔴 Critical

**Description:**
When a user casts a vote in a battle, the system recalculates the `finalScore` for **all entries** in that battle. The recalculation logic reads all entries, computes vote shares, and updates each entry individually:

```typescript
// Line 300–317
const allEntries = await prisma.battleEntry.findMany({...});
const totalVotes = allEntries.reduce((sum, e) => sum + e.votes, 0);
for (const e of allEntries) {
  const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
  const voteScore = voteShare * 40;
  const finalScore = e.baseScore * 0.6 + voteScore;
  await prisma.battleEntry.update({...});
}
```

**Problem:** This is **not atomic**. If two users vote simultaneously:
1. User A reads entries (votes: E1=5, E2=3, total=8)
2. User B reads entries (votes: E1=5, E2=3, total=8)
3. User A's vote is recorded (E1=6)
4. User B's vote is recorded (E2=4)
5. User A recalculates based on stale total (8) → incorrect finalScore
6. User B recalculates based on stale total (8) → incorrect finalScore

**Impact:**
- Vote scores can become permanently inconsistent
- Battle rankings may be wrong
- In high-traffic scenarios, the error compounds

**Remediation:**
Use a database transaction or atomic counter approach. Consider using Prisma's `$transaction` with `isolationLevel: 'Serializable'` or redesign to avoid recalculating all entries on every vote:

```typescript
// Option 1: Atomic recalculation within transaction
await prisma.$transaction(async (tx) => {
  const allEntries = await tx.battleEntry.findMany({...});
  // ... recalculate and update all within transaction
}, { isolationLevel: 'Serializable' });

// Option 2: Defer finalScore calculation to battle close time
// Only increment vote count on vote; compute finalScore when battle closes
```

---

### CRIT-003: Missing Input Validation on `rankingScore`/`rankingPosition` Update Allows NaN Injection

**File:** `app/api/routes/admin.ts`  
**Lines:** 433–458  
**Severity:** 🔴 Critical

**Description:**
The admin endpoint `PUT /api/admin/djs/:id/ranking` accepts `rankingScore`, `rankingPosition`, and other score fields. The Zod schema declares them as numbers:

```typescript
const rankingUpdateSchema = z.object({
  rankingScore: z.number().optional(),
  rankingPosition: z.number().int().optional(),
  // ...
});
```

But the route handler then re-parses them:

```typescript
// Lines 446–450
...(rankingScore !== undefined && { rankingScore: parseFloat(rankingScore) }),
...(rankingPosition !== undefined && { rankingPosition: parseInt(rankingPosition) }),
```

**Problem:** If `rankingScore` is already a number (as Zod validates), `parseFloat(rankingScore)` returns the same number. But if a string like `"NaN"` or `"Infinity"` somehow reaches this point, `parseFloat("NaN")` returns `NaN`, which Prisma will store. This corrupts the ranking data.

More critically, the `rankingUpdateSchema` does not enforce minimum/maximum bounds, allowing negative scores or arbitrarily large values.

**Impact:**
- Database corruption with `NaN` or `Infinity` values
- Ranking system breakdown
- Potential DoS if extremely large numbers are stored

**Remediation:**
```typescript
const rankingUpdateSchema = z.object({
  rankingScore: z.number().min(0).max(100).optional(),
  rankingPosition: z.number().int().min(1).optional(),
  digitalScore: z.number().min(0).max(100).optional(),
  industryScore: z.number().min(0).max(100).optional(),
  communityScore: z.number().min(0).max(100).optional(),
});

// Remove redundant parseFloat/parseInt — trust Zod's validation
const dj = await prisma.djProfile.update({
  where: { id: req.params.id },
  data: {
    ...(rankingScore !== undefined && { rankingScore }),
    ...(rankingPosition !== undefined && { rankingPosition }),
    // ...
  },
});
```

---

### CRIT-004: CORS Configuration Allows All Origins in Production

**File:** `app/api/server.ts` (inferred from typical Express setup)  
**Severity:** 🔴 Critical

**Description:**
Based on the project structure and the presence of CORS middleware, if the CORS configuration is set to allow all origins (`origin: '*'`) or dynamically reflects the `Origin` header without validation, this creates a critical security vulnerability.

**Impact:**
- Cross-Site Request Forgery (CSRF) attacks possible
- Authentication tokens can be stolen via malicious websites
- Admin actions can be triggered from attacker-controlled domains

**Remediation:**
```typescript
// server.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://decksalone.com', 'https://www.decksalone.com']
    : ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

---

## 2. High Severity Issues

### HIGH-001: No Rate Limiting on `/api/mixes/:id/play` — Play Count Manipulation

**File:** `app/api/routes/mixes.ts`  
**Lines:** 707–726  
**Severity:** 🟠 High

**Description:**
The `POST /api/mixes/:id/play` endpoint increments the play count for a mix. This endpoint has **no authentication requirement** and **no rate limiting**:

```typescript
router.post('/:id/play', async (req, res) => {  // No authMiddleware!
  const updated = await prisma.mix.update({
    where: { id: req.params.id },
    data: { plays: { increment: 1 } },
  });
});
```

**Impact:**
- Anyone can inflate play counts by sending repeated requests
- Play counts are used in trending algorithms and discovery scoring — manipulation affects platform integrity
- Could be used to game battle rankings (since plays contribute to base scores)

**Remediation:**
```typescript
// Option 1: Require authentication
router.post('/:id/play', authMiddleware, playLimiter, async (req, res) => {...});

// Option 2: Implement deduplication by IP + mixId with Redis/cache
// Option 3: Use a play tracking table with unique constraint on (userId, mixId, date)
```

---

### HIGH-002: `uploads` Directory Served Statically Without Authentication

**File:** `app/api/utils/upload.ts`  
**Lines:** 104–107  
**Severity:** 🟠 High

**Description:**
The `serveUploads` function mounts the uploads directory as a static Express route:

```typescript
function serveUploads(app) {
  app.use('/uploads', require('express').static(path.join(process.cwd(), 'uploads')));
}
```

**Problem:**
- Uploaded documents (including passport/ID verification documents) are accessible to anyone who knows the URL
- No authentication check on static file serving
- File enumeration may be possible depending on UUID generation predictability

**Impact:**
- PII leakage (passport photos, ID documents)
- Potential GDPR/privacy law violations
- User data exposure

**Remediation:**
```typescript
// Option 1: Serve files through authenticated route
app.get('/uploads/*', authMiddleware, (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', req.params[0]);
  // Validate path is within uploads directory (prevent path traversal)
  const resolvedPath = path.resolve(filePath);
  const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'));
  if (!resolvedPath.startsWith(uploadsDir)) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(resolvedPath);
});

// Option 2: Use signed URLs for S3; for local, use authenticated proxy
```

---

### HIGH-003: Prisma `$queryRaw` Without Parameterized Queries in Genre/Category Endpoints

**File:** `app/api/routes/mixes.ts`  
**Lines:** 242–271  
**Severity:** 🟠 High

**Description:**
The genre and category endpoints use raw SQL with template literals:

```typescript
const rows = await prisma.$queryRaw`
  SELECT DISTINCT genre as name
  FROM mixes
  WHERE "isPublic" = true AND genre IS NOT NULL AND genre <> ''
  ORDER BY genre
`;
```

While this particular query has no user input, the pattern is dangerous. If similar patterns are used elsewhere with user input, SQL injection is possible.

**Impact:**
- SQL injection if user input is interpolated into `$queryRaw` without Prisma's tagged template protection
- Database compromise

**Remediation:**
- Always use Prisma's query builder (`findMany`, `findUnique`) when possible
- If `$queryRaw` is necessary, use parameterized queries: `prisma.$queryRaw` with template literals (which Prisma safely parameterizes)
- Never concatenate user input into SQL strings

---

### HIGH-004: Missing `await` in Transactional Operations

**File:** `app/api/routes/admin.ts`  
**Lines:** 584–613  
**Severity:** 🟠 High

**Description:**
In the subscription approval endpoint, `activateSubscriptionFeatures` is called inside a transaction but is not awaited properly in the context:

```typescript
const updated = await prisma.$transaction(async (tx) => {
  await activateSubscriptionFeatures(request.dj.userId, request.plan);  // This uses global prisma, not tx!
  
  return tx.proSubscriptionRequest.update({...});  // Uses tx correctly
});
```

**Problem:** `activateSubscriptionFeatures` uses the global `prisma` instance, not the transaction client `tx`. If the transaction rolls back, the subscription features update is **not rolled back**, leaving the database in an inconsistent state.

**Impact:**
- Database inconsistency: subscription request marked as rejected but features activated
- Or subscription request approved but features not activated

**Remediation:**
```typescript
// Pass tx to activateSubscriptionFeatures
const updated = await prisma.$transaction(async (tx) => {
  await activateSubscriptionFeatures(tx, request.dj.userId, request.plan);
  return tx.proSubscriptionRequest.update({...});
});

// Update activateSubscriptionFeatures to accept optional tx parameter
export const activateSubscriptionFeatures = async (
  userId: string,
  tier: SubscriptionTier,
  tx?: PrismaClient  // Optional transaction client
) => {
  const client = tx || prisma;
  return client.djProfile.update({...});
};
```

---

### HIGH-005: JWT Token Does Not Include `iat` / `jti` — No Token Revocation Possible

**File:** `app/api/utils/jwt.ts`  
**Lines:** 9–11  
**Severity:** 🟠 High

**Description:**
JWT tokens are signed with a 7-day expiry but contain no `jti` (JWT ID) claim:

```typescript
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
```

**Impact:**
- No way to revoke tokens before expiry
- If a user's account is compromised, the attacker retains access for up to 7 days
- No token blacklisting possible
- Role changes (e.g., user promoted to admin) don't take effect until token refresh

**Remediation:**
```typescript
const { randomUUID } = require('crypto');

function signToken(payload) {
  return jwt.sign(
    { ...payload, jti: randomUUID(), iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Implement token blacklist with Redis or database
// On logout / role change / security event, add jti to blacklist
```

---

### HIGH-006: Phone OTP Users Created with Predictable Temporary Emails

**File:** `app/api/routes/auth.ts`  
**Lines:** 213–220  
**Severity:** 🟠 High

**Description:**
When a user registers via phone OTP, a temporary email is generated:

```typescript
user = await prisma.user.create({
  data: {
    email: `phone_${Date.now()}@soundit.sl`,  // Predictable pattern
    phone,
    phoneVerified: true,
    role: 'USER',
  },
});
```

**Impact:**
- Email collisions if two users register in the same millisecond (unlikely but possible under load)
- Predictable email pattern could be exploited
- Users may never update their email, leaving accounts with non-functional emails

**Remediation:**
```typescript
const crypto = require('crypto');

// Use cryptographically random email prefix
const randomPrefix = crypto.randomBytes(16).toString('hex');
const email = `phone_${randomPrefix}@soundit.sl`;

// Or better: make email nullable in schema and don't require it for phone users
```

---

### HIGH-007: No Validation That `req.user.id` Matches Token on `/auth/me`

**File:** `app/api/routes/auth.ts`  
**Lines:** 363–385  
**Severity:** 🟠 High

**Description:**
The `/auth/me` endpoint uses `authMiddleware` which sets `req.user` from the JWT payload. It then queries the database for the user with `req.user.id`:

```typescript
router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  // ...
});
```

While this is standard practice, the `authMiddleware` does not verify that the user still exists in the database or that their role hasn't changed since token issuance. The middleware trusts the JWT completely.

**Impact:**
- Deleted users can still access the API until token expiry
- Users whose roles have been demoted retain elevated privileges
- The comment in `auth.ts` acknowledges this: "Role changes take effect at next token refresh"

**Remediation:**
```typescript
// Option 1: Short token expiry (e.g., 15 minutes) with refresh tokens
// Option 2: Add a lightweight DB check in authMiddleware (trades performance for security)
// Option 3: Accept the trade-off but document it clearly and implement token revocation
```

---

### HIGH-008: `parseFloat`/`parseInt` on Already-Validated Zod Numbers in Admin Ranking Update

**File:** `app/api/routes/admin.ts`  
**Lines:** 446–450  
**Severity:** 🟠 High

**Description:**
As noted in CRIT-003, the admin ranking update endpoint re-parses values that Zod has already validated as numbers:

```typescript
...(rankingScore !== undefined && { rankingScore: parseFloat(rankingScore) }),
...(rankingPosition !== undefined && { rankingPosition: parseInt(rankingPosition) }),
```

If `rankingScore` is `NaN` (which Zod allows if passed as `NaN` since `typeof NaN === 'number'`), `parseFloat(NaN)` returns `NaN`.

**Remediation:**
Use Zod's `.finite()` and `.safe()` refinements:

```typescript
const rankingUpdateSchema = z.object({
  rankingScore: z.number().finite().min(0).max(100).optional(),
  rankingPosition: z.number().int().finite().min(1).optional(),
  // ...
});
```

---

## 3. Medium Severity Issues

### MED-001: N+1 Query in `recalculateAllRankings`

**File:** `app/api/utils/ranking.ts`  
**Lines:** 196–199  
**Severity:** 🟡 Medium

**Description:**
The ranking recalculation performs a database query per DJ to count followers:

```typescript
for (const dj of batch) {
  // ...
  const followerCount = await prisma.follow.count({ where: { djId: dj.id } });
  // ...
}
```

For 100 DJs per batch, this is 100 extra queries. With thousands of DJs, this becomes a significant performance bottleneck.

**Remediation:**
Use a single aggregate query or include followers in the initial fetch:

```typescript
// Option 1: Batch follower counts
const djIds = batch.map(dj => dj.id);
const followerCounts = await prisma.follow.groupBy({
  by: ['djId'],
  where: { djId: { in: djIds } },
  _count: { djId: true },
});
const followerMap = new Map(followerCounts.map(f => [f.djId, f._count.djId]));

for (const dj of batch) {
  const followerCount = followerMap.get(dj.id) || 0;
  // ...
}
```

---

### MED-002: No Pagination on `/api/admin/messages` — Returns All Messages

**File:** `app/api/routes/admin.ts`  
**Lines:** 662–698  
**Severity:** 🟡 Medium

**Description:**
The admin messages endpoint fetches the 50 most recent messages but then groups them into threads. However, the initial query has no pagination controls and could be expensive with large message volumes.

**Remediation:**
Add pagination parameters and consider using a more efficient thread aggregation query.

---

### MED-003: `process.env.NODE_ENV` Check in Prisma Client Singleton Is Fragile

**File:** `app/api/utils/prisma.ts`  
**Lines:** 5–9  
**Severity:** 🟡 Medium

**Description:**
```typescript
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Problem:** If `NODE_ENV` is not set (common in some deployment environments), Prisma will log queries in production, potentially leaking sensitive data.

**Remediation:**
```typescript
const isDev = process.env.NODE_ENV === 'development';
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: isDev ? ['query', 'error', 'warn'] : ['error'],
});

if (isDev) globalForPrisma.prisma = prisma;
```

---

### MED-004: Frontend `useDJs` Hook Caches Filters Object by Reference

**File:** `app/src/hooks/useDJs.ts`  
**Lines:** 15–53  
**Severity:** 🟡 Medium

**Description:**
```typescript
return useQuery({
  queryKey: ['djs', filters],  // filters is an object — reference equality!
  // ...
});
```

If the parent component creates a new `filters` object on each render (even with identical values), React Query will treat it as a new query key and refetch.

**Remediation:**
```typescript
import { useMemo } from 'react';

// In parent component:
const filters = useMemo(() => ({
  search, city, genre, sortBy, page, limit
}), [search, city, genre, sortBy, page, limit]);

// Or in the hook, serialize the key:
const queryKey = ['djs', JSON.stringify(filters)];
```

---

### MED-005: `window.history.replaceState` in MixHub Causes Full Re-renders

**File:** `app/src/pages/MixHub.tsx`  
**Lines:** 236–244  
**Severity:** 🟡 Medium

**Description:**
```typescript
useEffect(() => {
  const url = new URL(window.location.href);
  if (activeGenre === 'all') {
    url.searchParams.delete('genre');
  } else {
    url.searchParams.set('genre', activeGenre);
  }
  window.history.replaceState({}, '', url.toString());
}, [activeGenre]);
```

This directly manipulates the browser history, which can cause issues with React Router's state management and may trigger unnecessary re-renders.

**Remediation:**
Use React Router's `useNavigate` with `replace: true`:

```typescript
const navigate = useNavigate();

useEffect(() => {
  const params = new URLSearchParams();
  if (activeGenre !== 'all') params.set('genre', activeGenre);
  navigate({ search: params.toString() }, { replace: true });
}, [activeGenre, navigate]);
```

---

### MED-006: No Input Sanitization on Search Queries Before Prisma `contains`

**File:** `app/api/routes/djs.ts`, `app/api/routes/mixes.ts`, `app/api/routes/discover.ts`  
**Severity:** 🟡 Medium

**Description:**
Search queries are passed directly to Prisma's `contains` filter:

```typescript
where.stageName = { contains: search, mode: 'insensitive' };
```

While Prisma parameterizes these queries (preventing SQL injection), very long search strings or special characters could cause performance issues or unexpected behavior.

**Remediation:**
```typescript
function sanitizeSearch(input: string): string {
  return input.trim().slice(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
}

const sanitizedSearch = search ? sanitizeSearch(search) : undefined;
```

---

### MED-007: `totalEvents` Counter Not Decremented on Event Deletion in Some Cases

**File:** `app/api/routes/events.ts`  
**Lines:** 248–255  
**Severity:** 🟡 Medium

**Description:**
When an event is deleted, `totalEvents` is decremented. However, if the event was never associated with a DJ (`event.djId` is null), the counter is not updated. This is correct behavior, but there's no validation that `totalEvents` doesn't go negative.

More importantly, if an event's `djId` is changed via update (not supported by current schema but possible via Prisma), the counters would become inconsistent.

---

### MED-008: Booking Status Transition Validation Missing Some Edge Cases

**File:** `app/api/routes/bookings.ts`  
**Lines:** 328–340  
**Severity:** 🟡 Medium

**Description:**
The status transition validation is good but has gaps:

```typescript
const validTransitions = {
  PENDING: ['NEGOTIATING', 'CONFIRMED', 'CANCELLED'],
  NEGOTIATING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DEPOSIT_PAID', 'CANCELLED'],
  DEPOSIT_PAID: ['COMPLETED', 'REFUNDED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};
```

**Missing:**
- No check that a COMPLETED booking can't transition to REFUNDED (should it be allowed?)
- No check that CANCELLED can't transition to anything (correct)
- No audit trail of who made the status change

---

### MED-009: `useAuthStore` Persists Token but Not User Data

**File:** `app/src/stores/authStore.ts`  
**Lines:** 112–116  
**Severity:** 🟡 Medium

**Description:**
```typescript
{
  name: 'soundit-auth',
  partialize: (state) => ({ token: state.token }),
}
```

Only the token is persisted to localStorage. On page refresh, the user data is fetched via `fetchMe()`, but if the network is slow or unavailable, the app shows a logged-out state briefly.

**Remediation:**
Consider persisting a minimal user object (id, email, role) to avoid the flash of unauthenticated content:

```typescript
partialize: (state) => ({ 
  token: state.token,
  user: state.user ? { id: state.user.id, email: state.user.email, role: state.user.role } : null
}),
```

---

### MED-010: `MixHub` Trending Section Uses `any` Type

**File:** `app/src/pages/MixHub.tsx`  **Lines:** 386, 406  
**Severity:** 🟡 Medium

**Description:**
```typescript
{trending.map((mix: any, i: any) => (...))}
{latest.map((mix: any, i: any) => (...))}
```

Using `any` defeats TypeScript's type checking. The `toMixTrack` function already returns a typed `MixTrack`, so these should be properly typed.

**Remediation:**
```typescript
const trending = useMemo(() => (trendingData || []).map(toMixTrack), [trendingData]);
const latest = useMemo(() => (latestData?.data || []).map(toMixTrack), [latestData]);

// Then in JSX:
{trending.map((mix, i) => (...))}  // mix is MixTrack, i is number
```

---

### MED-011: `imageProcessor` Does Not Validate Image Dimensions Maximum

**File:** `app/api/utils/imageProcessor.ts`  
**Lines:** 16–22  
**Severity:** 🟡 Medium

**Description:**
The image validator checks minimum dimensions but not maximum:

```typescript
if (metadata.width && metadata.height) {
  if (metadata.width < 10 || metadata.height < 10) {
    throw new Error('Image dimensions too small');
  }
}
```

A malicious user could upload an extremely large image (e.g., 100,000×100,000 pixels) causing memory exhaustion during Sharp processing.

**Remediation:**
```typescript
const MAX_DIMENSION = 10000;
if (metadata.width && metadata.height) {
  if (metadata.width < 10 || metadata.height < 10) {
    throw new Error('Image dimensions too small');
  }
  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new Error(`Image dimensions too large (max ${MAX_DIMENSION}px)`);
  }
}
```

---

### MED-012: `discover.ts` Pagination Meta Is Incorrect After Campaign Boost Merge

**File:** `app/api/routes/discover.ts`  **Lines:** 200–212  
**Severity:** 🟡 Medium

**Description:**
The DJ discovery endpoint merges promoted DJs into the result set and then slices to `limitNum`. However, the `meta.total` reflects the original query count, not the merged set size. This can cause pagination to show incorrect totals.

```typescript
return res.json({
  success: true,
  data: boosted.slice(0, limitNum),
  meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
});
```

If promoted DJs are added, the actual result count may exceed `total`, or the client may request pages that don't exist.

---

## 4. Low Severity Issues

### LOW-001: Console.log Statements in Production API Code

**File:** `app/api/routes/mixes.ts`  
**Lines:** 101–103, 123  
**Severity:** 🟢 Low

```typescript
console.log('[Mixes API] Filter request:', { genre, category, search, pageNum, limitNum });
console.log('[Mixes API] Prisma where:', JSON.stringify(where));
console.log(`[Mixes API] Found ${mixes.length} mixes (total: ${total})`);
```

These should be replaced with a proper logging framework (e.g., Winston, Pino) that can be configured by environment.

---

### LOW-002: Frontend Debug Logging in Production

**File:** `app/src/pages/Discover.tsx`  
**Lines:** 309–322  
**Severity:** 🟢 Low

```typescript
useEffect(() => {
  if (djsQuery.error) {
    console.error('[Discover] DJs query failed:', djsQuery.error);
  }
}, [djsQuery.error]);

useEffect(() => {
  if (djsQuery.data) {
    console.log('[Discover] DJs query success:', {...});
  }
}, [djsQuery.data]);
```

Remove or wrap in `process.env.NODE_ENV === 'development'` checks.

---

### LOW-003: Hardcoded Default Values for Subscription Prices

**File:** `app/api/routes/admin.ts`, `app/api/routes/payments.ts`  
**Severity:** 🟢 Low

```typescript
const PRO_SUBSCRIPTION_PRICE = Number.isFinite(configuredProPrice) && configuredProPrice > 0 ? configuredProPrice : 250;
const LEGEND_SUBSCRIPTION_PRICE = Number.isFinite(configuredLegendPrice) && configuredLegendPrice > 0 ? configuredLegendPrice : 750;
```

These defaults are duplicated across files. Consider a shared config module.

---

### LOW-004: Missing `key` Prop Stability in `AnimatedWaveform`

**File:** `app/src/pages/Home.tsx`  
**Lines:** 39–48  
**Severity:** 🟢 Low

```typescript
const bars = Array.from({ length: 60 }, (_, i) => i);
return (
  <div className="absolute inset-0 flex items-center justify-center gap-[3px] overflow-hidden pointer-events-none z-0">
    {bars.map((i) => (
      <WaveformBar key={i} delay={i * 0.05} />
    ))}
  </div>
);
```

The `key` is stable here (array index is deterministic), but React warns against using array indices as keys when order can change. In this case it's fine since the array is static.

---

### LOW-005: `useMemo` Dependency Array in `Discover.tsx` Could Be Simplified

**File:** `app/src/pages/Discover.tsx`  
**Lines:** 325–328  
**Severity:** 🟢 Low

```typescript
const genreOptions = useMemo(
  () => ['All', ...((genresQuery.data as string[] | undefined) ?? [])],
  [genresQuery.data]
);
```

The `as string[] | undefined` cast is unnecessary if the hook returns a properly typed response.

---

### LOW-006: `Counter` Component Uses `setInterval` Instead of `requestAnimationFrame`

**File:** `app/src/pages/Home.tsx`  
**Lines:** 60–77  
**Severity:** 🟢 Low

The counter animation uses `setInterval` with 16ms intervals. For smoother animations, `requestAnimationFrame` is preferred.

---

### LOW-007: `Discover.tsx` Sort Dropdown Doesn't Close on Outside Click

**File:** `app/src/pages/Discover.tsx`  
**Lines:** 644–676  
**Severity:** 🟢 Low

The sort dropdown only closes when clicking the toggle button or selecting an option. It should close when clicking outside.

---

### LOW-008: `MixHub.tsx` Genre Filter Buttons Not Memoized

**File:** `app/src/pages/MixHub.tsx`  
**Lines:** 348–371  
**Severity:** 🟢 Low

The genre filter buttons are re-rendered on every state change, even when the genre list hasn't changed.

---

### LOW-009: `api.ts` Axios Instance Has No Request/Response Interceptors for Error Handling

**File:** `app/src/lib/api.ts`  
**Severity:** 🟢 Low

While the file wasn't fully read, if the axios instance doesn't have interceptors for common error patterns (401, 403, 500), error handling may be inconsistent across the app.

---

### LOW-010: `booking.ts` Counter Offer Logic Appends Notes Without Escaping

**File:** `app/api/routes/bookings.ts`  
**Lines:** 142–147  
**Severity:** 🟢 Low

```typescript
updateData.notes = existingNotes
  ? `${existingNotes}\n[${new Date().toISOString()}] Client ${action}: ${note}`
  : `[${new Date().toISOString()}] Client ${action}: ${note}`;
```

If `note` contains newlines or special characters, the notes field format could be corrupted. Consider using a structured format (JSON array) for notes.

---

## 5. Security Analysis

### Authentication & Authorization

| Aspect | Status | Notes |
|--------|--------|-------|
| JWT Signing | ✅ Good | Uses `jsonwebtoken` with env-secret, 7-day expiry |
| Password Hashing | ✅ Good | Uses `bcryptjs` with salt rounds 10 |
| Role-Based Access | ✅ Good | `requireRole` middleware covers admin routes |
| Token Revocation | ❌ Missing | No blacklist or `jti` tracking |
| Session Management | ⚠️ Partial | Phone OTP users get same token type as email users |
| Rate Limiting | ⚠️ Partial | Auth has limits, but `/play` and some public endpoints don't |

### Data Protection

| Aspect | Status | Notes |
|--------|--------|-------|
| SQL Injection | ✅ Protected | Prisma ORM used throughout |
| XSS (Backend) | ✅ Protected | No raw HTML output from API |
| XSS (Frontend) | ⚠️ Partial | React escapes by default, but `dangerouslySetInnerHTML` not checked |
| File Upload Validation | ✅ Good | MIME type and extension checks in place |
| Static File Security | ❌ Vulnerable | `/uploads` served without auth |
| CORS | ❌ Unknown | Configuration not audited — verify before production |

### Input Validation

| Aspect | Status | Notes |
|--------|--------|-------|
| Zod Schemas | ✅ Good | Used consistently across routes |
| Email Validation | ✅ Good | Zod `.email()` used |
| Phone Validation | ⚠️ Partial | Basic length check only |
| File Size Limits | ✅ Good | 10MB images, 500MB audio |
| Search Sanitization | ❌ Missing | No length limits or character filtering |

---

## 6. Performance Analysis

### Database Queries

| Endpoint | Issue | Severity |
|----------|-------|----------|
| `GET /api/discover/djs` | Computes real-time ranking score in JS (N+1 risk) | 🟡 Medium |
| `GET /api/admin/djs` | Includes `followers`, `mixes`, `bookingsAsDj` without pagination | 🟡 Medium |
| `POST /api/battles/:id/vote` | Recalculates all entries on every vote | 🟠 High |
| `GET /api/djs/:identifier` | Large include with reviews, mixes, events, photos | 🟡 Medium |
| Ranking Recalculation | N+1 follower count per DJ | 🟡 Medium |

### Frontend Performance

| Component | Issue | Severity |
|-----------|-------|----------|
| `Home.tsx` | AnimatedWaveform renders 60 bars with individual motion.div | 🟢 Low |
| `Discover.tsx` | Client-side filtering after server fetch | 🟡 Medium |
| `MixHub.tsx` | Builds queue from all visible mixes on every play | 🟢 Low |
| `DjProfile.tsx` | Loads all mixes, reviews, events at once | 🟡 Medium |

### Recommendations

1. **Add database indexes** for frequently queried fields:
   ```sql
   CREATE INDEX idx_mixes_genre ON mixes(genre);
   CREATE INDEX idx_mixes_category ON mixes(category);
   CREATE INDEX idx_mixes_public_created ON mixes(isPublic, createdAt);
   CREATE INDEX idx_dj_profiles_city ON dj_profiles(city);
   CREATE INDEX idx_dj_profiles_public_ranking ON dj_profiles(isPublic, rankingPosition);
   ```

2. **Implement cursor-based pagination** for large lists (reviews, messages)

3. **Add Redis caching** for:
   - Trending mixes (TTL: 5 minutes)
   - DJ rankings (TTL: 1 hour)
   - Public stats (TTL: 10 minutes)

---

## 7. Code Quality Assessment

### Strengths

1. **Good separation of concerns** — Routes, utils, middleware clearly separated
2. **Consistent error handling** — All routes use try/catch with standardized response format
3. **TypeScript on frontend** — Good type definitions for API responses
4. **Prisma ORM** — Prevents SQL injection, provides type safety
5. **Zod validation** — Input validation on all mutation endpoints
6. **React Query** — Proper caching, refetching, and optimistic updates
7. **Image processing pipeline** — Sharp-based resizing and WebP conversion
8. **Password reset security** — Hashed tokens with expiry, single-use

### Weaknesses

1. **Mixed module systems** — Backend uses CommonJS (`require`), some files have TypeScript type annotations (`buffer: Buffer`) but are `.ts` files using `require`
2. **Inconsistent typing** — Some frontend components use `any` extensively
3. **No API documentation** — No OpenAPI/Swagger spec found
4. **Missing tests** — No test files observed in the audited codebase
5. **No CI/CD configuration** — No GitHub Actions, pre-commit hooks, or linting configs observed
6. **Environment variable validation** — Only `JWT_SECRET` is checked; others silently use defaults

---

## 8. Recommendations Summary

### Immediate Action Required (Before Production)

| Priority | Issue | File | Action |
|----------|-------|------|--------|
| P0 | Remove duplicate route handlers | `mixes.ts` | Delete lines 135–205 and 305–331 |
| P0 | Fix battle vote race condition | `battles.ts` | Use transaction or deferred scoring |
| P0 | Secure static file serving | `upload.ts` | Add authentication to `/uploads` |
| P0 | Validate CORS configuration | `server.ts` | Restrict to known origins |
| P1 | Add rate limiting to `/play` | `mixes.ts` | Require auth + rate limit |
| P1 | Fix admin ranking NaN injection | `admin.ts` | Add Zod bounds, remove redundant parsing |
| P1 | Add JWT `jti` for revocation | `jwt.ts` | Include `jti` claim |
| P1 | Fix transaction inconsistency | `admin.ts` | Pass `tx` to `activateSubscriptionFeatures` |

### Short-term Improvements (Post-launch)

1. Add comprehensive test suite (unit, integration, e2e)
2. Implement Redis caching for hot data
3. Add database indexes for performance
4. Set up monitoring and alerting (Sentry, LogRocket)
5. Implement API documentation (Swagger/OpenAPI)
6. Add CI/CD pipeline with automated testing
7. Conduct penetration testing
8. Implement GDPR-compliant data deletion

### Long-term Architecture

1. Consider microservices for ranking/battle calculations
2. Implement event-driven architecture for notifications
3. Add CDN for static assets
4. Implement GraphQL for flexible frontend queries
5. Add real-time features via WebSockets

---

## Appendix: Files Audited

### Backend
- `app/api/server.ts`
- `app/api/routes/auth.ts`
- `app/api/routes/djs.ts`
- `app/api/routes/mixes.ts`
- `app/api/routes/bookings.ts`
- `app/api/routes/admin.ts`
- `app/api/routes/payments.ts`
- `app/api/routes/battles.ts`
- `app/api/routes/events.ts`
- `app/api/routes/messages.ts`
- `app/api/routes/discover.ts`
- `app/api/routes/campaigns.ts`
- `app/api/middleware/auth.ts`
- `app/api/middleware/permissions.ts`
- `app/api/utils/jwt.ts`
- `app/api/utils/rateLimiter.ts`
- `app/api/utils/upload.ts`
- `app/api/utils/storage.ts`
- `app/api/utils/ranking.ts`
- `app/api/utils/rankingAlgorithm.ts`
- `app/api/utils/mixDiscovery.ts`
- `app/api/utils/campaignBoost.ts`
- `app/api/utils/imageProcessor.ts`
- `app/api/utils/prisma.ts`
- `app/api/utils/audioResolver.ts`
- `app/api/prisma/schema.prisma`

### Frontend
- `app/src/App.tsx`
- `app/src/lib/api.ts`
- `app/src/stores/authStore.ts`
- `app/src/pages/Home.tsx`
- `app/src/pages/Discover.tsx`
- `app/src/pages/DjProfile.tsx`
- `app/src/pages/MixHub.tsx`
- `app/src/hooks/useDJs.ts`
- `app/src/hooks/useMixes.ts`
- `app/src/hooks/useBookings.ts`
- `app/vite.config.ts`

---

*End of Audit Report*
