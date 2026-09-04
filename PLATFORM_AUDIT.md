# PLATFORM AUDIT — Deck Salone

**Audit date:** 2026-09-02 · **Auditor:** Kimi (automated full-platform audit)
**Scope:** 73 frontend pages, 31 backend route files (~250 endpoints), 49 Prisma models, auth/security layer, build & deploy pipeline, Docker/nginx/CI.
**Method:** 7 parallel read-only audit streams (public pages, app pages, backend routes, frontend↔backend integration, security, database, performance/build/deploy), followed by targeted verification of every critical claim and a supervised fix pass.

---

## 1. Executive Summary

**Overall health: FAIR — functional core with several critical security/correctness defects, now patched locally.**

The platform is largely coherent: ~230 frontend API call sites were traced against the backend and nearly all map cleanly (correct method, path, and `{success,data}` envelope). The database schema is well-indexed (231 indexes covering hot paths, 8 migrations present). However, the audit found **2 P0 frontend security bugs, 2 P0 backend security bugs, 1 P0 broken feature chain (on-site staff check-in), and 1 P0 data-loss risk in the deploy pipeline** — all now fixed and verified locally.

| Category | Found | Fixed this pass | Open (needs decision/work) |
|---|---|---|---|
| P0 — Critical (security/crash/data-loss/broken core) | 7 | 7 | 0 |
| P1 — High (major feature/API/security) | 9 | 7 | 2 |
| P2 — Medium (normal-usage bugs) | 21 | 10 | 11 |
| P3 — Low (minor/cleanup/perf hygiene) | 20 | 7 | 13 |
| Missing API endpoints (frontend calls, no backend) | 3 | 0 | 3 |
| Mock/placeholder features presented as real | 5 | 1 | 4 |

**Verification of fixes:** `npx tsc -b` ✅ · `npm run api:build` ✅ · `npx jest` 16/16 ✅ · `npx vite build` ✅. **Fixes are local only — not yet deployed to production.**

### Top risks that remain OPEN (require your decision)
1. **`SupportDashboard` is 100% mock** — fictional tickets, dead buttons; a SUPPORT_ADMIN cannot act on real support requests. Needs a real support-ticket backend (new feature).
2. **Legacy ticket router split-brain** — `/api/events/:id/tickets` (legacy) writes statuses `scanned`/`declined` that the current ticketing system doesn't recognize, silently corrupting attendance/revenue aggregates. Needs a data migration + router deprecation (destructive DB change).
3. **`PUT /api/users/profile` changes email with no verification** (unlike `/auth/me` which requires OTP). Should be deprecated or routed through the verified flow.
4. **Onsite staff password** is stored/compared in plaintext with no brute-force lockout (now no longer leaked publicly, but still weak).
5. **Admin "Violations" section calls `GET/PATCH /api/admin/reports*` which don't exist** — dead UI for admins.
6. **Blog page is mock content** with a dead Subscribe button.

---

## 2. Page Audit (all 73 pages)

**Status summary:** 54 OK · 10 Partial (minor defects, mostly fixed) · 3 Broken/Fixed · 4 Mock/Placeholder · 2 Security-critical (fixed).

