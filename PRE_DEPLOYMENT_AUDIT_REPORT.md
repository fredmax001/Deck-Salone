# Deck Salone — Pre-Deployment Security & Readiness Audit

**Date:** 2026-08-06  
**Scope:** Full-stack DJ platform (React + Express + Prisma + PostgreSQL + Redis)  
**Objective:** Verify the nine-item pre-deployment checklist, fix any gaps, and document remaining risks.

---

## Executive Summary

| Checklist Item | Status | Notes |
|---|---|---|
| 1. Authorization / ownership checks | ✅ Fixed | Private mix leak, draft event leak, booking-message bug, admin role gating all addressed. |
| 2. Password reset link expiry & single-use | ✅ Fixed | 15-minute TTL, hashed token, single-use, and now sends a branded reset link email. |
| 3. Input validation / SQLi / XSS | ✅ Fixed | Added Zod schemas, escaped email templates, restricted file uploads, no raw SQL. |
| 4. CORS locked to own domains | ✅ Fixed | Localhost origins no longer allowed in production; rejected origins are logged. |
| 5. Rate limiting | ✅ Fixed | General, auth, play, purchase, search, booking, vote limiters added. |
| 6. Error handling / no stack-trace leaks | ✅ Fixed | Route-level `error.message` leaks replaced with generic messages in production. |
| 7. Database indexes on hot queries | ✅ Fixed | Added 30+ targeted indexes and a Prisma migration. |
| 8. Logging & monitoring | ⚠️ Partial | Structured request logging exists; auth security events still partly on `console`. `/metrics` now protected. |
| 9. Rollback strategy | ✅ Fixed | `deploy.sh` tags previous image; `rollback.sh` added; health checks added. |

**Verdict:** The critical pre-deployment blockers have been fixed. Two medium items (log shipping and Redis-backed rate-limit store for multi-instance) remain as recommendations.

---

## 1. Authorization — Users Locked to Their Own Data

### Findings
- Most write endpoints correctly verified ownership via `req.user.id`.
- **HIGH:** `GET /api/mixes/:id` returned private mixes (`isPublic: false`) to anyone.
- **HIGH:** `GET /api/events?djId=...` skipped the `published` filter, exposing draft events.
- **MEDIUM:** `POST /api/messages` compared `booking.djId` (DJ profile ID) against user IDs.
- **HIGH:** All admin routes were accessible to every staff role (`ADMIN`, `MODERATOR`, `VERIFICATION_ADMIN`, `FINANCE_ADMIN`).
- **MEDIUM:** Several public endpoints returned other users' email addresses.

### Fixes Applied
- `app/api/routes/mixes.ts` — `GET /:id` now checks `isPublic` and allows only the owner or `ADMIN`.
- `app/api/routes/events.ts` — `GET /` now verifies owner/admin status before returning draft events.
- `app/api/routes/messages.ts` — participant check now compares against `booking.dj.userId`.
- `app/api/routes/admin.ts` — added per-route `requireRole(...)` restrictions:
  - `ADMIN` only: role change, status change, DJ delete, broadcast email, hall-of-fame, ranking edit, subscription-config update.
  - `ADMIN` or `FINANCE_ADMIN`: subscription payments.
  - `ADMIN` or `VERIFICATION_ADMIN`: verification requests.
  - `ADMIN` or `MODERATOR`: mix delete, DJ suspend.
- `app/api/routes/users.ts`, `djs.ts`, `reviews.ts` — removed reviewer/user email from public responses.

---

## 2. Password Reset Links Expire

### Findings
- Token TTL was 15 minutes, hashed, and single-use — correct.
- **CRITICAL:** Production reset email was broken: it sent the raw token through the OTP email template with no reset URL.

### Fixes Applied
- `app/api/utils/email.ts` — added `sendPasswordResetEmail()` with a branded HTML link, escaped values, and 15-minute messaging.
- `app/api/routes/auth.ts` — forgot-password endpoint now calls `sendPasswordResetEmail({ to, username, resetUrl })`.

---

## 3. Input Validation — SQL Injection and XSS

