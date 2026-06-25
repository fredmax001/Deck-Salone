# PERFORMANCE OPTIMIZATION REPORT

**Codebase:** Deck Salone (DJ booking platform)  
**Analysis Date:** 2025-06-26  
**Analyzer:** Performance Engineer  
**Scope:** API + Frontend (React/Vite/Express/Prisma/PostgreSQL)

---

## 1. CURRENT STATE

### Time Complexity

Per operation (Big-O), measured by actual DB queries and algorithmic steps in the code:

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Auth login | O(1) | Single `findUnique` + bcrypt compare (10 rounds) |
| Auth register | O(1) avg, O(100) worst | `generateUsername` loops up to 100x with DB check each iteration |
| DJ list (Discover) | O(1) | `findMany` + `count` with skip/take (indexed) |
| DJ profile fetch | O(1) DB, O(R) render | 1 query with heavy `include` (mixes, reviews×20, events, streamingPlatforms, _count) |
| Mix upload | O(1) | Image sharp processing + S3/local write in request thread |
| Booking creation | O(1) | 2 serial writes (`booking.create` + `djProfile.update` increment) |
| Message send | O(1) | 1 `create` after validation lookups |
| Ranking calculation (single DJ) | O(1) | `computeDjScore` loads related data then pure math |
| Ranking recalculation (all DJs) | O(N) | N `djProfile.update` + N `rankingHistory.create` in serial loop — no batching |
| Search/filter | O(1) | Prisma handles with indexed `contains` / `has` |
| Messages conversations | O(N) | 2 distinct queries + 3 queries per conversation partner (N = partner count) |
| Battle vote | O(N) | Loads all entries, then N sequential updates to recalculate scores |
| Dashboard overview | O(1) | 11 parallel counts/findMany + `computeDjScore` |

### Space Complexity

| Layer | Estimate | Source |
|-------|----------|--------|
| Per request (API) | ~10–150 MB | Express JSON limit = 50 MB; multer memory buffer = up to 500 MB for audio |
| Per user session | ~2–5 KB | JWT token (~300 B) + minimal auth state |
| Database row (DjProfile) | ~1–3 KB | JSON fields, arrays, string fields |
| File upload buffer | up to 500 MB | `multer` memoryStorage limit for mix audio |
| Frontend bundle | ~1.5–3 MB (estimated) | React 19 + Framer Motion + GSAP + Recharts + Radix UI suite + Embla + Wavesurfer |

### Render/Execution Hot Path

**Most expensive React component:** `DjProfile.tsx` (1,849 lines)
- Contains 5 tab sub-components (`OverviewTab`, `MixesTab`, `StatsTab`, `ReviewsTab`, `EventsTab`) defined inline
- Loads `recharts` unconditionally even if the Stats tab is never opened
- `SimilarDJsSection` triggers a secondary `useDJs` fetch on every profile load
- `MixesTab` generates a 30-bar pseudo-waveform using `Math.random` on every render, causing DOM thrash
- `ReviewsTab` renders all reviews with motion animations simultaneously

**Most re-rendered component:** `DJCard` in `Discover.tsx`
- Each card has `useState` for hover + `AnimatePresence` for the "Book" button overlay
- Hover on any card triggers a re-render of that card + potential parent grid layout shifts
- `onMouseEnter`/`onMouseLeave` with `setHovered` causes local state churn

**Largest bundle contributors:** (from `package.json` dependency analysis)
1. `@aws-sdk/client-s3` — full AWS SDK v3 (tree-shaking helps but still large)
2. `recharts` — charting library pulled into main chunk via DjProfile
3. `framer-motion` — animation library used on almost every page
4. `gsap` — included but usage not visible in read files (dead weight if unused)
5. `wavesurfer.js` — audio waveform engine
6. `sharp` — image processing library (should be backend-only, but in root deps)
7. Radix UI primitives — 30+ individual packages, each small but additive

### External Dependencies

**DB queries per typical page load:**
| Page | API Calls | DB Queries (backend) | Notes |
|------|-----------|----------------------|-------|
| Home | 5 (featured DJs, rankings, mix categories, events, current battle) | 5–8 | Parallel on frontend |
| Discover | 3 (DJ list, cities, genres) | 3 | DJ list = findMany + count |
| DJ Profile | 2–3 (DJ detail, ranking history, reviews) + SimilarDJs fetch | 1 heavy + 2–3 light | Heavy include on DJ profile |
| Dashboard | 1 (dashboard overview) | 11+ | 11 parallel Prisma calls |
| Messages | 1 (conversations) | 2 + 3N | N = number of conversation partners |
| Battles | 1 (current battle) | 1 + entries include | Entries include votesCast |

