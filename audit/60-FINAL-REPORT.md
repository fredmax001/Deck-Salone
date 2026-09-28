# FINAL AUDIT REPORT — with Fix Status per Finding

**Date:** 2026-09-28 · **Branch:** `hardening/phase-2` (17 commits in `app` submodule + 4 in root repo) · **Test state:** 18 suites / 246 tests, all passing; full production build green.

**Status legend:** ✅ FIXED (commit) · 🔶 PARTIAL (residual in backlog) · 📋 BACKLOG (not started, prioritized in `70-BACKLOG.md`) · 🔀 DEFERRED (explicit phase decision) · 👤 USER-ACTION

> Full per-finding detail (code quotes, exploit scenarios) remains in the domain files `10-`…`18-FINDINGS-*.md`. This table is the closeout status.

## CRITICAL (4) — all FIXED

| ID | Status | Fix |
|---|---|---|
| UPL-1 paid audio unauthenticated | ✅ | `ffce332` authorized streaming + static gate; hardened `60b5eb2` (decode/normalize bypass) |
| SOC-1 DJ PII in public responses | ✅ | `463b057` shared public select |
| RANK-1 play inflation | ✅ | `52e1f34` dedup + auth-only ranking input; `60b5eb2` spoofable-IP break closed |
| DB-1 idempotencyKey no migration | ✅ | `d45e991` idempotent migration |

## HIGH (34)

| ID | Status | Fix / note |
|---|---|---|
| AUTH-1 token revocation | ✅ | `741aac1` tokenVersion; residuals closed `fabe88f` |
| AUTH-2 lockout DoS | ✅ | `741aac1` + spoofable IP closed `60b5eb2` |
| PAY-1 approval idempotency | ✅ | `ba4e681` |
| PAY-3 refund/dispute webhooks | 🔀 DEFERRED | needs PayPal portal config — Month-2 |
| PAY-4 price single source | ✅ | `ba4e681` — 👤 set annual config overrides + update Pricing.tsx |
| RANK-2 distinct listeners | ✅ | `52e1f34`, refined `5e2c580` |
| RANK-4 battle mix ownership | ✅ | `52e1f34` |
| RANK-5 battle close race | ✅ | `52e1f34` + crash-safe tx `5e2c580` |
| RANK-10 ranking history dupes | ✅ | `52e1f34` + migration |
| UPL-2 sensitive folders exposed | ✅ | `ffce332` + traversal hardening `60b5eb2` |
| UPL-3 arbitrary file deletion | ✅ | `04ce7c4` containment (cross-user avatar delete residual → backlog) |
| UPL-4/INFRA-5 SSRF proxy | ✅ | `04ce7c4` |
| ADM-1 no role hierarchy | ✅ | `882d507` + ADMIN-target guard `60b5eb2` |
| ADM-3 flat admin gate | ✅ | `882d507` + 11 more routes `fabe88f` |
| MOD-1 moderator unban | ✅ | `882d507` |
| ETK-1 staff password hash leak | ✅ | `41e8d14` + events.ts path `fabe88f` |
| ETK-2 Pro DJ guest-list harvest | ✅ | `41e8d14` + scan redaction `fabe88f` |
| SOC-2 private DJ profiles | ✅ | `463b057` |
| SOC-3 follower PII | ✅ | `463b057` |
| SOC-4/5 email leaks | ✅ | `463b057` |
| SOC-6 email enumeration | ✅ | `463b057` |
| SOC-7 report spam | ✅ | `7a7394a` |
| SOC-8 email HTML injection | ✅ | `7a7394a` (notifications); INFRA-21 bugReport variant 📋 |
| SOC-9 messaging abuse | ✅ | `7a7394a` |
| DB-2 float money | 🔀 DEFERRED | Month-2 with reconciliation plan |
| DB-3 purge destroys ledger | ✅ | `1ee5730` SetNull + anonymize |
| DB-4 purge stuck on tickets | ✅ | `d45e991` |
| INFRA-1 committed DB credentials | ✅ | `9c7e4e3` scrub; 👤 rotate password + purge git history |
| INFRA-2 root container | ✅ | `cb4ee42` (👤 chown 100:101 host dirs at deploy) |
| INFRA-4 SIGTERM swallowed | ✅ | `cb4ee42` exec entrypoint |
| INFRA-5 SSRF | ✅ | `04ce7c4` |
| INFRA-6 no automated backups | ✅ | `3edb3b9` — cron installed, restore-tested (`50-RESTORE-PROCEDURE.md`) |
| INFRA-7 db push --accept-data-loss | ✅ | `cb4ee42` |
| MOB-5 plaintext prod secrets on disk | 👤 USER-ACTION | rotate JWT_SECRET/Google/SMTP/TQR + DB password |

