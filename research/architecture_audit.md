# ARCHITECTURE AUDIT

**Date:** 2026-06-26  
**Codebase:** /Users/djfredmax/Desktop/Deck Salone/app  
**Auditor:** Architecture Auditor  
**Scope:** src/pages/*.tsx, src/components/*.tsx, src/hooks/*.ts, src/stores/*.ts, api/routes/*.ts, api/utils/*.ts, api/prisma/schema.prisma  

---

## 1. Architecture Smells

### 1.1 God Files (Mixed Concerns)

- [ ] **Type: God File** → DjProfile.tsx is 1,849 lines containing the page + 5 tab components (OverviewTab, MixesTab, StatsTab, ReviewsTab, EventsTab) + BookingModal + SimilarDJsSection + 12 helper functions → Remediation cost: 2–3 days
  - *Concrete example:* `src/pages/DjProfile.tsx:1` — lines 1–1849
  - *Impact:* Impossible to unit test tabs in isolation; any tab change triggers full-page re-render; merge conflicts are guaranteed

- [ ] **Type: God File** → Booking.tsx is 1,243 lines containing the page + BookingRequestModal + static pricingGuide / trustPoints / faqData + 8 helper functions → Remediation cost: 1–2 days
  - *Concrete example:* `src/pages/Booking.tsx:1` — lines 1–1243

- [ ] **Type: God File** → Battles.tsx is 1,118 lines containing the page + 7 sections + VoteButton memo component + computeLeaderboard logic + 5 helper functions → Remediation cost: 1–2 days
  - *Concrete example:* `src/pages/Battles.tsx:1` — lines 1–1118

- [ ] **Type: God File** → Home.tsx is 1,080 lines containing 8 section components (HeroSection, StatsBar, FeaturedDJsSection, RankingsSection, MixCategoriesSection, HowItWorksSection, EventsSection, BattleArenaSection, CTABanner) → Remediation cost: 1–2 days
  - *Concrete example:* `src/pages/Home.tsx:1` — lines 1–1080

- [ ] **Type: God File** → Discover.tsx is 831 lines containing page + DJCard + FilterChip + EmptyState + helpers → Remediation cost: 1 day
  - *Concrete example:* `src/pages/Discover.tsx:1` — lines 1–831

- [ ] **Type: God File** → AdminDashboard.tsx is 647 lines containing 13 inline section components + nav config + sidebar logic → Remediation cost: 1–2 days
  - *Concrete example:* `src/pages/AdminDashboard.tsx:1` — lines 1–647

### 1.2 Business Logic Leaking into UI Components

- [ ] **Type: Business Logic in Component** → Booking form submission, data transformation (parseBudget, parseDuration, note concatenation) lives inside BookingModal in DjProfile.tsx → Remediation cost: 4–6 hours
  - *Concrete example:* `src/pages/DjProfile.tsx:272–299`

- [ ] **Type: Business Logic in Component** → Leaderboard computation (computeLeaderboard) runs client-side in Battles.tsx on every render → Remediation cost: 4–6 hours
  - *Concrete example:* `src/pages/Battles.tsx:105–151`

- [ ] **Type: Business Logic in Component** → Filter logic (equipment, rating) applied client-side after server fetch in Discover.tsx → Remediation cost: 2–4 hours
  - *Concrete example:* `src/pages/Discover.tsx:296–309`

- [ ] **Type: Business Logic in Component** → Ranking score chart data mapping done inline in StatsTab (DjProfile.tsx) → Remediation cost: 2 hours
  - *Concrete example:* `src/pages/DjProfile.tsx:947–955`

### 1.3 Type Safety Holes

- [ ] **Type: `any` Abuse** → Hook return types cast to `any` throughout Booking.tsx (eventTypesData, bookingDJs, filteredDJs, etc.) → Remediation cost: 2–3 hours
  - *Concrete example:* `src/pages/Booking.tsx:318`, `467`, `483`, `872`, `930`, `940`

- [ ] **Type: `as` Assertion** → Battles.tsx casts useCurrentBattle and useBattles hooks with `as { data: Battle | null; isLoading: boolean }` → Remediation cost: 1–2 hours
  - *Concrete example:* `src/pages/Battles.tsx:190–201`

- [ ] **Type: `as` Assertion** → Booking.tsx casts `ease` array multiple times → Remediation cost: 30 minutes
  - *Concrete example:* `src/pages/Booking.tsx:165`, `1017`, `1096`

- [ ] **Type: `any` Abuse** → useAdminStats returns `as AdminStats` but hook internally uses untyped API response → Remediation cost: 1 hour
  - *Concrete example:* `src/hooks/useAdmin.ts:25`

- [ ] **Type: `any` Abuse** → Dashboard.tsx uses `any[]` for recentBookings, topMixes, recentReviews, recentEvents, battleEntries, payments, bookingStatusCounts → Remediation cost: 2–3 hours
  - *Concrete example:* `src/pages/Dashboard.tsx:37–45`

- [ ] **Type: Implicit `any` from catch blocks** → Error handlers typed as `error: any` in 15+ locations across hooks and pages → Remediation cost: 1–2 hours
  - *Concrete example:* `src/stores/authStore.ts:58`, `74`; `src/hooks/useBookings.ts:38`, `258`; `src/pages/Booking.tsx:238`, `258`

### 1.4 Missing Error Boundaries / Error Handling

- [ ] **Type: No Error Boundaries** → No React ErrorBoundary component exists anywhere in the codebase. A single runtime crash in any tab of DjProfile.tsx will white-screen the entire app → Remediation cost: 4–6 hours
  - *Concrete example:* No `src/components/ErrorBoundary.tsx` exists

- [ ] **Type: Silent Error Swallowing** → authStore.fetchMe catches errors silently, removes token, and sets isLoading=false without surfacing to user → Remediation cost: 1–2 hours
  - *Concrete example:* `src/stores/authStore.ts:83–98`

- [ ] **Type: Silent Error Swallowing** → api.ts 401 interceptor redirects to /login without toast or context, causing abrupt UX → Remediation cost: 1 hour
  - *Concrete example:* `src/lib/api.ts:26–38`

- [ ] **Type: Missing Error Handling** → Dashboard.tsx makes raw axios call with manual .then/.catch instead of tanstack query, no retry logic → Remediation cost: 2–3 hours
  - *Concrete example:* `src/pages/Dashboard.tsx:69–86`

- [ ] **Type: No Backend Error Normalization** → API routes return `error.message` directly to client, potentially leaking internal details (e.g., Prisma error messages) → Remediation cost: 2–4 hours
  - *Concrete example:* `api/routes/djs.ts:193`, `api/routes/auth.ts:125`, `api/routes/battles.ts:84`

### 1.5 Magic Numbers / Strings

- [ ] **Type: Magic Numbers** → Hardcoded budget preset values (5000, 15000, 30000, 100000) in Booking.tsx filter UI → Remediation cost: 30 minutes
  - *Concrete example:* `src/pages/Booking.tsx:795–801`

- [ ] **Type: Magic Numbers** → Animation durations (0.5, 0.6, 0.3, 1.3, 2) scattered across every page without named constants → Remediation cost: 1–2 hours
  - *Concrete example:* `src/pages/Home.tsx:186`, `197`, `217`, `229`, `249`, `266`, `288`

- [ ] **Type: Magic Strings** → Hardcoded hex color values repeated in dozens of places (`#D4A24A`, `#22C55E`, `#1E1E1E`, etc.) instead of theme tokens → Remediation cost: 2–3 hours
  - *Concrete example:* `src/pages/Rankings.tsx:66`, `68`, `75`; `src/pages/AdminDashboard.tsx:34`, `35`, `147`, `153`, `155`, `157`, `159`

- [ ] **Type: Magic Numbers** → Hardcoded pagination limits (50, 20, 12, 100) in hooks and backend routes without a shared config → Remediation cost: 1 hour
  - *Concrete example:* `src/hooks/useDJs.ts:16` (limit=12), `src/hooks/useEvents.ts:14` (limit=12), `api/routes/djs.ts:145` (limitNum=20), `api/routes/messages.ts:114` (take=100)

- [ ] **Type: Magic Strings** → Hardcoded event type strings ("Wedding", "Club Night", "Corporate", etc.) in both Booking.tsx select and Booking.tsx filter, and backend bookings.ts status enum → Remediation cost: 1 hour
  - *Concrete example:* `src/pages/Booking.tsx:354–362` vs `src/pages/DjProfile.tsx:354–362` vs `api/routes/events.ts:114–121`

### 1.6 Missing Input Validation (Frontend)

- [ ] **Type: No Zod on Frontend Forms** → Booking modal forms in DjProfile.tsx and Booking.tsx rely solely on HTML5 `required` and `type="email"` — no client-side schema validation before submission → Remediation cost: 4–6 hours
  - *Concrete example:* `src/pages/DjProfile.tsx:342–552` form has no validation library

- [ ] **Type: No Client-Side Date Validation** → Booking forms accept past dates for eventDate without client-side check → Remediation cost: 1 hour
  - *Concrete example:* `src/pages/Booking.tsx:332–338` (input type="date" with no min attribute)

- [ ] **Type: No Phone Number Validation** → Contact phone in booking modal is a raw text input with no format validation → Remediation cost: 1 hour
  - *Concrete example:* `src/pages/DjProfile.tsx:479–486`

### 1.7 API Rate Limiting Gaps

- [ ] **Type: No Public Endpoint Rate Limiting** → GET /api/djs, GET /api/mixes, GET /api/events, GET /api/battles are all public with no rate limiting beyond the global 100req/15min generalLimiter → Remediation cost: 2–3 hours
  - *Concrete example:* `api/server.ts:70–77` — these routes do not have a dedicated limiter

- [ ] **Type: Weak Auth Limiter** → authLimiter allows 10 requests per 15 minutes, which is generous for brute-force attacks on /login and /register → Remediation cost: 30 minutes
  - *Concrete example:* `api/utils/rateLimiter.ts:16–26` (max: 10)

- [ ] **Type: No Rate Limiting on Play Count** → POST /api/mixes/:id/play (or GET increment) has no rate limiter, allowing easy play-count inflation → Remediation cost: 1–2 hours
  - *Concrete example:* `api/routes/mixes.ts:138–162` — no limiter applied

- [ ] **Type: No Rate Limiting on Like Count** → POST /api/mixes/:id/like has no rate limiter, allowing easy like-count inflation → Remediation cost: 1–2 hours
  - *Concrete example:* `api/routes/mixes.ts:293–303` — no limiter applied

### 1.8 CORS / Security Misconfigurations

- [ ] **Type: CORS Origin String Splitting** → FRONTEND_URL is split on commas, but no validation that origins are actually HTTPS in production → Remediation cost: 30 minutes
  - *Concrete example:* `api/server.ts:29` — `FRONTEND_URL.split(',')`

- [ ] **Type: Helmet CSP Disabled** → `contentSecurityPolicy: false` is set because "API returns JSON", but the same Express app serves the OG meta route and static uploads, so CSP should be enabled for those paths → Remediation cost: 1 hour
  - *Concrete example:* `api/server.ts:33–36`

- [ ] **Type: Large JSON Payloads** → `express.json({ limit: '50mb' })` allows 50MB JSON payloads. This is excessive for an API that primarily handles small JSON. Risk of DoS via large JSON parsing → Remediation cost: 30 minutes
  - *Concrete example:* `api/server.ts:52`

### 1.9 Hardcoded URLs / Ports

- [ ] **Type: Hardcoded API Port** → `src/lib/api.ts:3` falls back to `http://localhost:5002/api` if env var missing — should be build-time enforced, not runtime fallback → Remediation cost: 30 minutes

- [ ] **Type: Hardcoded WhatsApp URL** → WhatsApp deep link constructed inline in DjProfile.tsx: `https://wa.me/${dj.whatsappNumber.replace(/\D/g, '')}` → Remediation cost: 15 minutes
  - *Concrete example:* `src/pages/DjProfile.tsx:805`

- [ ] **Type: Hardcoded OG Redirect** → `api/server.ts:130` hardcodes `window.location.href` redirect in OG meta route with no protocol validation → Remediation cost: 15 minutes

- [ ] **Type: Hardcoded Brand Name in API** → `api/routes/auth.ts:208` creates temp email with `phone_${Date.now()}@soundit.sl` — domain hardcoded → Remediation cost: 15 minutes

### 1.10 Tight Coupling Between Features

- [ ] **Type: Feature Coupling** → The MixesTab in DjProfile.tsx knows about the like/toggle logic and display details of mixes, but also imports and uses the specific `group-hover:bg-gold/30` color token. This tab is tightly coupled to the global theme → Remediation cost: 2–4 hours
  - *Concrete example:* `src/pages/DjProfile.tsx:821–942`

- [ ] **Type: Auth Store Knows About LocalStorage** → authStore directly reads/writes localStorage keys (`soundit_token`) instead of using an abstract storage adapter → Remediation cost: 1–2 hours
  - *Concrete example:* `src/stores/authStore.ts:44`, `53`, `79`, `84`, `96`, `102`

---

## 2. Logic Duplication

### 2.1 Booking Modal Duplication

- **Locations:** `src/pages/DjProfile.tsx:236–556` (BookingModal) and `src/pages/Booking.tsx:208–428` (BookingRequestModal)
- **Extraction candidate:** `BookingModal` shared component
- **Lines duplicated:** ~180 lines of form JSX, state management, and submission logic
- **Severity:** High — two separate booking forms with slightly different fields will diverge over time

### 2.2 Budget/Duration Parsing Duplication

- **Locations:** `src/pages/DjProfile.tsx:171–201` (parseBudget, parseDuration) and `src/pages/Booking.tsx:191–206` (parseDuration, parseBudget)
- **Extraction candidate:** `parseBudget()`, `parseDuration()` utility functions
- **Lines duplicated:** ~30 lines
- **Note:** The two implementations have slightly different logic (DjProfile has more budget range cases). This is a bug risk.

### 2.3 Formatting Helpers Duplication

- **Locations:** `src/pages/DjProfile.tsx:133–153` (formatNumber, formatCompact, formatDate, formatFee, getInitials, getDisplayName) and `src/pages/Battles.tsx:87–103` (getInitials, getEntryVotes, formatDateRange) and `src/pages/Rankings.tsx:78–80` (formatCompact) and `src/pages/Discover.tsx:73–87` (formatFollowers, formatPrice)
- **Extraction candidate:** `formatUtils.ts` with formatNumber, formatCompact, formatDate, formatFee, getInitials
- **Lines duplicated:** ~80+ lines across 4 files
- **Note:** `getInitials` is implemented differently in Battles.tsx (single char) vs DjProfile.tsx (same single char — actually consistent, but still duplicated)

### 2.4 Status Color Mapping Duplication

- **Locations:** `src/pages/DjProfile.tsx:1283–1291` (statusColors for EventsTab) and `src/pages/Booking.tsx` (implicit via inline classes) and `src/pages/Dashboard.tsx:275–283` (inline status classes)
- **Extraction candidate:** `StatusBadge` component with shared color map
- **Lines duplicated:** ~20 lines
- **Note:** DjProfile uses `bg-green/15 text-green` while Dashboard uses `bg-green/10 text-green` — inconsistent color opacity values

### 2.5 Star Rating Component Duplication

- **Locations:** `src/pages/DjProfile.tsx:214–233` (StarRating component) and inline star logic in Rankings.tsx and Booking.tsx
- **Extraction candidate:** `StarRating` shared component in `src/components/`
- **Lines duplicated:** ~20 lines
- **Note:** StarRating exists only in DjProfile.tsx; other pages use inline `<Star>` icons

### 2.6 Easing Array Duplication

- **Locations:** `src/pages/Home.tsx:69` (easeSmooth), `src/pages/Discover.tsx:69` (easeSmooth), `src/pages/Rankings.tsx:35` (easeSmooth), `src/pages/Booking.tsx:165` (inline), `src/pages/DjProfile.tsx:209` (inline)
- **Extraction candidate:** `ANIMATION_EASING` constant in `src/lib/constants.ts`
- **Lines duplicated:** ~15 lines
- **Note:** All are the same `[0.16, 1, 0.3, 1]` array but redefined per file

### 2.7 Filter State Management Pattern

- **Locations:** `src/pages/Discover.tsx:264–274` (filter state) and `src/pages/Booking.tsx:441–449` (filter state) and `src/pages/DjProfile.tsx:248–260` (booking form state)
- **Extraction candidate:** `useFilterState` hook or form abstraction
- **Lines duplicated:** ~30 lines of useState/useCallback boilerplate

### 2.8 Animation Variant Duplication

- **Locations:** `staggerContainer`/`staggerItem` in `src/pages/Booking.tsx:152–167` and similar patterns in `src/pages/Home.tsx` and `src/pages/Battles.tsx`
- **Extraction candidate:** `fadeAnimations.ts` shared animation variants
- **Lines duplicated:** ~40 lines

### 2.9 API Query Key Pattern Duplication

- **Locations:** Every hook file (`useDJs.ts`, `useMixes.ts`, `useEvents.ts`, `useBattles.ts`, `useRankings.ts`, `useAdmin.ts`) repeats the same `queryKey: ['resource', filters]` pattern and `params.set`/`params.toString()` boilerplate
- **Extraction candidate:** `useApiQuery` wrapper hook or `buildQueryParams` utility
- **Lines duplicated:** ~30 lines × 6 files = ~180 lines

---

## 3. Performance Bottlenecks

### 3.1 DjProfile.tsx — Monolithic Data Loading

- **Metric:** Single page loads all DJ data (profile, mixes, reviews, events, ranking history, similar DJs) simultaneously on mount
- **Root cause:** All tabs render eagerly; `useDJ(identifier)` fetches everything in one Prisma include. The `mixes` relation fetches ALL public mixes, `reviews` fetches 20, `events` fetches upcoming
- **Fix:** Implement tab-level lazy loading — only fetch Mixes data when MixesTab is active, Reviews when ReviewsTab is active, etc. Use React.lazy for tab components.
- **Expected gain:** 60–70% reduction in initial page load time for DJs with many mixes/reviews
- **Concrete example:** `api/routes/djs.ts:248–285` — `commonInclude` loads `mixes`, `reviews`, `events`, `streamingPlatforms` all at once

### 3.2 Battles.tsx — Client-Side Leaderboard Recomputation

- **Metric:** `computeLeaderboard(allBattles)` runs on every render via `useMemo` with dependency `[allBattles]`
- **Root cause:** Battles data includes `votesCast` array with IDs; even if vote counts don't change, the array reference changes on refetch, triggering recomputation
- **Fix:** Move leaderboard computation to backend with a dedicated endpoint `/api/battles/leaderboard`
- **Expected gain:** 40–50% reduction in Battles page render time
- **Concrete example:** `src/pages/Battles.tsx:105–151`, `210`

### 3.3 MixesTab — Random Waveform Re-Render

- **Metric:** `Math.random()` inside render loop for every mix card's mini waveform
- **Root cause:** `Array.from({ length: 30 }).map((_, wi) => { const height = 20 + Math.sin(wi * 0.8) * 15 + Math.random() * 15; ... })` runs on every render, causing unnecessary DOM updates
- **Fix:** Use `useMemo` for the waveform data or pre-compute static heights; remove `Math.random()` from render
- **Expected gain:** 20–30% reduction in MixesTab render time for DJs with >20 mixes
- **Concrete example:** `src/pages/DjProfile.tsx:917–928`

### 3.4 Home.tsx — Waterfall API Calls

- **Metric:** 5 sequential/semi-parallel useQuery hooks in `useHomeData` but no Suspense boundaries
- **Root cause:** `useHomeData.ts` fires 5 separate API calls. If one fails, the whole page shows a single spinner. No parallel data fetching with error isolation
- **Fix:** Use `Promise.all` batching or React Suspense with error boundaries per section
- **Expected gain:** 15–25% reduction in perceived load time (section-by-section rendering)
- **Concrete example:** `src/hooks/useHomeData.ts:5–43`

### 3.5 Discover.tsx — Client-Side Filtering After Server Fetch

- **Metric:** DJs are fetched from server (paginated), then filtered client-side for equipment and rating
- **Root cause:** Equipment and rating filters are not sent to the server. The server returns 12 DJs, then client filters may show 0 results even though more matching DJs exist on subsequent pages
- **Fix:** Move equipment and rating filters to the Prisma query in `api/routes/djs.ts`
- **Expected gain:** Eliminates empty-result false positives; reduces server load by filtering at DB level
- **Concrete example:** `src/pages/Discover.tsx:296–309`

### 3.6 Rankings.tsx — Static Trend Data

- **Metric:** `TREND_DATA` is a hardcoded 70-line constant array with fake data for the top 5 DJs trajectory chart
- **Root cause:** This data is bundled in the JS bundle and rendered on every mount, but it's static and not real
- **Fix:** Remove or replace with actual API data; if placeholder is needed, load it lazily
- **Expected gain:** ~5KB reduction in JS bundle, faster initial render
- **Concrete example:** `src/pages/Rankings.tsx:596–607`

### 3.7 AnimatePresence List Re-Renders

- **Metric:** `AnimatePresence mode="popLayout"` on DJ grid in Discover.tsx and Booking.tsx causes every list item to re-animate on filter change
- **Root cause:** Framer Motion's AnimatePresence with `layout` prop triggers FLIP animations on all items whenever the array reference changes
- **Fix:** Use `layoutId` sparingly or disable `layout` for large lists; use `virtualization` for lists >50 items
- **Expected gain:** 30–40% reduction in animation jank on filter changes
- **Concrete example:** `src/pages/Discover.tsx:871–977`, `src/pages/Booking.tsx:872–977`

### 3.8 Dashboard.tsx — Raw Axios Instead of TanStack Query

- **Metric:** Dashboard data is fetched with raw `.get('/dashboard')` and manual `.then/.catch` instead of useQuery
- **Root cause:** No caching, no deduplication, no background refetch, no stale-while-revalidate. The data is refetched on every mount even if it hasn't changed
- **Fix:** Convert to `useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard').then(r => r.data.data) })`
- **Expected gain:** 50% reduction in duplicate API calls when navigating back to Dashboard
- **Concrete example:** `src/pages/Dashboard.tsx:69–86`

---

## 4. Scalability Ceilings

### 4.1 Database Connection Pooling

- **Current limit:** Prisma Client is instantiated as a singleton (`api/utils/prisma.ts:11`) but no explicit connection pool size is configured in the schema
- **Trigger condition:** At ~100 concurrent requests, the default PostgreSQL connection limit (usually 100) will be exhausted, causing `P1001` or `P1002` errors
- **Prevention:** Add `connection_limit` and `pool_timeout` to the DATABASE_URL; configure Prisma's `previewFeatures` for connection pooling if using serverless
- **Concrete example:** `api/prisma/schema.prisma:6–9` — no connection pool config; `api/utils/prisma.ts:1–11` — singleton pattern is correct but insufficient without pool tuning

### 4.2 Battle Vote — N+1 Updates on Every Vote

- **Current limit:** When a user votes, the backend fetches ALL entries in the battle, then loops through them to update finalScore for each one
- **Trigger condition:** A battle with 50+ entries will cause 50+ sequential UPDATE queries on every single vote. At 100 votes/minute, the database will be saturated
- **Prevention:** Use a single raw SQL query or a materialized view for battle scores; defer final score calculation to a background job
- **Concrete example:** `api/routes/battles.ts:300–316` — `for (const e of allEntries) { await prisma.battleEntry.update(...) }`

### 4.3 Ranking Recalculation — Sequential Updates

- **Current limit:** `recalculateAllRankings()` in `api/utils/ranking.ts:159–221` fetches ALL DJs, computes scores, then runs `await prisma.djProfile.update(...)` and `await prisma.rankingHistory.create(...)` sequentially for every DJ
- **Trigger condition:** With 1,000 DJs, this is 2,000 sequential database writes. The function could take 30+ seconds and hold the event loop
- **Prevention:** Use `prisma.$transaction` with batching, or move to a background worker (Bull/Redis). Consider using `prisma.$executeRaw` for bulk UPDATEs
- **Concrete example:** `api/utils/ranking.ts:193–218` — sequential updates in a `for` loop

### 4.4 Message API — Hard 100-Message Limit

- **Current limit:** `api/routes/messages.ts:114` uses `take: 100` with no pagination or cursor. Conversation history is capped at 100 messages with no way to load older
- **Trigger condition:** Active conversations with >100 messages will silently truncate history
- **Prevention:** Implement cursor-based pagination (`cursor` + `skip`) or infinite scroll with `take: 50` and `skip` based on loaded count
- **Concrete example:** `api/routes/messages.ts:106–114`

### 4.5 File Uploads — 500MB Audio in Memory

- **Current limit:** `uploadMix` middleware uses `multer.memoryStorage()` with a 500MB limit. Large audio files are buffered entirely in memory before processing
- **Trigger condition:** A 500MB MP3 upload will consume 500MB of Node.js heap per concurrent upload. With 10 concurrent uploads, the server will likely OOM
- **Prevention:** Use streaming upload (multer diskStorage with temp cleanup, or direct S3 presigned URL upload from client). For audio, enforce a smaller limit (50MB) or implement chunked upload
- **Concrete example:** `api/utils/upload.ts:46–50`, `75–90`

### 4.6 Search — Basic `contains` Queries

- **Current limit:** DJ search in `api/routes/djs.ts:155–161` uses Prisma `contains` with `mode: 'insensitive'` on three fields. This is a full table scan with no full-text index
- **Trigger condition:** With 10,000+ DJs, search queries will take 500ms+ and will not use indexes effectively
- **Prevention:** Add PostgreSQL `tsvector` full-text search columns, or integrate with Elasticsearch/Meilisearch for search
- **Concrete example:** `api/routes/djs.ts:155–161` — `where.OR = [ { stageName: { contains: search, mode: 'insensitive' } }, ... ]`

### 4.7 No Caching Layer

- **Current limit:** Every request hits the database directly. Rankings, featured DJs, cities, and genres are relatively static but refetched on every page load
- **Trigger condition:** At 1,000 concurrent users, the database will be hammered with identical queries for featured DJs and rankings
- **Prevention:** Add Redis for caching rankings (TTL: 1 hour), featured DJs (TTL: 15 minutes), and static lookups like cities/genres (TTL: 1 day)
- **Concrete example:** `src/hooks/useHomeData.ts` fires uncached queries every mount; `api/routes/djs.ts:198–209` (cities) fetches from DB every time

### 4.8 Image Serving — No CDN/Optimization

- **Current limit:** Uploaded images are served via Express static middleware (`/uploads`) or basic S3 URL with no resizing, WebP conversion, or CDN edge caching
- **Trigger condition:** A DJ profile page with 20 mix cover images will load 20 full-resolution images. On mobile, this is bandwidth-heavy and slow
- **Prevention:** Use a CDN with on-the-fly image optimization (Cloudflare Images, Imgix, or AWS CloudFront with image resizing). Generate multiple sizes at upload time
- **Concrete example:** `api/utils/storage.ts:76` — returns raw S3 URL with no optimization parameters; `api/utils/imageProcessor.ts` only resizes avatars/covers, not mix images

### 4.9 OG Meta Route — Synchronous DB Query

- **Current limit:** The OG meta route (`/og/dj/:identifier`) does a synchronous Prisma query before rendering HTML. Social crawlers hitting this will block the event loop
- **Trigger condition:** A viral share could cause 1,000+ concurrent crawler requests, each doing a DB lookup and HTML string construction
- **Prevention:** Cache OG metadata in Redis with a long TTL; pre-render static OG images for top DJs; use a CDN cache rule for `/og/*`
- **Concrete example:** `api/server.ts:84–142`

### 4.10 Prisma Migration Lock Strategy

- **Current limit:** `api/prisma/migrations/migration_lock.toml` uses `provider = "postgresql"`. Only one migration exists (`20260624152316_init`). No seed strategy for production data
- **Trigger condition:** Future schema changes require careful migration planning. With production data, migrations that alter large tables (e.g., adding an index to `djProfile`) will lock the table
- **Prevention:** Implement a migration strategy with `prisma migrate deploy` in CI/CD; use `CREATE INDEX CONCURRENTLY` for new indexes; establish a staging environment for migration testing
- **Concrete example:** `api/prisma/migrations/` — only one migration file exists

---

## Summary Matrix

| Category | Count | Highest Severity | Total Remediation (est.) |
|----------|-------|-------------------|--------------------------|
| Architecture Smells | 25 | Critical (no error boundaries) | 8–10 days |
| Logic Duplication | 9 | High (booking modal dup) | 3–4 days |
| Performance Bottlenecks | 8 | High (DjProfile monolithic load) | 5–7 days |
| Scalability Ceilings | 10 | Critical (battle vote N+1) | 7–10 days |
| **Total** | **52** | — | **23–31 days** |

## Priority Order (Recommended)

1. **P0 — Scalability:** Fix battle vote N+1 updates, add Redis caching, implement ranking background job
2. **P0 — Security:** Add rate limiting to public endpoints, tighten auth limiter, validate CORS origins
3. **P1 — Performance:** Lazy-load DjProfile tabs, convert Dashboard to useQuery, remove client-side leaderboard computation
4. **P1 — Architecture:** Extract BookingModal to shared component, extract format helpers, add ErrorBoundary
5. **P2 — Type Safety:** Remove `any` casts, add frontend Zod validation, type DashboardData properly
6. **P2 — Maintainability:** Split god files into feature folders, extract animation constants, unify status color maps

---
*End of Audit*
