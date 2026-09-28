# Findings & Checks That CANNOT Be Confirmed by Static Analysis

Everything below requires a **running environment**, **real traffic**, or a **human pentest**. Static analysis either cannot confirm the finding, or cannot confirm its impact. Items are grouped by how to verify.

## 1. Deployment-topology-dependent (need the live VPS / container state)

| Ref | Question to verify | How |
|---|---|---|
| AUTH-3 | Is the lockout `Map()` actually multi-replica-broken in prod? How many API replicas run? | `docker ps` / compose ps on the VPS; check cluster worker count |
| AUTH-15 | Real SMS cost-abuse exposure: Sent.dm pricing, current monthly OTP volume | provider dashboard |
| RANK-13/15 | Do cron jobs double-fire (multi-instance) or collide with boot backfill? | job logs on server; observe ranking history duplicates over a week |
| RANK-16 | Is `NODE_ENV` actually set in the deployed container? (If not, play/search limiting is off for private-IP clients.) | `docker exec deck-salone-api env \| grep NODE_ENV` |
| INFRA-5 | Does the SSRF proxy reach cloud metadata / internal services from the live host? (Static analysis says unguarded; exploitability depends on network layout — e.g. is it AWS/GCP/DigitalOcean, is metadata reachable?) | authorized pentest from outside: `GET /api/proxy-image?url=http://169.254.169.254/...` and internal host probes |
| INFRA-16 | Real client-IP integrity behind nginx: does `trust proxy: true` allow XFF spoofing into audit logs? | send crafted XFF header through nginx, check `SystemErrorLog.ipAddress` |
| DB-17 | Actual query-plan impact of the missing indexes (`PayPalPayment.status`, `Popup` window, `MixPlay.userId`) | `EXPLAIN` on prod-analog data; pg_stat_statements review |
| DB-1 | What does the **production** DB actually contain for `event_tickets.idempotency_key`? | `\d event_tickets` on prod — determines whether the fix is "add migration" or "add migration + reconcile" |
| MOB-5 | Are the plaintext `.env` secrets also baked into any image/backup/artifact? | inspect Docker build context, image layers (`docker history`), VPS dotfiles |

## 2. Concurrency / race conditions (code-confirmed patterns, real-world triggering unproven)

| Ref | Race | Note |
|---|---|---|
| PAY-2 | Capture 422 overwriting `CAPTURED` → `FAILED` | Pattern is provable from code; real trigger needs concurrent captures of one order |
| PAY-5 | Double deposit/full-payment charge | Same |
| RANK-5 | Double battle close → double badges | Same |
| RANK-3 | Concurrent plays regressing `monthlyListeners` | Same |
| TKT-1/BKG-2 | Legacy ticket oversell; booking slot double-book | Same |
| PAY-1 | Double-approve stacking months | Statically provable guard absence; observed damage requires admin behavior |

## 3. Behavior under load (needs Phase 3e load testing)

- Rate-limiter behavior at the edge and app layers: burst handling, Redis failover to memory fallback, effective limits under cluster workers (INFRA-14).
- Play-limit effectiveness against distributed play-farming (RANK-1 interim controls).
- Upload memory ceiling: how many concurrent 300 MB uploads OOM the container (UPL-5/INFRA-15).
- p95 latency of the top-10 endpoints at 10× current traffic (Phase 3e target).

## 4. Human pentest items (application security review)

1. **IDOR sweep** beyond the audited spots: fuzz object IDs across *all* endpoints returning single resources (bookings, campaigns, sets, playlists, opportunities, payouts) — audit covered code paths read; a pentest covers what was missed.
2. **Stored XSS in the web client**: the audit verified server-side escaping in og.ts and email templates, but did **not** audit React output encoding across `app/src` for fields like mix titles, DJ bios, gig descriptions, chat content (rendered as HTML anywhere? `dangerouslySetInnerHTML` audit needed).
3. **Auth flows end-to-end**: OAuth state validation under attack, reset-token entropy in practice, OTP timing windows, the deeplink token-injection path on a real device (MOB-4).
4. **SSRF chain validation** (see §1 INFRA-5) including redirect-following to internal hosts.
5. **Upload abuse on a running instance**: polyglot payloads through the unvalidated gallery/proof paths (UPL-6/7) against a real nginx + static mount; content-type sniffing behavior of the deployed nginx.
6. **Ranking manipulation live**: validate that interim RANK-1 controls actually hold against a motivated attacker with rotating IPs/accounts.
7. **Replayed referral calls** — currently unimplemented (PAY-6), re-test after implementation.
8. **Gig clientToken** bearer endpoints — no rate limit observed (DB-15 note); confirm abuse windows live.

## 5. Real-device / store requirements (cannot be done from code alone)

- APK behavior on real devices: cleartext blocking after MOB-1 fix, backup rules after MOB-3 fix, deeplink flows after MOB-4 fix, push-notification behavior after SOC-14 fix.
- Play Store pre-launch report + policy review (PII declarations given SOC findings).
- Google OAuth verification (scopes, branding) once AUTH-10 fix lands.

## 6. Infrastructure / restore validation

- **Backup restore test** — Phase 3c requires one real restore into a scratch DB; until then, "backups exist" is unverified (and backups currently only run during manual deploys — INFRA-6).
- **Rollback drill** — `rollback.sh` has never been exercised against a live deploy (verify `:previous` tag behavior).
- **Migration replay** — build a fresh environment purely from `prisma/migrations` and diff against prod schema (validates DB-1 class drift comprehensively).

---

**Rule reminder:** anything in this file must not be reported as "secure" until its check passes. Mark each as PASS/FAIL with evidence when verified.