**Network calls per typical page load:**
- Home: 5 concurrent API requests
- Discover: 3 concurrent API requests
- DJ Profile: 3–4 sequential/concurrent API requests (profile + ranking history + reviews + similar DJs)

**File I/O per typical operation:**
- Image upload: read memory buffer → Sharp process → write to disk or S3
- Audio upload: read 500 MB memory buffer → write to disk or S3 (no streaming)
- Local static file serving: `express.static` for `/uploads` directory

---

## 2. BOTTLENECK ANALYSIS

### Inefficient Logic

- [ ] **Inefficient logic:** `authMiddleware` (`api/middleware/auth.ts:17`) → Current cost: O(1) DB query per request, but adds ~10–50 ms latency per call. On a dashboard page with 11 parallel calls, this is negligible per call but cumulative. **Optimized cost:** O(0) with JWT-only validation (remove DB lookup) or O(1) with Redis session cache (~1–2 ms).
  - *Root cause:* `prisma.user.findUnique` is called on every authenticated request to verify the user still exists.
  - *Fix:* Cache user profile in Redis for 5–15 min, or use JWT payload directly with a `jti` claim + revocation list.

- [ ] **Inefficient logic:** `generateUsername` (`api/routes/auth.ts:29-47`) → Current cost: O(1) avg, O(100) worst-case with 100 DB round-trips. **Optimized cost:** O(1) with a single CTE or `ILIKE` prefix query + deterministic suffix.
  - *Fix:* Query once: `SELECT username FROM users WHERE username LIKE '${base}%'` and pick first gap.

- [ ] **Inefficient logic:** `GET /api/messages/conversations` (`api/routes/messages.ts:15-88`) → Current cost: O(N) where N = number of conversation partners. For a user with 50 partners = 152 queries. **Optimized cost:** O(1) with a single raw SQL query or two optimized queries.
  - *Root cause:* `Promise.all` over `Array.from(partnerIds).map(...)` fires 3 queries per partner.
  - *Fix:* Single query with `GROUP BY` and window functions, or denormalize `lastMessage` and `unreadCount` into a `Conversation` table.

- [ ] **Inefficient logic:** `POST /api/battles/:id/vote` (`api/routes/battles.ts:242-323`) → Current cost: O(N) per vote, N = number of entries. **Optimized cost:** O(1) with delta update or O(log N) with recalc queue.
  - *Root cause:* After every vote, it loads ALL entries and updates EVERY entry's `finalScore` in a serial loop.
  - *Fix:* Use a `voteScore` formula that can be computed on read (baseScore + voteWeight), or queue score recalculation to a background job.

- [ ] **Inefficient logic:** `recalculateAllRankings` (`api/utils/ranking.ts:159-221`) → Current cost: O(N) with 2N sequential writes. **Optimized cost:** O(N) with 2 batch writes.
  - *Root cause:* `for` loop with individual `prisma.djProfile.update` and `prisma.rankingHistory.create` per DJ.
  - *Fix:* Use `prisma.$transaction` with `Promise.all` batching, or raw SQL `UPDATE` with `CASE` + `INSERT` bulk create.

- [ ] **Inefficient logic:** `GET /api/djs/:identifier` (`api/routes/djs.ts:248-285`) → Current cost: 1 heavy query with 5+ includes. **Optimized cost:** Split into 2–3 lighter queries with `select` trimming.
  - *Root cause:* `commonInclude` loads `mixes` (all public), `reviews` (20), `events`, `streamingPlatforms`, and `_count` unconditionally.
  - *Fix:* Load core profile in one query, fetch tabs (mixes, reviews, events) on demand via separate endpoints.

- [ ] **Inefficient logic:** `POST /api/bookings/:id/review` (`api/routes/bookings.ts:236-277`) and `POST /api/reviews` (`api/routes/reviews.ts:65-125`) → Current cost: O(R) where R = number of reviews for that DJ. **Optimized cost:** O(1) with running average math.
  - *Root cause:* `findMany` all reviews to compute average with `reduce`.
  - *Fix:* `newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1)`; no need to load all reviews.

### Unnecessary Work