## MEDIUM — ✅ fixed (13)
AUTH-5 (`741aac1`+`fabe88f`) · PAY-2 (`ba4e681`+`60b5eb2`) · PAY-5 (`60b5eb2`) · RANK-13 stop guard (`e6b52cc`) · UPL-8 (`ffce332`) · SOC-10/17 (`7a7394a`) · SOC-11? no — see backlog · TKT-3 PII part (`41e8d14`) · EVT? none · C5 CSV (`7a7394a`+`5e2c580`) · INFRA-3 graceful shutdown (`d45e991`) · INFRA-15 limits (`e6b52cc`, memory-storage residual 📋) · SOC-20? no — backlog.

## MEDIUM — remaining (backlog, prioritized in `70-BACKLOG.md`)
AUTH-3 (Redis lockout store) · AUTH-4 (status checks at issuance) · AUTH-6 (unify password endpoints) · AUTH-8 (phone uniqueness) · AUTH-10 (Google verified flag) · AUTH-11 (onsite staff token revocation) · PAY-6 (implement referrals) · PAY-7 (trial farming) · RANK-3 (inline listener recount → cron) · RANK-6 (self-vote) · RANK-7 (frozen battle base score) · RANK-8/9 (score-path parity) · RANK-11 (rankings pagination re-sort) · RANK-12 (trending by raw plays + home-board caching — also the load-test perf outlier) · RANK-15 (boot backfill gating) · UPL-5 (memory upload storage) · UPL-6 (gallery filter) · UPL-7 (raw proof uploads) · UPL-9 (open redirect) · ADM-4 (audit-log gaps) · ADM-6 (verification-doc endpoint split) · MOD-2 (RESTRICT no-op) · SUP-1/2 · TKT-1/2 (legacy races) · ETK-3 (QR expiry) · ETK-4 (reissue resets checked-in) · ETK-5 (walk-in amount) · ETK-6 (guest-list capacity) · ETK-7 (undo-checkin) · EVT-1/2/3 · BKG-1 · GIG-1 · SOC-11 (sets IDOR) · SOC-12 (isPro self-assign) · SOC-13 (switch-to-dj) · SOC-14 (push-token hijack) · SOC-15 (profilePublic) · SOC-16 (notification read-state) · SOC-18 (N+1) · SOC-19 (review integrity) · SOC-20 (deletion country gate) · DB-5/7/8/9/10/11/17/18/19 · INFRA-8/9/10/12/13/14/15/17 · new adversarial items (grant-plan/promo idempotency, battle-enter TOCTOU, 403/404 oracle, X-Real-IP/nginx check, S3 public-read mode).

## LOW — remaining
All other LOW findings (see domain files) + INFRA-16 done (`60b5eb2` trust proxy 1) · UPL-12 done (`e6b52cc`) · UPL-14 📋 · AUTH-12/13/14/15/17 📋 · MOB-2/4 deferred (secure storage + one-time-code deeplinks) · MOB-8 📋.

## Standing-rule disclosures
- **Nothing was reported "secure" without evidence**; every `static: no` item is in `80-HUMAN-TESTING.md`.
- **One deploy-critical caveat:** prod DB has `db push` drift. Before the next deploy, compare prod constraint names against the three new migrations (`ranking_history` unique index, `users.tokenVersion`, `event_tickets.idempotencyKey`, `payments`/`paypal_payments`/`payout_requests` SetNull FKs) — the migrations are written idempotently where possible, but a prod state check is mandatory (procedure in `90-RUNBOOK.md`).
- **Git history still contains the old credentials** (`soundit:password` in history) — history purge requires a force-push decision (👤).
- One pre-existing functional bug (`/ticketing/dashboard` 500) was fixed in `5e2c580` beyond the flagged list — disclosed, not silent.
- Explore-agent provenance note: a portion of Batch A code first appeared as uncommitted working-tree changes made by an adversarial-review subagent that exceeded its read-only mandate; every line was re-verified against spec and gated before commit (`60b5eb2`).
