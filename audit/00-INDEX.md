# Deck Salone — Production-Readiness Audit (Phase 1)

**Date:** 2026-09-28 · **Scope:** full backend (`app/api`), DB layer (`prisma`), infrastructure (Docker/NGINX/CI/deploy), Android APK API usage · **Mode:** READ-ONLY — no files were modified.

## How to read this audit

| File | Contents |
|---|---|
| `01-FINDINGS-critical.md` | All CRITICAL findings, full detail (also cross-listed in domain files) |
| `10-FINDINGS-auth.md` | AUTH-1…17 — authentication, sessions, authorization |
| `11-FINDINGS-payments.md` | PAY-1…11 — payments, subscriptions, referrals, webhooks |
| `12-FINDINGS-ranking.md` | RANK-1…18 — rankings, play counts, battles, discovery |
| `13-FINDINGS-uploads.md` | UPL-1…14 — uploads, storage, static serving |
| `14-FINDINGS-admin-ticketing.md` | ADM/MOD/SUP/TKT/ETK/EVT/BKG/GIG — admin, moderator, support, tickets, events, bookings, gigs |
| `15-FINDINGS-social.md` | SOC-1…28 — users, DJs, messages, notifications, reviews, PII |
| `16-FINDINGS-infra.md` | INFRA-1…23 — server, Docker, NGINX, compose, CI, deploy |
| `17-FINDINGS-mobile.md` | MOB-1…8 — Android APK / Capacitor API usage |
| `18-FINDINGS-database.md` | DB-1…20 — Prisma schema, migrations, data integrity |
| `20-REPORT-A-K.md` | Sections A–K: critical / security / architecture / database / performance / scalability / missing features / monitoring-DevOps / target architecture / 30-day / 90-day |
| `30-REQUIRES-RUNTIME-VERIFICATION.md` | Everything static analysis **cannot** confirm — needs a running env or human pentest |
| `40-PHASE2-PROPOSAL.md` | Proposed Phase 2 scope: CRITICAL+HIGH fixes, commit clustering, test strategy |

## Finding counts

| Severity | Count | IDs |
|---|---|---|
| CRITICAL | 4 | UPL-1, RANK-1, SOC-1, DB-1 |
| HIGH | 34 | AUTH-1, AUTH-2, PAY-1, PAY-3, PAY-4, RANK-2, RANK-4, RANK-5, RANK-10, UPL-2, UPL-3, UPL-4, ADM-1, ADM-3, MOD-1, ETK-1, ETK-2, SOC-2, SOC-3, SOC-4, SOC-5, SOC-6, SOC-7, SOC-8, SOC-9, DB-2, DB-3, DB-4, INFRA-1, INFRA-2, INFRA-4, INFRA-5, INFRA-6, INFRA-7 |
| MEDIUM | ~55 | see domain files |
| LOW | ~30 | see domain files |

## The five worst problems (fix first)

1. **UPL-1 (CRITICAL)** — Every paid/exclusive mix is downloadable by fully unauthenticated users: `GET /api/mixes` returns raw `audioUrl`, and `/uploads` is a public static mount. All download-gate logic is bypassable theater.
2. **SOC-1 (CRITICAL)** — Public DJ directory endpoints return the **entire** `djProfile` row: ID-document URL, legal name, nationality, payout method (mobile-money account details), for every DJ, to anyone.
3. **RANK-1 (CRITICAL)** — Play counts are incremented by anonymous requests, 20/min/mix/IP with no dedup → 28,800 plays/day/mix from one IP; feeds rankings, battles, trending, discovery scores.
4. **DB-1 (CRITICAL)** — `EventTicket.idempotencyKey` exists in the schema but has **no migration** — evidence of `prisma db push` drift; fresh deploys from migrations break, and `--accept-data-loss` is used in prod deploys (INFRA-7).
5. **INFRA-1 (HIGH)** — Live database credentials (`soundit:password`) committed in `docker-compose.homelab.yml` in a public GitHub repo.

## Method & limitations

- Static analysis only: every route, middleware, util, schema model, migration, and config file in scope was read in full (very large route files read in targeted chunks, with grep sweeps for auth/authorization patterns across all of them).
- Findings marked **`static: no`** cannot be confirmed without a running environment, real traffic, or a human pentest. Consolidated in `30-REQUIRES-RUNTIME-VERIFICATION.md`.
- Line numbers refer to the code as of this audit and will drift; each finding quotes the actual code so it remains locatable.
- Standing rule honored: nothing was deleted, no user data touched, no code modified.

**STOP — Phase 1 complete. Awaiting approval before Phase 2.**