- [ ] **Unnecessary work:** `DjProfile.tsx` `MixesTab` generates 30 random waveform bars on every render using `Math.random` (`DjProfile.tsx:918-927`). → **Elimination strategy:** Memoize with `useMemo(() => Array.from(...), [mix.id])` or precompute once per mix.

- [ ] **Unnecessary work:** `DjProfile.tsx` loads `recharts` components unconditionally even if user never clicks the Stats tab. → **Elimination strategy:** Code-split each tab with `React.lazy(() => import('./tabs/StatsTab'))` and `Suspense`.

- [ ] **Unnecessary work:** `SimilarDJsSection` inside `DjProfile.tsx` fetches similar DJs on every profile load regardless of scroll position. → **Elimination strategy:** Lazy-load with IntersectionObserver, or fetch only after primary profile data resolves.

- [ ] **Unnecessary work:** `Discover.tsx` uses `AnimatePresence` + `motion.div` for every DJ card in the grid (up to 12 items). Framer Motion mounts/unmount animations on every filter change. → **Elimination strategy:** Use CSS transitions for layout changes; reserve Framer Motion for hero/entry animations only.

- [ ] **Unnecessary work:** `GET /api/mixes/categories` returns a hardcoded array every time. → **Elimination strategy:** Move to frontend constant or cache with `Cache-Control: max-age=86400`.

- [ ] **Unnecessary work:** `GET /api/events/types` returns a hardcoded array every time. → **Elimination strategy:** Same as above — frontend constant or long HTTP cache.

- [ ] **Unnecessary work:** `dashboard/stats` (`api/routes/dashboard.ts:123-202`) uses `Promise.resolve(Math.floor(...))` mixed with real DB queries, then computes `engagementRate` with a formula that divides `totalMixes * 1000` by `totalStreams`. → **Elimination strategy:** Remove the no-op `Promise.resolve` wrappers; compute lightweight derived stats on the frontend.

- [ ] **Unnecessary work:** `AuthInitializer` + `useAuthStore.getState().init()` called in both `main.tsx` and `App.tsx`. → **Elimination strategy:** Remove one; `main.tsx` is sufficient.

- [ ] **Unnecessary work:** Every `useDJs` hook call uses the entire `filters` object as the `queryKey` (`src/hooks/useDJs.ts:19`). If the object reference changes on every render, TanStack Query cache is busted. → **Elimination strategy:** Use a stable key or serialize deterministically: `queryKey: ['djs', JSON.stringify(filters)]`.

### Memory Pressure

- [ ] **Memory pressure:** Multer `memoryStorage` buffers entire audio files up to 500 MB in RAM (`api/utils/upload.ts:46-50`). With concurrent uploads, this can exhaust heap. → **Fix:** Use `diskStorage` for audio files, or stream directly to S3 with multipart upload. Process images from disk, not memory.

- [ ] **Memory pressure:** Sharp image processing happens in the request thread (`api/routes/djs.ts:311-319`, `api/routes/mixes.ts:186-195`). Large images (10 MB × 3 concurrent = 30 MB+) block the event loop. → **Fix:** Offload to a worker queue (Bull/BullMQ + Redis), or use `sharp` streams with backpressure.

- [ ] **Memory pressure:** In-memory OTP store (`api/utils/otp.ts:11`) uses a `Map` that grows until the 30-min cleanup interval fires. Under a spam attack, this is unbounded. → **Fix:** Replace with Redis + TTL, or add a max-size LRU eviction.

- [ ] **Memory pressure:** `DjProfile.tsx` is a monolithic 1,849-line component. All tab sub-components are defined in the same closure, keeping references alive. → **Fix:** Split into separate files; each tab becomes its own chunk.

- [ ] **Memory pressure:** Zustand auth store persists `token` to `localStorage` on every state change via `persist` middleware. → **Fix:** Already partialized to `token` only, but consider `sessionStorage` or memory-only for token to reduce disk I/O.

- [ ] **Memory pressure:** `react-query` cache has no `gcTime` set, so stale data is held indefinitely. → **Fix:** Set `gcTime: 1000 * 60 * 10` (10 min) in `QueryClient` defaults.

### Concurrency Limit

- [ ] **Concurrency limit:** `recalculateAllRankings` runs in the request thread and holds the Prisma connection for N sequential writes. With 1,000 DJs, this blocks other requests. → **Async/alternative:** Move to a background cron job or worker queue. Expose a "pending" status endpoint and process asynchronously.