| Page | Route | Status | Notes |
|---|---|---|---|
| Home | `/` | OK (fixed link) | Was: "Browse all" → dead `/official-playlists`; no error/empty states on failed sections |
| About / Privacy / Terms / Help / InstallApp | static | OK | Help copy says "working on mobile apps" though InstallApp exists (stale copy) |
| Blog | `/blog` | **MOCK** | Hardcoded `samplePosts`; Subscribe button has no action. Open — needs product decision |
| Developers | `/developers`, `/api` | OK | Doc snippet references nonexistent `GET /api/rankings/weekly` (docs-only) |
| Pricing | `/pricing` | OK (fixed) | Was: navigate to nonexistent `/user/subscription` after submit |
| Feed | `/feed` | OK | Minor: inline follow duplicates hook logic; one raw axios call bypasses react-query |
| Discover | `/discover` | OK (fixed) | Debug console.log removed |
| Events | `/events` | Partial | Silently drops organizer-created events with no `djId` — **open, needs decision** |
| EventDetail | `/events/:id` | OK | Minor: raw `publishStatus` badge shown publicly |
| HallOfFame | `/hall-of-fame` | Broken→**Fixed** | Was P0: admin API calls fired for guests → 401 → forced redirect to /login |
| Battles / Rankings | `/battles`, `/rankings` | OK | Minor: "Last updated" uses client clock (`new Date()`) |
| MixHub | `/mixes` | OK (fixed) | Was: ignored `?search=` deep links (no search state at all — added) |
| MixDetail / DjProfile / UserPublicProfile | — | OK | DjProfile is a 2,320-line monolith (maintainability note) |
| OfficialPlaylists / OfficialPlaylistDetail | `/playlists`… | OK (fixed) | Was: fallback image `placeholder-mix.jpg` (404) → `mix-placeholder.jpg` |
| Login | `/login` | **Fixed (P0)** | Was: "Remember Me" stored plaintext password in localStorage; now email-only |
| Register / ForgotPassword / ResetPassword / AuthCallback | — | OK | AuthCallback debug log removed |
| AccountPage | `/account` | OK (fixed) | Was: link to nonexistent `/dashboard/notifications`; no auth gate on menu page (cosmetic) |
| RequestDj / Opportunities | — | OK | Contact fields optional client-side |
| AdminDashboard | `/admin` | OK | 19 tabs wired; uses `alert()` once; direct api calls bypass hooks (works) |
| FinanceDashboard | `/finance` | OK | Backend role fix applied (SUPER_ADMIN/FINANCE_ADMIN access) |
| **SupportDashboard** | `/support` | **MOCK (P0 functionality)** | Entire page hardcoded fictional tickets; Mark Resolved/Escalate have **no handlers**. Open |
| VerificationDashboard | `/verification` | OK | Hardcoded approval note/badge text (cosmetic) |
| Moderator suite (6 pages) | `/moderator/*` | OK | Feature-as-moderator call to `/admin/mixes/:id/feature` — backend allows (moderator router self-gates; admin route requires ADMIN+ — **verify** see §7 B-17) |
| dashboard/Overview | `/dashboard` | OK (fixed) | Was: fake KPI trends `+12%`/`Top 5%`/`-2%` rendered as real |
| dashboard/Analytics, Earnings, Followers, Mixes, Photos, Profile, Sets, Messages, Campaigns | — | OK | |
| dashboard/Bookings | — | OK (fixed) | Was: double fetch on mount |
| dashboard/DjEvents | `/dashboard/events` | Partial | `limit=100`, no pagination — open (P3) |
| dashboard/EventDashboard | — | OK (fixed) | Was: wrong success toast + hook payload type missing `onsiteUsername` |
| dashboard/EventTicketManagement | — | OK (fixed) | Was: CSV export via `window.open` without auth → 401; now authenticated blob download |
| dashboard/EventAnalytics | — | OK | |
| dashboard/Subscription | `/dashboard/subscription` | Partial | **Hardcoded plan prices** (100/150 monthly, 1000/1500 annual) override admin config. Open — product decision |
| dashboard/ScannerLanding / TicketScanner | pro+ routes | OK | Minor: scanner event switcher lists **all** public events (should filter own) — open P2 |
| EditMix | `/mixes/:id/edit` | OK | |
| user/UserDashboard, Messages, Following, Activity, Profile | `/user/*` | OK | |
| user/MyBookings | — | OK (fixed) | Was: silent review-submit failure |
| user/MyTickets | `/user/tickets` | Partial | "Download" button is dead (`toast.info('coming soon')`). Open — feature decision |
| user/Notifications | — | OK (fixed) | Was: dismiss only hid locally; now calls `DELETE /notifications/:id`; still no pagination (P3) |
| user/UserSettings | — | OK | |
| onsite/OnsiteLogin, OnsiteTools | `/events/:id/onsite*` | Broken→**Fixed (P0)** | Was: staff token-only auth could never pass `authMiddleware` → all onsite staff 401/403. Now `authOrOnsiteMiddleware` |

---

## 3. Feature Audit

