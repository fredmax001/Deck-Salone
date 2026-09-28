# Phase 2 Fix Log

Branch: `hardening/phase-2` (root repo + `app` submodule; all code fixes in the submodule).

## Pre-flight
- `app` WIP commit: `6876ec1` — pre-existing in-flight work (20 files), committed as requested before branching. A repo hook auto-pushed `main` to origin on commit (not an explicit push by the agent).
- Root WIP commit: `c15b3ee` — build scripts + submodule pointer sync.
- Baseline: 25 tests pass; api tsc clean.

## Fixes (finding → commit → verification)

| # | Finding(s) | Commit (app unless noted) | What changed | Verified by |
|---|---|---|---|---|
| 1 | SOC-1/2/3/4/5/6 | `463b057` | Shared `DJ_PROFILE_PUBLIC_SELECT`; isPublic guards; userId fallback dropped; email/location stripped from followers, messages, notification feed, discover search | 13 new response-shape tests (jest); tsc api+client |
| 2 | ETK-1/2 (+TKT-3 PII part) | `41e8d14` | `onsitePassword` stripped at all event response boundaries; `canReadGuestList` (owner/staff/admin) split from scan capability; legacy tickets.ts Pro shortcut removed | 6 new ticketing tests; jest; tsc |
| 3 | ADM-1/2/3, MOD-1, AUTH-7 | `882d507` | SUPER_ADMIN target guards; ADMIN grants only by SUPER_ADMIN; per-route gates (/messages, /users, /payments, /campaigns); suspend toggle ADMIN-only | 11 new admin-authz tests; jest; tsc |
| 4 | UPL-3/4/10, INFRA-5 | `04ce7c4` | deleteFile containment + keyFromUrl sanitization; avatar URL validation; imageProxy allowlist + private-IP DNS rejection + 5MB cap + no redirects; download-file containment separator | 42 new upload-security tests; jest; tsc |
| 5 | UPL-1 (CRITICAL), UPL-2, UPL-8 | `ffce332` | `GET /api/mixes/:id/audio` authorized streaming (exclusive gated via checkDownloadAccess); all responses rewrite local audioUrl; `/uploads/mixes/*` hard-404; documents/proofs/tickets staff-gated (buyer/organizer for tickets); directAudioUrl removed | 17 new audio-gating tests; jest; tsc api+client |
| 6 | SOC-7/8/9/10/17, ETK-8, PAY-8 | `7a7394a` | reportLimiter 5/h + details≤2000; emails text-only; allowMessages enforced 403 + messageLimiter; analytics limiter + path≤500; developer limiter 3/h; CSV formula escape; purchase limiters + duplicate-check-before-upload | 9 new abuse-control tests; jest; tsc |
| 7 | RANK-1 (CRITICAL), RANK-2/4/5/10, DB-6 | `52e1f34` | 24h play dedup; anonymous plays skip MixPlay/ranking paths; distinct-listener counting excl. self-plays; battle mixId ownership; atomic battle close; RankingHistory @@unique + dedup-delete migration (`ranking_history_djId_week_key`; rollback DROP INDEX) | 11 new ranking tests; jest; tsc; prisma validate/generate; migration functionally validated on scratch PG18 |
| 8 | PAY-1/4/2/10 | `ba4e681` | Atomic approve/reject claims (409 on re-process); `getSubscriptionConfig()` single price source (+annual, DB/env-overridable); 422 capture conditional FAILED; revenue aggregates CAPTURED | 9 new payment tests; jest; tsc |
| 9 | AUTH-1/2/5 | `741aac1` | User.tokenVersion in JWT + verified in auth middleware; bumped on password change/reset (cache invalidated); lockout strictly per email:ip; Turnstile fail-closed in prod + rightmost XFF | 11 new auth-lifecycle tests; jest; tsc; prisma validate/generate |
| 10 | INFRA-2/3/4/6/7, DB-1 (CRITICAL), DB-4 | `d45e991` (app) + `cb4ee42` (root) | Non-root container + exec entrypoint; graceful shutdown (server.close + timer cleanup); scripts/backup.sh (30-day retention, opt-in offsite); deploy.sh migrate-deploy-only; idempotent idempotencyKey migration (rollback: drop index+column); purge deletes support tickets first | 11 new infra-drift tests; jest; tsc; prisma validate; shell syntax checks |
| 11 | MOB-1/3/6/7 | `cf79864` | cleartext off (tools:replace merger fix); allowBackup=false; allowNavigation trimmed; dev-only auth logging | gradle manifest merger PASS (false/false in merged manifest); client tsc; jest |

