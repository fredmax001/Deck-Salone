# Deck Salone — Production-Readiness Report (Sections A–K)

Full per-finding detail lives in the numbered FINDINGS files. This report is the synthesis.

---

## A. Critical findings (4)

| ID | Issue | One-line impact | Effort |
|---|---|---|---|
| UPL-1 | Paid/exclusive mix audio fetchable unauthenticated via raw `audioUrl` + public `/uploads` mount | The entire monetization gate is bypassable theater; bulk download of the paid catalog | M–L |
| SOC-1 | Public DJ endpoints return full `djProfile` rows (ID doc URLs, legal name, payout method) | Mass PII/financial breach of every DJ; regulatory exposure | S |
| RANK-1 | Anonymous play-count increments, 20/min/mix/IP, no dedup | One script falsifies the entire leaderboard economy (rankings, battles, trending, discovery) | M |
| DB-1 | `EventTicket.idempotencyKey` has no migration | Non-reproducible prod DB; fresh deploys break; symptom of `db push` drift (INFRA-7) | S |

All four are **statically confirmable** and independently exploitable today.

---

## B. Security assessment

**Overall posture: mixed.** The codebase shows real security competence in places — bcrypt(12) with hash migration, hashed single-use reset tokens, Redis-backed OTPs with attempt caps, zod whitelisting on (nearly) every Prisma write, HS256 pinning, boot-time secret validation, ownership checks on most user-scoped resources, helmet, layered rate limiting. But the gaps are severe and concentrated in exactly the areas that matter most:

1. **Confidentiality of PII and paid content is broken at the API-contract level.** The recurring pattern is Prisma `include`/`return ok(res, row)` returning *entire* rows (SOC-1/2/3/4/5, ETK-1/2, UPL-1). There is no response-shape discipline anywhere; dozens of endpoints over-return. This is the single highest-leverage fix class in the codebase: introduce shared public-field `select`s.
2. **The authorization model is flat where it matters.** One router-level `requireRole` gate hands FINANCE/VERIFICATION admins private messages and ID documents (ADM-3); there is no role hierarchy protecting SUPER_ADMIN (ADM-1/AUTH-7); moderators can unban users (MOD-1); a Pro subscription is a cross-event guest-list reader (ETK-2).
3. **Race conditions and non-idempotent money/award paths** (PAY-1/2/5, RANK-5/10, TKT-1/2, BKG-2) — read-then-act patterns throughout, no conditional writes, no unique constraints where code assumes them.
4. **Input-boundary weaknesses**: open SSRF proxy (INFRA-5/UPL-4), arbitrary file deletion via path traversal (UPL-3), HTML injection into notification emails (SOC-8), unvalidated admin-action strings (MOD-2), free-text status fields (EVT-3, DB-10).
5. **Supply chain / config**: committed DB credentials (INFRA-1), root container (INFRA-2), SIGTERM swallowed (INFRA-4), plaintext prod secrets on disk (MOB-5), cleartext-enabled APK (MOB-1).
6. **What's genuinely good:** no mass-assignment, no hardcoded JWT fallback, no secrets in the client bundle, no classic upload write-path traversal, PayPal capture design is sound, atomic ticket-inventory guard exists on the main path.

**Verdict: not production-safe for PII or paid content in the current state.** The CRITICAL+HIGH set (~38 findings) must land before a public launch can be considered hardened.

---

## C. Architecture assessment