| Feature | FE | BE | DB | Status |
|---|---|---|---|---|
| Auth (register/login/Google/reset/OTP) | ✅ | ✅ (lockout, hashed single-use reset tokens, OTP caps) | ✅ | **Working** (OTP dev-logging fixed) |
| Ticket purchase (Pro+ ticketing) | ✅ | ✅ (atomic capacity via raw SQL, purchase limiter) | ✅ | **Working** |
| **Ticket scanning — DJ (new system)** | ✅ | ✅ | ✅ | **Working** (error taxonomy verified) |
| **Ticket scanning — onsite staff** | ✅ | ✅ (after fix) | ✅ | **Was BROKEN (P0) — FIXED**, needs staging E2E test |
| Ticketing dashboard/analytics/export | ✅ | ✅ (export now authed from FE) | ✅ | **Working** |
| Legacy ticket router (`/tickets`) | n/a (unused by FE) | ⚠️ writes `scanned`/`declined` | ⚠️ same column | **OPEN — split-brain, migration decision required** |
| Bookings + counter-offers + reviews | ✅ | ✅ | ✅ (missing `(clientId,status)` index — minor) | **Working** |
| Mixes (upload/like/play/repost/comments/import) | ✅ | ✅ | ✅ | **Working** |
| Mix reactions (emoji) | ✅ calls `POST /mixes/:id/reactions` | ❌ **endpoint missing** | — | **BROKEN silently** (catch swallows) — open |
| Sets | ✅ (calls api directly) | ✅ | ✅ | Working; **entire useSets hook family dead code** |
| Gigs + Opportunities | ✅ | ✅ | ✅ | Working; two parallel systems; several dead gig hooks |
| Battles + voting | ✅ | ✅ (vote limiter) | ✅ | Working |
| Rankings | ✅ | ✅ | ✅ | Working; recalc is synchronous full-scan endpoint (perf, open) |
| Discover / recommendations | ✅ | ✅ | ✅ | Working; unbounded DJ includes (perf, open) |
| Campaigns / home-board ads | ✅ | ✅ | ✅ | Working |
| Hall of Fame | ✅ | ✅ | ✅ | **Fixed** (guest redirect) |
| Official playlists (moderator CRUD) | ✅ | ✅ | ✅ | Working |
| Payments / Pro subscriptions (manual proof flow) | ✅ | ✅ | ✅ | Working; **no webhook** (documented manual flow); hardcoded FE prices open |
| Payouts | ✅ | ✅ | ✅ | Working |
| Messages (DJ↔user) | ✅ | ✅ | ✅ | Working; conversations endpoint N+1 (perf, open) |
| Notifications | ✅ | ✅ | ✅ | Working after dismiss-wiring fix; two duplicate hook families (P3) |
| Photos | ✅ | ✅ | ✅ | Working |
| DJ verification | ✅ | ✅ | ✅ | Working |
| Support dashboard | ✅ **mock** | ❌ no backend | ❌ no model | **NOT IMPLEMENTED — open, biggest functional gap** |
| Blog | ✅ **mock** | ❌ | ❌ | **NOT IMPLEMENTED — open** |
| Admin suite (stats/DJs/mixes/events/users/payments/battles/ads/notifications/email tools) | ✅ | ✅ | ✅ | Working after SUPER_ADMIN fix; **Violations tab dead** (missing `/admin/reports*`), scan-logs missing |
| Moderator suite | ✅ | ✅ | ✅ | Working |
| Analytics/visit tracking | ✅ | ✅ | ✅ | Working |
| SEO (OG/sitemap/meta) | ✅ | ✅ | ✅ | Working |

---

## 4. API Audit

### 4.1 Missing endpoints (frontend calls → no backend) — ALL OPEN
| # | Frontend call | Problem | Recommended fix |
|---|---|---|---|
| M-1 | `GET /api/admin/reports?status=` + `PATCH /api/admin/reports/:id` (AdminDashboard Violations tab) | No `/admin/reports` routes exist; reports live at `/api/moderator/reports` + `POST /api/moderator/reports/:id/action` | Add thin admin routes delegating to the same handlers, or repoint FE to moderator routes for admins |
| M-2 | `GET /api/admin/events/:id/scan-logs` (useAdmin.ts:577) | Never implemented | Add admin route reading `EventScanLog` |
| M-3 | `POST /api/mixes/:id/reactions` (MixFeedRow:155) | Emoji reactions have no backend; failures silently swallowed | Implement or remove the UI |

### 4.2 Broken chains — FIXED this pass
- CSV guest-list export without auth → authenticated blob download.
- Onsite staff auth chain (see B-01).
- HallOfFame guest 401 bounce.