## Totals
- **165 tests passing** (25 baseline → 165; 140 new regression tests across 10 new suites), 15 suites.
- Every commit: `npx jest` all-pass + `tsc --noEmit` (api, and client where touched).
- Two migrations (hand-written, idempotent, with rollback SQL recorded): `20260928120352_add_ranking_history_unique_dj_week`, `20260928130000_add_user_token_version`, `20260928140000_add_event_ticket_idempotency_key`.

## Phase 3 additions (2026-09-28)

| Batch | Finding(s) | Commit | What changed |
|---|---|---|---|
| 3a-adversarial | review of all phase-2 fixes | — | 4 parallel reviewers; 2 CRITICAL + 3 HIGH breaks found and fixed below |
| A | UPL-1b/ADM-2b (CRITICAL), A3/A4/A5 (HIGH), A6/A7 | `60b5eb2` | static-gate decode+normalize closed (`/uploads/./mixes`, `%2f` traversal); ADMIN self-grant SUPER_ADMIN closed; withAuthToken same-origin only; getClientIp for dedup/lockout/analytics + trust proxy 1; PAY-5 deposit TOCTOU closed; smartPlaylists rewrite; PAY-2 422 self-heal via PayPal order verify |
| B | ADM-3/5, ETK-1/2, AUTH-1/5 residuals | `fabe88f` | per-route gates on 11 admin routes; /notifications counts-only; onsitePassword never returned (onsitePasswordSet boolean); scan responses redact attendee email; /customers gated by canReadGuestList; cache invalidation awaited + suspend invalidates; ?token= paths enforce tokenVersion; Turnstile fails closed unless dev/test |
| C | RANK-1b/5b, C3-C6 | `5e2c580` | anonymous plays recorded again (monthlyListeners counts authenticated only); battle close atomic; moderator RankingHistory week + logged; hall-of-fame absolute value (client updated); CSV whitespace bypass + 10k row cap; /ticketing/dashboard 500 fixed |
| D | UPL-12, INFRA-18, RANK-13 + 3b/3d | `e6b52cc` | MulterError→413/400; token redacted in logs; no-store on gated uploads; Referrer-Policy; /health/readiness; scheduler winston + real stop; uploadLimiter 30/10min + audioLimiter 120/min |
| 3c | INFRA-6 (prod) | server-side | nightly backup cron installed on VPS (dump + uploads tar, 30/7 retention); **restore test PASSED** (counts identical); Postgres/Redis firewall closed to internet (`pg-firewall` systemd unit); docs: `50-RESTORE-PROCEDURE.md` |
| 3e | load test | docs only | `51-LOAD-TEST.md` — 10 endpoints, zero 5xx at 20 conns; home-board is the perf outlier; media is bandwidth-bound → CDN case |

**Final test count: 18 suites / 246 tests, all passing. Full production build green.**

## Phase 4 additions

| Item | Commit | Note |
|---|---|---|
| DB-3 retain financial ledger | `1ee5730` | Payment/PayPalPayment/PayoutRequest SetNull FKs + nullable PII cols; purge anonymizes; migration + rollback; prod constraint check required pre-deploy |
| INFRA-1 credential scrub | `9c7e4e3` (root) | compose uses ${DATABASE_URL} interpolation; 👤 rotate + history purge |
| Delivery docs | root | `60-FINAL-REPORT.md` (per-finding status), `70-BACKLOG.md`, `80-HUMAN-TESTING.md`, `90-RUNBOOK.md` |

## Not verified locally (needs running env / user action)
- Docker build + runtime as non-root (no docker daemon) — host bind mounts need `chown -R 100:101 /opt/deck-salone` before deploy.
- Migrations applied to a live DB (`migrate deploy` on staging/prod).
- Backup script execution + offsite config; restore test (Phase 3c).
- INFRA-1 / MOB-5 credential rotations — user action checklist in Phase-2 report.
- APK on real devices; Play Store flow.