- **Monolith Express + Prisma + Postgres + Redis**, clustered via `cluster.ts`, deployed as a single Docker container behind nginx. Reasonable for the current scale; the audit found no architectural necessity for microservices.
- **Strengths:** clear route/modular layout (34 route modules, service layer for the two most complex domains), middleware composition (`authMiddleware`/`requireRole`/`softAuthMiddleware`) applied consistently, background jobs isolated in `jobs/`, shared utils well-factored (slug, pagination, response, rateLimiter with Redis+memory fallback).
- **Weaknesses:**
  - **Two notification systems** (real `Notification` model vs synthetic feed in `users.ts`) that disagree; read-state is fake (SOC-16). Consolidation needed.
  - **Three competing price sources** (PAY-4) and **two scoring paths** that persist different values (RANK-8/9/11) — no single source of truth for business rules.
  - **In-memory state** in several hot paths (auth lockouts, PayPal token, caches, metaCache) that silently breaks under multi-replica deployments (AUTH-3, PAY-11, INFRA-14).
  - **Scheduler design** runs full-table backfills inline, has a broken stop guard, and no distributed lock (RANK-13/15, INFRA-18).
  - **Mixed storage backend** (local disk vs S3 decided at runtime in `utils/storage.ts`) with URL formats leaking backend choice into clients — the UPL-1 fix should consolidate on authorized streaming endpoints regardless of backend.
  - **Legacy surface** (`tickets.ts`, `launcher.js`, port 5002 scripts) duplicates newer implementations and drifts (TKT-1/2).
- No event-driven decoupling; emails/notifications fire synchronously inside request handlers (SOC-7/9/17 spam amplification is partly caused by this).

---

## D. Database assessment

- **Schema is broadly well-modeled** (46 models, proper relations, good index coverage from the phase-2 index migration) but has systemic integrity gaps:
  - **Float money everywhere** (DB-2) — the largest long-term integrity risk.
  - **Free-text status fields** (DB-10) with in-repo evidence of drift (a whole migration exists just to repair status values).
  - **Missing unique constraints where code assumes them** (DB-1, DB-6, DB-7).
  - **Destructive lifecycle design**: purge deletes the financial ledger (DB-3), booking deletion cascades payments (DB-19), audit logs cascade with their actor (DB-8), and the purge itself dead-locks on support tickets (DB-4).
  - **Dangling string FKs** (DB-9) — `Payment.djId` has no relation at all.
- **Migration hygiene is the most dangerous area**: hand-edited `IF NOT EXISTS` migrations, a non-idempotent `ALTER TYPE ... ADD VALUE`, trigram indexes invisible to the schema, and `db push --accept-data-loss` in the deploy script (INFRA-7). The combination means prod and fresh-migration environments can silently diverge (DB-1 proves it already has).
- **Retention**: insert-only tables grow unbounded (DB-18); purge + re-register trial farming (PAY-7).

---

## E. Performance assessment

- **Hot-path problems:**
  - Per-play full-table `COUNT(*)` + profile write on every play (RANK-3) — O(N²) amplification on the hottest endpoint.
  - `GET /conversations` N+1 with unbounded partners (SOC-18).
  - `/api/campaigns/stats` loads entire tables for city counts (SOC-23).
  - In-memory 300 MB upload buffering × N cluster workers (UPL-5, INFRA-14/15).
  - Full leaderboard + full discovery backfill on every boot, 100-wide unbounded `Promise.all` write bursts (RANK-15).
- **Pagination discipline** is generally good (clamped limits) except moderator list (MOD-5) and the rankings re-sort inconsistency (RANK-11).
- **Query-shape risk:** `contains`/`insensitive` searches rely on trigram GIN indexes added by hand — they exist, but are invisible to the schema (DB-11); any future index cleanup could drop them blind.

---

## F. Scalability assessment

- Current topology (single container, cluster workers, one Postgres, Redis for limiters/OTP/cache) scales to a few thousand daily users; the audit found the following ceilings:
  1. **Multi-replica unsafe**: in-memory limiter/lockout/caches (AUTH-3, INFRA-14), cron jobs without distributed locks (RANK-13), PayPal token per-process (PAY-11), uploads on a bind-mounted host volume (no shared storage for >1 node).
  2. **DB connection ceiling**: each cluster worker opens its own Prisma pool with no `connection_limit` (DB-20); vertical scaling worsens this (INFRA-14).
  3. **Hot rows**: `djProfile.monthlyListeners` written on every play (RANK-3) and battle close paths (RANK-5) will contend.
  4. **Media serving**: audio served through the Node process / public static mount — no CDN, no signed URLs, no range-optimized object storage (UPL-1/8). This is the first true scale wall.