- [ ] **Concurrency limit:** Battle vote recalculation updates every entry in the same request. High vote traffic creates write contention on the `battleEntry` table. → **Async/alternative:** Queue score recalculation; use Redis sorted set for live leaderboard reads.

- [ ] **Concurrency limit:** `express.json({ limit: '50mb' })` and `express.urlencoded({ limit: '50mb' })` allocate large buffers before route handlers. → **Async/alternative:** Reduce to 1 MB for JSON; use multipart for uploads (already using multer).

- [ ] **Concurrency limit:** PrismaClient is created once and reused (`api/utils/prisma.ts`), but no explicit connection pool size is configured. Under load, default pool size (usually `num_cpus * 2 + 1`) may be insufficient. → **Fix:** Set `connection_limit` in DATABASE_URL or use `PrismaClient` with explicit pool config.

- [ ] **Concurrency limit:** No clustering or PM2 config visible; single Node.js process handles all traffic. → **Fix:** Use `cluster` module, or deploy with PM2 cluster mode, or containerize with multiple replicas.

---

## 3. OPTIMIZATION PLAN

### Quick Wins (< 1 hour)

| Change | Expected Improvement | File(s) |
|--------|---------------------|---------|
| Add `Cache-Control: public, max-age=86400` to `/mixes/categories` and `/events/types` | Eliminates 2 trivial API calls per session | `api/routes/mixes.ts:99`, `api/routes/events.ts:112` |
| Replace `Math.random` waveform in `MixesTab` with `useMemo` | Eliminates 30 DOM nodes re-creation on every render | `src/pages/DjProfile.tsx:918` |
| Remove duplicate `useAuthStore.getState().init()` from `main.tsx` | Prevents double auth validation on app start | `src/main.tsx:8` |
| Memoize `genreOptions` and `activeFilters` in `Discover.tsx` | Reduces re-computation on every render | `src/pages/Discover.tsx:291, 315` |
| Add `gcTime` to QueryClient defaults | Prevents indefinite memory growth in React Query cache | `src/lib/queryClient.ts:3` |
| Use `Promise.all` batching in `recalculateAllRankings` | Reduces ranking recalc from 2N serial to 2N parallel writes | `api/utils/ranking.ts:193-218` |
| Fix `booking` review average to use incremental math | Reduces review creation from O(R) to O(1) | `api/routes/bookings.ts:262-267`, `api/routes/reviews.ts:107-118` |
| Remove `plugin-inspect-react-code` from production Vite build | Shrinks build time and bundle slightly | `vite.config.ts:9` |
| Add `skip` to `voteLimiter` for successful votes to avoid double-counting | Already present on authLimiter, mirror for votes | `api/utils/rateLimiter.ts:42` |

**Expected aggregate improvement:** 15–25% reduction in API latency for write operations; 20–30% reduction in frontend render time for DJ Profile tab switching.

### Structural Changes (1–2 days)

| Change | Tradeoffs | File(s) |
|--------|-----------|---------|
| **Add Redis caching layer** for auth sessions, OTP store, and hot reads (DJ profiles, rankings) | Adds infrastructure dependency (Redis); requires cache invalidation strategy | `api/utils/prisma.ts` (add cache wrapper), `api/utils/otp.ts` |
| **Implement streaming/multipart S3 upload** for audio files instead of buffering 500 MB in RAM | Requires S3 multipart upload logic; slightly more complex retry handling | `api/utils/upload.ts`, `api/utils/storage.ts` |
| **Code-split DJ Profile tabs** with `React.lazy` and route-based chunking | Increases initial HTTP request count; but dramatically reduces main chunk size | `src/pages/DjProfile.tsx` |
| **Add database views / materialized view** for ranking leaderboard | Adds migration complexity; requires refresh strategy (cron or trigger) | New: `api/prisma/migrations/` or raw SQL view |
| **Denormalize conversation metadata** into a `Conversation` table (lastMessage, unreadCount) | Adds write amplification (update on every message); simplifies read from O(N) to O(1) | `api/prisma/schema.prisma`, `api/routes/messages.ts` |
| **Add DB indexes on high-cardinality query columns** | Already has some indexes; verify `booking.status + djId` composite index for dashboard | `api/prisma/schema.prisma` |
| **Move image processing to background worker** (BullMQ + Redis) | Adds queue infra; eliminates request-blocking image transforms | New: `api/workers/imageProcessor.ts` |
| **Add HTTP response compression** (`compression` middleware) | Small CPU cost; large bandwidth savings on JSON responses | `api/server.ts` |
| **Implement request-level DB query logging** to identify N+1 in production | Negligible overhead; invaluable for ongoing optimization | `api/server.ts` middleware |