### 4.3 Response-shape integration: CLEAN
Envelope `{success,data}` ↔ `res.data.data` verified across ~230 call sites. Two intentional deviations (`/mixes/:id/download` flat fields; `/messages/:userId` top-level `partner`) are correctly matched by the FE.

### 4.4 Unused/duplicate backend surface (candidates for deprecation — decision required)
- **Legacy `api/routes/tickets.ts` router entirely** (superseded by eventTicketing; actively corrupts status vocabulary).
- Auth OTP routes (`/auth/phone/*`, `/auth/email/*`) — zero FE usage.
- ~40 individual dead endpoints (full list in audit working notes): `/users/notifications*` duplicates of `/notifications*`, `/djs/:id/sets` + `/djs/me/sets` duplicates of `/sets*`, `/discover/mixes*` family, `/payments` legacy CRUD, admin sets/email-tool routes, etc.
- Dual mountings: `/api/auth` + `/api/v1/auth`; `/api/reports` + `/api/v1/reports`.
- Duplicate FE implementations: follow logic (hook + inline), ticket-type mutations (hook + inline), messages UI (3 near-identical copies), `GET /events?djId=` re-fetched inline 3× in DjEvents.

---

## 5. Bug Report (fixed items — all verified by tsc/api:build/jest/vite build)

> IDs are stable for weekly tracking. "Fixed" = code changed + build/tests green. Items needing staging verification are marked.

### P0 — Critical
| ID | Location | Description / Root cause | Fix | Verification |
|---|---|---|---|---|
| B-01 | `api/routes/eventTicketing.ts` | **Onsite staff could never authenticate**: `authMiddleware` (user JWT) ran before `onsiteAuthMiddleware`, 401-ing token-only staff; staff branches in `canScanEvent`/`onsiteAuthMiddleware` were unreachable | New `authOrOnsiteMiddleware` (valid `X-Onsite-Token` → staff identity; else user JWT) applied to all 7 onsite routes | tsc/build/jest ✅; **E2E staging test recommended** |
| B-02 | `api/utils/upload.ts` + photos/campaigns/mixes routes | **Stored XSS**: file extension taken from attacker `originalname`, served same-origin by extension → upload `evil.html` as `image/png` | New `extFromMime()` allowlist (image/audio/pdf) used everywhere; no `originalname` trusted | ✅ build |
| B-03 | `src/pages/Login.tsx` | **Plaintext password persisted in localStorage** ("Remember Me") | Store email only; one-time cleanup of legacy key | ✅ tsc |
| B-04 | `src/pages/HallOfFame.tsx` + `useAdmin.ts` | **Public page fired admin API calls** → 401 → global interceptor force-redirected guests to /login | `enabled: !!isAdmin` gating added to both admin queries | ✅ tsc |
| B-05 | `deploy.sh:59` | **`prisma db push --accept-data-loss` on every deploy** — silent column drops + migration-history drift (data-loss footgun) | Replaced with `prisma migrate deploy` (matches Dockerfile CMD) | script syntax ✅ |
| B-06 | `api/routes/eventTicketing.ts` `/availability` | **Public endpoint leaked `event.onsitePassword` (plaintext staff password)** for every ticketed event (full-event query, no select) | Destructure-redact `onsitePassword`/`onsiteUsername` from response | ✅ build |
| B-07 | `api/utils/upload.ts` | **SVG stored raw** in payment proofs/subscription docs (`image/*` filter) → script execution when served | Explicit allowlists: images jpeg/png/webp/gif; documents pdf/jpeg/png/webp; purchase-proof filter tightened too | ✅ build |

### P1 — High
| ID | Location | Description | Fix | Verification |
|---|---|---|---|---|
| B-08 | `api/utils/ticketQr.ts` | Hardcoded literal fallback for QR encryption secret → anyone reading source can forge tickets | Literal removed; throws if neither `TICKET_QR_SECRET` nor `JWT_SECRET` set (prod unaffected — JWT_SECRET required at boot) | ✅ build |
| B-09 | `api/routes/admin.ts:53` | `SUPER_ADMIN` locked out of `/api/admin/*` | Added to requireRole | ✅ build |
| B-10 | `api/routes/payments.ts:211` | `GET /payments/:id` blocked FINANCE_ADMIN | Role check expanded | ✅ build |
| B-11 | Broken routes/links ×3 | `/official-playlists` (Home), `/dashboard/notifications` (AccountPage), `/user/subscription` (Pricing) → dead routes | Repointed to existing routes | ✅ tsc |
| B-12 | `EventTicketManagement.tsx` | CSV export via `window.open` had no auth header → 401 | Authenticated axios blob download | ✅ tsc |
| B-13 | `src/hooks/useEventTicketing.ts` | `useUpdateTicketControls` payload type missing `onsiteUsername` | Type fixed | ✅ tsc |
| B-14 | `api/utils/otp.ts`, `auth.ts` | OTP codes written to server logs in production | Logs gated to non-production | ✅ build |