- **Path**: fix the multi-replica blockers (Redis-everything, cron locks, shared/S3 storage) *before* horizontal scaling; otherwise scaling multiplies the race conditions instead of capacity.

---

## G. Missing features (security/ops-relevant gaps)

1. **Token revocation & session management** (AUTH-1): no logout, no per-user token invalidation.
2. **PayPal webhooks for refunds/disputes/reversals** (PAY-3): money events after capture are invisible.
3. **Rate limiting on**: reports (SOC-7), analytics beacon (SOC-10), developer apply (SOC-17), messaging (SOC-9), subscription-proof uploads (PAY-8), SMS OTP per-phone cooldown (AUTH-15).
4. **Real notification read-state + consolidation** of the two notification systems (SOC-16).
5. **Referral system server-side implementation** (PAY-6) — currently dead code paths that admins believe work.
6. **Ticket transfer endpoint** — absent entirely (documented expectation, not an audit finding).
7. **Automated backups** (INFRA-6) and **log rotation** (INFRA-13).
8. **CI test gate** (INFRA-10) — `test` script doesn't even exist.
9. **Force-update capability for the APK** — version check is advisory (MOB-8).
10. **Health checks beyond `/health`** (no readiness vs liveness distinction; no DB-migration check).

---

## H. Monitoring / DevOps assessment

- **Present:** request-ID tracing, per-request logging with durations, Prometheus `/metrics` (histograms), Discord webhook error alerts, DB-backed `/health` with prod compose healthcheck, request-logging of admin actions (partial), deploy.sh with pre-deploy backup + `:previous` rollback tag, rollback.sh.
- **Missing/broken:**
  - No automated DB backups (only predeploy dumps on the same disk) — INFRA-6; **restore has never been tested**.
  - No log rotation — disk-full risk (INFRA-13); winston logs bypass the mounted logs volume.
  - Scheduler logs to console, bypassing the log pipeline (INFRA-18).
  - No alerting on backup failure, cron failure, migration failure (container crash-loops silently).
  - No CI deploy (manual workstation deploys as root with `StrictHostKeyChecking=no`) — INFRA-12.
  - Error handler masks internals in prod (good) but Multer errors leak as 500s (UPL-12).
  - No secrets rotation process; prod secrets live in plaintext `.env` (MOB-5) and one committed compose file (INFRA-1).

---

## I. Target production architecture (recommended)

**Keep the monolith.** Scale it deliberately:

```
                        ┌────────────────────────────┐
   Android/Web ──HTTPS──▶  Cloudflare (WAF, Turnstile,
   (Capacitor)           │  rate limit, TLS)          │
                        └──┬─────────────────────────┘
                           ▼
                   NGINX (edge: static assets w/ immutable
                   cache, security headers, body limits,
                   per-location rate limits)
                           ▼
              Deck Salone API container ×N replicas
              (Express cluster → single-process-per-container
               × 2 replicas min; non-root; exec entrypoint)
                 │            │              │
           Prisma/Postgres  Redis         Object storage
           (managed or     (all limiters, (S3-compatible:
            tuned VPS,     OTP, cache,    private objects,
            PITR + nightly cron locks,    signed URLs for
            offsite dumps) tokenVersion)  audio/proofs)
                           │
                     node-cron jobs in a
                     single designated worker
                     (Redis-locked), plus
                     off-host backup cron
```

Key deltas from today: audio/proofs served via **authorized endpoints or signed URLs** (kills UPL-1/2/8); **Redis for every mutable limiter/lock**; **one migration path** (`migrate deploy` only); **nightly offsite backups with restore drills**; **CI-gated deploys**; **two API replicas** only after the multi-replica blockers (Section F) are fixed.

---

## J. 30-day roadmap (stop-the-bleeding)