### Findings
- Prisma ORM used throughout; no raw string-concatenated SQL.
- **CRITICAL/HIGH:** Admin email templates interpolated user/admin strings directly into HTML.
- **CRITICAL/HIGH:** Event gallery and ticket-payment uploads accepted any file type.
- **HIGH:** `services: z.any()` in bookings allowed arbitrary JSON.
- **HIGH:** Several write endpoints destructured `req.body` without Zod schemas.

### Fixes Applied
- `app/api/utils/email.ts` — added `escapeHtml()` helper and applied it to all email templates (`sendOtpEmail`, `sendPasswordResetEmail`, `sendAdminEmail`, ranking, violation, suspension, birthday).
- `app/api/utils/upload.ts` — restricted `imageFileFilter` to `jpeg/jpg/png/webp/heic/heif`; SVG and `application/octet-stream` rejected.
- `app/api/routes/events.ts` — gallery upload now uses a strict JPG/PNG/WebP filter.
- `app/api/routes/eventTicketing.ts` — purchase screenshot upload restricted to JPG/PNG/WebP.
- `app/api/routes/bookings.ts` — `services` schema typed as `z.array(z.object({ name, price }))`.
- `app/api/routes/auth.ts`, `djs.ts`, `mixes.ts`, `events.ts` — added Zod schemas for `PUT /me`, verification request, Hearthis import, and sync-to-salone.

---

## 4. CORS — Locked to Own Domain

### Findings
- Origin was validated against `FRONTEND_URL`.
- **HIGH:** Localhost origins were unconditionally added to the allowlist, even in production.

### Fixes Applied
- `app/api/server.ts` — localhost origins are now added only when `NODE_ENV !== 'production'`.
- Added logging for rejected origins via `logger.warn`.

---

## 5. Rate Limiting

### Findings
- General limiter (300/15 min) and auth limiters existed.
- **CRITICAL:** `/api/mixes/:id/play` had no endpoint-specific limiter.
- **HIGH:** Ticket purchase endpoint had no limiter.
- **HIGH:** Public search/discovery endpoints relied only on the general limiter.

### Fixes Applied
- `app/api/utils/rateLimiter.ts` — added `playLimiter`, `purchaseLimiter`, `searchLimiter`, and `conditionalSearchLimiter`.
- `app/api/routes/mixes.ts` — `POST /:id/play` uses `playLimiter`.
- `app/api/routes/eventTicketing.ts` — `POST /purchase` uses `purchaseLimiter`.
- `app/api/routes/mixes.ts`, `djs.ts`, `discover.ts` — list routes use `conditionalSearchLimiter` when `?search` or `?q` is present.
- `app/api/routes/users.ts` — `/search` uses `searchLimiter`.

**Recommendation:** For horizontal scaling, configure `express-rate-limit` with a Redis store so limits are shared across instances.

---

## 6. Error Handling — Custom Error Screens

### Findings
- Global error handler correctly hid stack traces in production.
- **HIGH:** Many route-level `catch` blocks returned `error.message` in 500 responses.

### Fixes Applied
- Replaced `error.message` leaks with generic `'Internal server error'` responses across `auth.ts`, `users.ts`, `djs.ts`, `mixes.ts`, `events.ts`, `bookings.ts`, `discover.ts`, and `admin.ts`.
- Errors are still logged to the console/Winston for debugging.

---

## 7. Database Performance — Indexes on Hot Queries

### Findings
- Many indexes existed, but hot paths in admin dashboards, public listings, messaging, and ticketing were missing coverage.

### Fixes Applied
- `app/api/prisma/schema.prisma` — added 30+ targeted indexes on `User`, `DjProfile`, `Mix`, `Event`, `EventTicket`, `Booking`, `Message`, `Payment`, `Notification`, `ViolationReport`, `Opportunity`, `AdCampaign`, `DjSet`, and `MixComment`.
- Created migration `app/api/prisma/migrations/20260806000000_add_production_indexes/migration.sql`.
- Schema validated with `npx prisma validate`.

**Note:** Some redundant indexes remain (e.g., `User.email` already has a unique index). They can be removed in a later cleanup pass.

---

## 8. Logging and Monitoring

### Findings
- Winston structured logger exists; request logging with request IDs is implemented.
- `/metrics` was publicly exposed.
- Auth security events still partly used `console.warn/error` instead of the structured logger.