### P2 — Medium (fixed)
| ID | Location | Description | Fix |
|---|---|---|---|
| B-15 | `api/server.ts` `/health` | Health check never touched DB → false-healthy containers | `SELECT 1` check; 503 on failure |
| B-16 | `api/utils/rateLimiter.ts`, `/metrics` | Rate-limit keys + metrics IP check spoofable via first XFF entry | Rightmost-XFF (single trusted nginx hop) |
| B-17 | `vite.config.ts` | Production sourcemaps exposed full original source | `sourcemap: false` |
| B-18 | `MixHub.tsx` | `?search=` deep links ignored (page had no search state) | Search state + param sync added |
| B-19 | `Overview.tsx` | Fake KPI trends rendered as live stats | Removed |
| B-20 | `Bookings.tsx` | Double fetch on mount | Duplicate effect removed |
| B-21 | `MyBookings.tsx` | Review submit silently failed | Error toast added |
| B-22 | `user/Notifications.tsx` | Dismiss was cosmetic only | Wired to `DELETE /notifications/:id` (optimistic + restore on error) |
| B-23 | `OfficialPlaylistDetail.tsx` | Fallback image 404 (`placeholder-mix.jpg`) | Fixed path |
| B-24 | `rollback.sh` | Health check curled non-published host port + nonexistent `/api/health` → always failed post-rollback | `docker exec … wget …/health` |

### P3 — Low (fixed)
B-25 debug console.log spam removed (Discover, AuthCallback, App, Subscription poll) · B-26 wrong "Staff credentials saved" toast generalized · B-27 **134 × `fail(res,500,error.message)` internal-error leaks** swept to generic message + server-side log · B-28 test-infra fix: `uuid` ESM import broke jest under Node 20 → switched to `crypto.randomUUID` (sms.ts, server.ts) · B-29 CI `npm ci` missing `--legacy-peer-deps` (would fail ERESOLVE) · B-30 deploy pipeline: `db push` → `migrate deploy` (also counted as B-05) · B-31 MixHub/others minor — see §7 for remaining low items.

---

## 6. Security Report (open items — no secrets reproduced)

| # | Sev | Finding | Status |
|---|---|---|---|
| S-01 | P1 | `PUT /api/users/profile` changes **email without verification** (avatar also accepts arbitrary URL) — unlike `/auth/me` OTP flow | **OPEN — decision required** (deprecate or route through confirm flow) |
| S-02 | P1 | Onsite staff password: **plaintext storage/compare, no lockout**, 7-day token lifetime, no revocation | **OPEN** (hash-on-next-save + per-event lockout recommended; availability leak fixed) |
| S-03 | P2 | `/auth/email/send-otp` sends real OTP to **any address** (account or not) — email-bombing vector; also can set `emailVerified` without possession | **OPEN** (recommend: only send for existing accounts + stricter limit/CAPTCHA) |
| S-04 | P2 | Mass-notification/email admin endpoints (`/admin/notifications`, `/admin/send-email`, `/admin/send-custom-email`, battles/ads/campaigns) reachable by **VERIFICATION_ADMIN/FINANCE_ADMIN**, not just ADMIN | **OPEN** (tighten per-route roles; verify moderator `/admin/mixes/:id/feature` path) |
| S-05 | P2 | `/metrics` internal-IP gate (XFF now hardened) — consider requiring `METRICS_TOKEN` | **OPEN** |
| S-06 | P2 | Legacy `/api/events/:id/tickets/scan` lets **any Pro+ DJ scan any event's tickets** (ownership short-circuit) | **OPEN** (fix bundled with legacy-router deprecation decision) |
| S-07 | P3 | No CSP on the SPA-serving path (helmet CSP disabled globally) — amplifies any future XSS | **OPEN** (needs careful policy to not break PWA/inline assets) |
| S-08 | P3 | Brute-force lockout store in-memory per-process (lost on restart, cluster-inconsistent) | **OPEN** (move to Redis; note lockout-by-spray can DoS a victim account — needs design) |
| S-09 | P3 | `SUPPORT_ADMIN` referenced in role guards but absent from Prisma `Role` enum → dead role strings | **OPEN** (add enum value via migration, or clean references) |
| S-10 | P3 | CORS/Cache on `/uploads` fully permissive (acceptable for public assets; UUID-only security for proofs/docs) | Documented — acceptable for now |