**Week 1 — secrets & access:**
1. Rotate `soundit` DB password; scrub `docker-compose.homelab.yml` (INFRA-1); purge git history; rotate all `app/.env` secrets (MOB-5).
2. Phase 2 fixes: SOC-1/SOC-2/SOC-3/SOC-4/SOC-5/SOC-6 (response-shape PII), UPL-2 (static exposure), ETK-1/ETK-2 (hash + guest-list leaks), ADM-3 (role map), MOD-1 (status toggle).
3. Remove `db push --accept-data-loss`; author the DB-1 migration; verify prod index state (DB-1/INFRA-7).

**Week 2 — content & money gates:**
4. UPL-1 (authorized audio streaming + remove raw `audioUrl` from responses); UPL-3 (deleteFile containment + avatar validation); UPL-4/INFRA-5 (SSRF proxy allowlist).
5. PAY-1 (approval idempotency), PAY-4 (single price source), PAY-10 (revenue status constant), PAY-2 (capture race).
6. RANK-4 (battle mixId ownership), RANK-10 + DB-6 (RankingHistory unique), RANK-5 (battle close atomicity).

**Week 3 — auth integrity:**
7. AUTH-1 (tokenVersion + revocation), AUTH-2 (lockout DoS), AUTH-5 (Turnstile fail-closed), AUTH-6 (unify password change).
8. SOC-7/10/17 + PAY-8 + AUTH-15 (rate limiting gaps); SOC-8 (email HTML injection); SOC-9 (allowMessages enforcement).
9. RANK-1 (play-count integrity: dedup + authenticated ranking input) — biggest single anti-fraud item after week 1.

**Week 4 — deploy/runtime:**
10. INFRA-2/4 (non-root + exec entrypoint), INFRA-3 (graceful shutdown), INFRA-6 (nightly offsite backups + one real restore test), INFRA-13 (log rotation), INFRA-10 (CI test gate).
11. DB-4 (purge stuck on support tickets) — one-liner that unblocks the purge queue.

Exit criteria: all CRITICAL+HIGH findings fixed or explicitly risk-accepted; backup restore tested; CI runs tests; `migrate deploy` is the only schema path.

---

## K. 90-day roadmap (consolidation & scale)

**Month 2 — correctness & trust:**
- DB-2 (money → integer minor units) with a full reconciliation pass; DB-10 (status enums); DB-6/7/9/19 (constraints & relations); DB-11 (migration hygiene + drift CI gate).
- PAY-3 (PayPal refund/dispute webhooks); PAY-6 (real referral tracking with anti-fraud); PAY-7 (trial farming resistance).
- RANK-2/3 (monthly listeners: distinct counts + cron-based recompute); RANK-6/7/8/9/11 (battle & leaderboard score consistency); DB-6 (done in month 1) verification.
- SOC-11/12/14/15/19 (IDOR/privacy/integrity batch); MOD-2/4, ETK-3/4/5/6/7, TKT-1/2, BKG-1 (state machines & atomic writes).
- Notification consolidation (SOC-16) + queue-based email/notification dispatch (decouple from request path).

**Month 3 — scale & operations:**
- Media architecture: S3-backed private objects + signed URLs + CDN; mix streaming endpoint with range support (kills UPL-8/9/10/11 for good).
- Multi-replica readiness: Redis-only limiters/caches, cron distributed locks (RANK-13/15), `connection_limit` tuning (DB-20), graceful shutdown complete (INFRA-3).
- Mobile hardening release: MOB-1/3 (manifest), MOB-2 (secure token storage), MOB-4 (one-time code deeplink), MOB-6/7/8.
- Observability: structured job logging (INFRA-18), backup-failure + cron-failure alerting, `/metrics` token hardening (INFRA-19), load-test gate in CI (Phase 3e baseline).
- Infra cleanup: homelab nginx fix (INFRA-8), trust-proxy exactness (INFRA-16), legacy script removal (INFRA-22), port standardization (INFRA-23), CI deploy with protected environments (INFRA-12).

By day 90 the platform should be: PII-disciplined at the API boundary, single-source-of-truth for money and scores, reproducible schema management, backed-up and restore-tested, horizontally scalable to 3–4 replicas, and mobile-hardened for a public Play Store push.
