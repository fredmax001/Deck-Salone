# Pre-Deployment Security Audit — 2026-09-08

Scope: Deck Salone production (`https://decksalone.com`, VPS 31.97.116.21, Docker).
Method: live probes against production + 3 parallel read-only code audits covering all 9 checklist items.

---

## Scorecard

| # | Checklist item | Verdict | Notes |
|---|---|---|---|
| 1 | Authorization / IDOR | **PASS w/ warnings** | No cross-user IDOR in any audited family. 3 admin routes were missing role checks — **fixed & deployed** (commits dd9a86b). Business-logic gap in booking status/deposit remains (see gaps). |
| 2 | Password reset tokens | **PASS** | 256-bit random, SHA-256 hashed at rest, 15-min TTL, single-use, invalidated on re-request, enumeration-resistant, rate-limited. One log-leak path **fixed** (4416f2a). Sessions not revoked on password change (7-day JWT) — see gaps. |
| 3 | Input validation / SQLi / XSS | **PARTIAL** | Zod on all public write paths. Raw SQL all parameterized except discovery-score job (internal values only). Stored-XSS vector in OG pages **fixed** (e05487d). Admin/DJ write endpoints lack zod (moderate). |
| 4 | CORS | **PASS w/ action** | No wildcard; explicit origin list; dev origins gated by NODE_ENV. BUT production `FRONTEND_URL` includes `http://localhost:3000,http://localhost:5173` — remove them from the VPS `.env`. |
| 5 | Rate limiting | **PASS (verified live)** | Login: 5 attempts → HTTP 429 confirmed by probing production. express-rate-limit in place. |
| 6 | Error handling | **PASS w/ warnings** | Global handler hides stack traces outside development (verified: clean JSON 404/500, no leaks). `asyncHandler`/per-route try-catch paths bypass `SystemErrorLog` (observability gap, not a leak). |
| 7 | DB indexes | **PARTIAL** | Hot paths (notifications, tickets, mixes, messages) indexed. Missing: `Message(receiverId, readAt)` composite; some redundant single-column indexes. Revisit with EXPLAIN under real load. |
| 8 | Logging & monitoring | **FAIL (the weak item)** | Winston logs console-only (no durable ship); 5xx persisted to `SystemErrorLog` DB table but only visible to admins in-app; **zero external uptime alerting** — nobody is paged if the site dies; Prometheus metrics exported but never scraped. |
| 9 | Rollback strategy | **FAIL (code-only)** | `deploy.sh` tags `:previous` image, `rollback.sh` restores it — but **no DB rollback**: `prisma db push --accept-data-loss` is forward-only with no pre-deploy backup. A bad schema deploy is unrecoverable. Migrations exist but are bypassed. Rollback untested; only 1 level of image history. |

**Fixed during this audit (committed `dd9a86b`…`4416f2a`, deploy in progress):**
1. Admin role checks on `/dispatch-bug-report`, `/nudge-incomplete-profiles`, `/profiles/nudge` (any authenticated user could trigger mass emails)
2. Stored XSS in public OG redirect pages (`og.ts` — unsanitized `url`/`image`)
3. Password-reset token leak to logs when SMTP unconfigured (no env guard)

---

## Remaining gaps, prioritized

### Do this week
1. **Remove localhost origins from production `FRONTEND_URL`** in `/opt/deck-salone-v2/app/.env` (`http://localhost:3000,http://localhost:5173`), then recreate the API container.
2. **Pre-deploy DB backup**: add `pg_dump` (cron or deploy.sh step) to `/opt/deck-salone/backups/` with retention, before any `prisma db push`. This is the single biggest deploy risk.
3. **Free uptime monitoring**: UptimeRobot or Better Stack pinging `https://decksalone.com/health` every 5 min (free tier; emails you on outage). No account changes needed on the VPS.

### Do this month
4. **Booking status/deposit guard** (`routes/bookings.ts:444-492`): clients can currently drive `PENDING → CONFIRMED` and set `deposit` (no role guard, unlike `finalPrice`). Confirm intended flow, then restrict transitions/fields per role. **Money-path change — review before touching.**
5. **Session revocation on password change/reset**: add `tokenVersion` claim (or Redis denylist) so old 7-day JWTs die on credential change.
6. **Externalize admin validation**: zod schemas for the raw-`req.body` admin/DJ write endpoints (broadcast, battle create, payout method, availability).
7. **Durable logs**: file transport + rotation on the existing `/app/logs` volume, or ship to a free log tier.

### Backlog
8. Parameterize `jobs/recalculateDiscoveryScores.ts` raw SQL (safe today — internal values only).
9. Route-level auth mounting hygiene: global `authMiddleware` on `/api/users`, `/api/mixes`, `/api/djs`, `/api/bookings`, `/api/payments` with an explicit public-read exemption list, so a future route can't be accidentally public.
10. bcrypt cost 10 → 12 on `PUT /users/password` (register path already uses project policy).
11. Onsite staff tokens: issue 12h TTL instead of inheriting the 7-day JWT TTL.
12. Keep N tagged Docker images (not just `:previous`); run a rollback drill.
13. Add `@@index([receiverId, readAt])` on `Message`; drop redundant single-column indexes.
14. Move login lockout state from in-memory to Redis (multi-instance durability).