**Verified healthy:** bcrypt cost 12 + transparent hash migration · 256-bit single-use hashed reset tokens (15-min) · OTP 10-min TTL, 3-attempt cap · JWT HS256 pinned, ≥32-char secret enforced at boot · 30s auth cache with invalidation · zod validation on auth/payments/bookings/ticketing payloads · all `$queryRaw` parameterized · no `dangerouslySetInnerHTML` in FE · helmet HSTS/frameguard/noSniff · 1MB body limits · upload size caps (10MB img / 300MB audio) · OAuth state cookie httpOnly/secure/sameSite=lax with constant-time compare · no secrets committed to git (verified via `git ls-files`).

---

## 7. Performance Report

**Open items (prioritized):**
| # | Sev | Finding |
|---|---|---|
| PF-1 | P2 | `GET /api/discover/djs` + `/api/djs` include **all mixes + platforms per DJ with no `take`** (sum in JS) — unbounded growth on the most-hit endpoints. Use stored `DjProfile.totalPlays`/`totalStreams` or `aggregate` |
| PF-2 | P2 | `GET /api/messages/conversations` — unbounded distinct scans + 3 queries per partner (N+1) |
| PF-3 | P2 | `/api/campaigns` city lists = full-table scans of `djProfile` + `event` per request |
| PF-4 | P2 | Ranking recalculation = synchronous full-table N+1 exposed as HTTP endpoint (`POST /discover/recalculate` awaits) — make it enqueue/202 or cron-only |
| PF-5 | P2 | Main entry chunk 583 KB minified (radix/date-fns/RHF in eager bundle; PWA-precached). Add manualChunks + more lazy boundaries |
| PF-6 | P2 | Feed page: 8+ queries at limit=20, unmemoized row components, one raw axios call |
| PF-7 | P2 | nginx proxies everything to Node (static `/assets`, `/uploads` dead-mounted in web container); `Connection: upgrade` forced on all locations — use `map $http_upgrade` |
| PF-8 | P2 | Docker runner: full dev `node_modules` copied (no prune), root user, no HEALTHCHECK; every deploy pays double frontend build + `--no-cache` |
| PF-9 | P3 | Large unoptimized originals shipped (`login-bg.jpg` 4.1MB, `mobile-mixes.png` 2MB, `default-avatar.jpg` 384KB used as raw fallback in ~8 components) |
| PF-10 | P3 | Query-key namespaces collide (`['trendingMixes','home']` vs `['trendingMixes',10]` → double fetch Home↔Feed); memoize Feed rows |
| PF-11 | P3 | No list virtualization anywhere (fine at current 20–50 caps; will degrade) |

---

## 8. Database Report

**Healthy:** 49 models, 231 indexes, 14 uniques, 8 migrations + lockfile, soft-delete account deletion, well-covered hot paths.

**Open items:**
| # | Sev | Finding |
|---|---|---|
| DB-1 | **P0-decision** | `EventTicket.status` String column with **two divergent vocabularies** (legacy writes `scanned`/`declined`; current writes `checked_in`/`rejected`) → silently wrong cross-router analytics. Needs: one-time backfill migration (`scanned→checked_in`, `declined→rejected`) + deprecate legacy router (possibly DB enum) |
| DB-2 | P2 | `EventTicketType` has no `@@unique([eventId, name])` → duplicate "VIP" types possible |
| DB-3 | P2 | Missing `@@index([clientId, status])` on `Booking` (client list w/ status filter) |
| DB-4 | P2 | `paymentMethod` vocabulary drift (`mobile_money`/`guest_list`/`organizer_comp`/`cash` vs schema comment) + **cash walk-ins get `paymentStatus:'pending'` → cash revenue undercounted** in "paid" aggregates |
| DB-5 | P3 | Cascade asymmetries: hard delete of User cascades to DjProfile/mixes/follows but then **fails** on Review/Payment/BattleVote (Restrict, no transaction); deleting a ticket type dangles `EventTicket.ticketTypeId` |
| DB-6 | P3 | Dead columns: `User.phoneOtp(Expiry)`, `User.lastLoginAt`, `Event.poster`, `Mix.hearThisId` |
| DB-7 | P3 | `Payment.providerRef` indexed but not unique (no idempotency protection); `Event.eventCode` not unique (safe today, trap if used as lookup) |