**Expected aggregate improvement:** 40–60% reduction in P99 latency for profile and messaging endpoints; elimination of 500 MB memory spikes during uploads; 30–50% reduction in main bundle size after code splitting.

### Architectural Shifts (1–2 weeks)

| Change | When Justified | Implementation |
|--------|---------------|----------------|
| **Read replicas / connection pooling** for PostgreSQL | Justified when traffic exceeds ~100 concurrent connections or DB CPU > 60% | Prisma Accelerate, or PgBouncer, or RDS read replica |
| **Server-side rendering (SSR) or SSG** for public pages (Home, Discover, Rankings) | Justified when SEO/traffic requires sub-200 ms TTFB and social sharing demands pre-rendered meta | Migrate to Next.js or add Vite SSR plugin; pre-render OG routes |
| **Edge caching / CDN** for DJ profile pages and static assets | Justified at 1,000+ concurrent users or global audience | Cloudflare or Fastly in front of API; cache GET `/api/djs/*`, `/api/rankings/*` |
| **Event-driven architecture** for ranking recalculation and battle score updates | Justified when real-time leaderboard + weekly ranking batch creates DB write pressure | Redis Streams / RabbitMQ; workers process score events asynchronously |
| **Database partitioning** for `Message`, `Booking`, `Payment` tables by `createdAt` | Justified when message volume exceeds 1M rows and query times degrade | Prisma doesn't natively support partitioning; use PostgreSQL declarative partitioning |
| **WebSocket server** for real-time messaging and battle vote updates | Justified when polling `/messages/:userId` creates excessive load | Socket.io or WS server; replace REST polling with push |
| **Migrate from monolithic Express to modular microservices** (Auth, Content, Booking, Analytics) | Justified when team size > 5 or when different services need independent scaling | Split into services behind API gateway; keep shared Prisma schema or event contracts |
| **Replace Framer Motion with CSS animations** for list/grid layouts | Justified when Framer Motion bundle + runtime cost exceeds 200 KB and 10 ms per frame on low-end mobile | Use CSS `transform` + `transition` + `view-transition` API where supported |
| **Implement virtualized lists** for Discover, Rankings, and Messages | Justified when list sizes exceed 50 items and DOM node count causes jank | `react-window` or `react-virtuoso` |
| **Add APM and profiling** (Sentry, Datadog, or New Relic) | Justified before any production launch to validate optimizations | Instrument API and frontend; set up error tracking and performance dashboards |

**Expected aggregate improvement:** Sub-100 ms TTFB for public pages; horizontal scalability to 10,000+ concurrent users; real-time messaging without polling overhead; 50%+ reduction in database write load through event-driven workers.

---

## 4. MEASUREMENT PLAN

Before and after each optimization phase, track:

1. **Backend:**
   - `prisma.$queryRaw` logging for query counts per endpoint
   - `express-rate-limit` hit rates (are limits being triggered legitimately?)
   - Memory heap snapshots during mix upload (target: < 100 MB per request)
   - API response time percentiles (p50, p95, p99) via middleware

2. **Frontend:**
   - Lighthouse Performance score (target: > 90)
   - First Contentful Paint (FCP) and Largest Contentful Paint (LCP)
   - Total Blocking Time (TBT) — especially on Discover and DjProfile
   - Bundle size analysis via `vite-bundle-visualizer`
   - React DevTools Profiler render counts for `DJCard`, `Discover`, `DjProfile`

3. **Database:**
   - Slow query log (queries > 100 ms)
   - Index usage stats (`pg_stat_user_indexes`)
   - Connection pool saturation (`pg_stat_activity`)

---

## 5. CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION

1. **500 MB audio upload buffer in memory** — risk of server crash under concurrent uploads. **Priority: P0**
2. **O(N) conversation query** — will degrade linearly as user messaging grows. **Priority: P0**
3. **No connection pooling or clustering** — single process bottleneck. **Priority: P1**
4. **Monolithic 1,849-line DjProfile component** — blocks code splitting and team velocity. **Priority: P1**
5. **In-memory OTP store** — unbounded growth under attack. **Priority: P1**
6. **Battle vote recalc in request loop** — write contention under voting spikes. **Priority: P2**
7. **Missing `gcTime` on React Query** — gradual client memory leaks. **Priority: P2**

---

*End of Report*