### Fixes Applied
- `app/api/server.ts` — `/metrics` now requires an internal IP or `METRICS_TOKEN` bearer token.

**Recommendations:**
- Replace remaining `console.*` calls in auth/admin paths with `logger.warn/error`.
- Add a file/shipper transport or external log aggregator (e.g., Datadog, CloudWatch, Loki).
- Add alerting on 5xx spikes, 401/403 bursts, and password-reset volume.

---

## 9. Rollback Strategy

### Findings
- **CRITICAL:** `deploy.sh` hard-coded the production root password.
- **CRITICAL:** `deploy.sh` ran `prisma db push --accept-data-loss` in production.
- No health checks, no rollback script, no previous-image tagging.

### Fixes Applied
- `deploy.sh` rewritten:
  - Server and credentials are now read from environment variables (`DECK_SALONE_SERVER`, `DECK_SALONE_SSH_KEY`, `DECK_SALONE_SSH_PASS`).
  - Uses SSH key auth by default; `sshpass` only as fallback.
  - Tags the current image as `deck-salone-api:previous` before rebuilding.
  - Runs `prisma migrate deploy` instead of `db push --accept-data-loss`.
  - Syncs `prisma/migrations/` to the server.
  - Performs a `/api/health` check before declaring success.
- `rollback.sh` created — reverts to `deck-salone-api:previous` and runs a health check.
- `docker-compose.prod.yml` — added API healthcheck.

**Recommendations:**
- Store credentials in a password manager or CI/CD secrets, never in the repo.
- Set up a CI/CD pipeline so images are built once and pulled by the server.
- Consider blue-green or canary deployments once traffic justifies it.

---

## Files Changed

### Security & Authorization
- `app/api/routes/auth.ts`
- `app/api/routes/mixes.ts`
- `app/api/routes/events.ts`
- `app/api/routes/messages.ts`
- `app/api/routes/admin.ts`
- `app/api/routes/users.ts`
- `app/api/routes/djs.ts`
- `app/api/routes/reviews.ts`
- `app/api/utils/email.ts`
- `app/api/utils/upload.ts`
- `app/api/utils/otp.ts`

### Rate Limiting & CORS
- `app/api/server.ts`
- `app/api/utils/rateLimiter.ts`
- `app/api/routes/eventTicketing.ts`
- `app/api/routes/discover.ts`

### Validation & Error Handling
- `app/api/routes/bookings.ts`
- `app/api/routes/djs.ts`
- `app/api/routes/mixes.ts`
- `app/api/routes/events.ts`
- `app/api/routes/auth.ts`
- `app/api/routes/users.ts`
- `app/api/routes/discover.ts`
- `app/api/routes/admin.ts`

### Database
- `app/api/prisma/schema.prisma`
- `app/api/prisma/migrations/20260806000000_add_production_indexes/migration.sql`

### Deployment
- `deploy.sh`
- `rollback.sh`
- `docker-compose.prod.yml`

---

## Verification Commands Run

```bash
# Type-check backend
cd app/api && npx tsc --noEmit --project tsconfig.json
# ✅ Passed

# Compile backend to dist
cd app/api && npx tsc --project tsconfig.json
# ✅ Passed

# Validate Prisma schema
cd app && npx prisma validate --schema=api/prisma/schema.prisma
# ✅ Valid
```

---

## Remaining Medium / Long-Term Recommendations

1. **Redis-backed rate limiting** for multi-instance deployments.
2. **Structured logging for auth events** — replace remaining `console.*` in `auth.ts` and `authSecurity.ts` with Winston.
3. **Log shipping & alerting** — ship logs to an aggregator and page on anomalies.
4. **CDN & cache headers** for static uploads and frontend assets.
5. **Remove redundant indexes** after confirming query plans.
6. **Staging environment** — deploy to staging before production.
7. **CI/CD pipeline** — build Docker images in CI, pull on the server, avoid `scp` of source files.
8. **Refresh tokens / shorter JWT TTL** — currently 7 days without refresh rotation.

---

## Sign-Off

**Status:** Critical pre-deployment blockers resolved. The application is materially safer for production deployment than before this audit, provided the deployment script is run with the new environment variables and the migration is validated against a production-like database.