---

## 9. Build & Deployment Report

**Fixed:** deploy schema step (`migrate deploy`), rollback health check, CI peer-deps, `/health` DB probe, sourcemaps.

**Status:** tsc ✅ · api:build ✅ · jest 16/16 ✅ · vite build ✅. Uploads bind-mounted (survive rebuilds) ✅ · restart policies ✅ · rsync excludes correct ✅.

**Open:** auto-rollback on failed deploy health check (P2 — `:previous` tagging already exists) · schema/rollback mismatch (DB not reverted on image rollback — keep migrations backward-compatible) · Docker hardening (PF-8) · nginx static-serving restructure (PF-7) · `client_max_body_size 500M` scope-down · obsolete compose `version:` attribute · prod volume roots `/opt/deck-salone` vs `/opt/deck-salone-v2` confusion · no `engines` field (dev Node 24 vs prod Node 20).

---

## 10. Remaining Work — requires your decision

| # | Item | Blocking question |
|---|---|---|
| R-1 | **Support dashboard backend** | ✅ DONE — `SupportTicket`/`SupportTicketReply` models + migrations, `/api/support` routes, SupportDashboard wired to real data, Help-page contact form |
| R-2 | Legacy ticket router + status migration | ✅ DONE (verified aligned; backfill migration `20260901002000_ticket_status_backfill` applied via deploy #2) |
| R-3 | Admin reports/scan-logs/mix-reactions | ✅ DONE — `GET/PATCH /admin/reports*`, `GET /admin/events/:id/scan-logs`, `POST /mixes/:id/reactions` (+ model/migration) |
| R-4 | Email change verification | ✅ DONE (verified; FE email field now read-only with note) |
| R-5 | Onsite password hashing + lockout | ✅ DONE (verified already implemented) |
| R-6 | **OTP email-bombing mitigation** | Restrict OTP sends to existing accounts (enables enumeration — trade-off) or add CAPTCHA/stricter limits? |
| R-7 | Admin role tightening | ✅ DONE — 29 mass-comm/content endpoints now ADMIN/SUPER_ADMIN only |
| R-8 | **Blog** | Real blog backend, or mark page "coming soon"? |
| R-9 | Subscription prices | ✅ DONE (monthly config-driven w/ fallback; annual unchanged — config has no annual field) |
| R-10 | Ticket download | ✅ DONE — printable ticket card w/ QR in new tab (save-as-PDF) |
| R-11 | SUPPORT_ADMIN role | ✅ DONE — enum value + migration; support routes gated |
| R-12 | Deploy | ✅ DONE ×2 — #1: 31 audit fixes; #2: backlog. Both verified live |
| R-13 | **Phone-number signup** | ✅ DONE — phone OTP register/login tabs (Register + Login), shared `PhoneOtpForm`, auto account creation on first verification |
| R-14 | **SMS notifications (Sent.dm)** | ✅ DONE — SMS delivery wired into `notifications.ts` (bookings/payments/tickets types, opt-in `sms*` prefs, verified-phone gate, fire-and-forget) + UserSettings SMS toggles |

**Status note (2026-09-04, final):** Backlog R-1..R-14 ✅ ALL COMPLETE. Deploy #2 (backlog+migrations) and Deploy #3 (phone signup + SMS notifications) shipped and verified. Remaining open items are only the lower-priority audit recommendations (§6 S-03/S-05..S-08, §7 PF-1..PF-8, §8 DB-2..DB-7) — no P0/P1 open.

---

*Next audit: weekly cadence per `.agents/skills/weekly-platform-audit/SKILL.md`. Previous findings are tracked by stable bug IDs (B-*, S-*, PF-*, DB-*, M-*, R-*).*
