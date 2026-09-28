# Findings — Database: Prisma Schema, Migrations, Data Integrity (DB-1…20)

Scope: `app/api/prisma/schema.prisma` (1,524 lines, 46 models, 10 enums), 17 migrations, `app/api/utils/prisma.ts`, Dockerfile/deploy workflow.

**Migration strategy (observed):** deploy-time automatic (`Dockerfile:59` → `npx prisma migrate deploy` in CMD). CI does not validate migrations (no drift check, no shadow-DB). No out-of-order migrations; `migration_lock.toml` intact. **Hand-edited migrations confirmed** (multiple, DB-11) and at least one schema column with no migration at all (DB-1) — evidence of `prisma db push` used outside the migration flow.

---

## DB-1 — Schema column `EventTicket.idempotencyKey` has NO migration — **CRITICAL** (full detail in `01-FINDINGS-critical.md`)
- `schema.prisma:915`; used at `eventTicketing.ts:1633,1663`; zero hits in migrations. Fresh deploys break; non-reproducible prod state. **Effort S · static: yes**

## DB-2 — All monetary values stored as Float (DOUBLE PRECISION)
- **Location:** `Payment.amount` (713); `Booking.budget/finalPrice/deposit/budgetMin/budgetMax` (597–608); `EventTicket.amount` (900); `EventTicketType.price` (868); `Event.totalRevenue/ticketPrice/compensation` (811/825/830); `PayPalPayment.amountSle/amountUsd/rate` (768–770); `DjSupport.amount` (1451); `PayoutRequest.amount` (1471); `ProSubscriptionRequest.amount` (739); `AdCampaign.budget/spent` (1092/1095); `DjProfile.bookingFeeMin/Max/fullDayRate/hourlyRate` (166–167/194/198); `Gig.budgetMin/Max` (646–647); `GigApplication.proposedPrice` (667); `Opportunity.budget` (1138). Baseline migration confirms `"amount" DOUBLE PRECISION` everywhere.
- **Why:** IEEE-754 for money: `0.1 + 0.2 ≠ 0.3`; summing revenue/payouts/campaign `spent` accumulates rounding error; boundary comparisons (`paid >= price`) can fail. Invisible until reconciliation.
- **HIGH · L** — migrate money columns to `Int` minor units or `@db.Decimal(12,2)`; keep `rate` as Decimal/integer micro-rate. · **static: yes**

## DB-3 — Account purge permanently destroys financial records
- **Location:** `jobs/scheduler.ts:76,86` (`tx.payment.deleteMany({ clientId/djId })`), plus booking/message/review deletion; `schema.prisma:777` `PayPalPayment.user ... onDelete: Cascade`.
- **Why:** Daily purge (soft-delete grace → hard delete) erases the only financial ledger; chargebacks, tax audits, reconciliation impossible 30 days after account deletion.
- **HIGH · M** — retain payments/payouts with PII nulled (clientId → null pattern already exists); or append-only archive table. · **static: yes**

## DB-4 — Purge transaction fails forever for users with support tickets
- **Location:** `schema.prisma:515` `SupportTicket.user` (no `onDelete`); migration `20260901000000_support_system`: `ON DELETE RESTRICT`. Purge ends with `tx.user.delete()` (`scheduler.ts:93`).
- **Why:** Any soft-deleted user who ever filed a support ticket → FK violation → whole tx rolls back → retried daily → **purge queue permanently stuck on that user**, blocking all later purges.
- **HIGH · S** — delete/reassign SupportTickets in the purge transaction before `user.delete()`, or `onDelete: SetNull` with nullable userId. · **static: yes**

## DB-5 — Orphan table `dj_fan_subscriptions` in DB with no schema model
- **Location:** baseline migration `migration.sql:878-890`; no model; zero code references.
- **MEDIUM · S** — `DROP TABLE` migration after confirming no prod reliance. · **static: yes**

## DB-6 — `RankingHistory` missing `@@unique([djId, week])`
- **Location:** `schema.prisma:1069-1083` — only `@@index([djId])`, `@@index([week])`; writes via `createMany({ skipDuplicates: true })` (rankingAlgorithm.ts:301) and single `create` (moderator.ts:931).
- **Why:** Re-runs insert duplicate weekly rows; "rank change vs last week" queries return ambiguous rows. (Companion to RANK-10.)
- **MEDIUM · S** — `@@unique([djId, week])` + keep `skipDuplicates`. · **static: yes**

## DB-7 — `Mix.slug` has no unique constraint
- **Location:** `schema.prisma:316` (`slug String?`), only non-unique `@@index([slug])`, `@@index([djId, slug])`; routes use `findFirst({ where: { slug: { equals, mode: 'insensitive' } } })` (mixes.ts:689,714,757).
- **Why:** Two mixes can share a slug (generator collision, case variants) → wrong mix served at a public slug URL.
- **MEDIUM · S** — unique partial index + surrogate unique. · **static: yes**

## DB-8 — Soft-delete vs hard-delete strategy inconsistent; audit trail deleted with actor
- **Location:** `User.deletedAt` (44) exists, but `DjProfile.user onDelete: Cascade` (242) — user delete cascades whole DJ graph; **`AuditLog.actor onDelete: Cascade` (142)** — audit trail deleted with the actor; `Message`/`Notification` Cascade; meanwhile `ViolationReport`, `Booking.clientId`, `AdCampaign.advertiserId` use `SetNull`.
- **Why:** Banned-then-deleted user takes moderation/audit history with them; analysts can't distinguish deleted-vs-never-existed.
- **MEDIUM · M** — `AuditLog.actor` → `NoAction`; purge anonymizes rather than cascades. · **static: yes**

## DB-9 — Dangling string references with no FK / no back-relation
- **Location:** `Payment.djId` (712 — payee has **no relation at all**); `BattleEntry.mixId` (1040); `ProSubscriptionRequest.reviewedById` (746); `DjProfile.promoGrantedById` (229); `PromoGrant.grantedById` (1196); `EventTicket.checkedInBy` (912); `SupportTicketReply.authorId` (533); `OfficialPlaylist.createdById` (1374); `SmartPlaylist.createdById` (1402); `Popup.createdBy` (1518); `Opportunity.organizerId` (1132); `SystemErrorLog.userId` (1353).
- **Why:** Orphaned payment rows with no payee; join-by-string silently drops rows; no cascade protection.
- **MEDIUM · M** — add relations/FKs for `Payment.djId`, `BattleEntry.mixId`, `ProSubscriptionRequest.reviewedById`; document intentional loose refs. · **static: yes**

## DB-10 — Status fields as unchecked String instead of enums/CHECK
- **Location:** `Event.status/publishStatus/approvalMode` (813–816); `EventTicket.status/paymentStatus` (896–897); `Gig.status` (651); `GigApplication.status` (669); `SupportTicket.status/priority` (518–519); `DjSupport.status` (1455); `PayoutRequest.status` (1473); `AdCampaign.status` (1091); `Opportunity.status` (1148); `OppApplications.status` (1166); `Battle.status` (1025); `PayPalPayment.status/purpose` (765/771); `ProSubscriptionRequest.status` (745); `EventScanLog.status/scannerRole` (943–944); `User.subscriptionTier` (41); `DjProfile.subscriptionTier/verificationStatus` (216/220).
- **Why:** Free-text statuses; proven drift in-repo: migration `20260901002000_ticket_status_backfill` exists solely to repair `'scanned'→'checked_in'`, `'declined'→'rejected'`; aggregations silently miscount.
- **MEDIUM · M** — convert hot statuses to Prisma enums / CHECK constraints. · **static: yes**

## DB-11 — Multiple hand-edited migrations (re-apply & drift hazards)
- **Location:** `20260825000000_phase2_indexes_and_score_columns`: `CREATE EXTENSION IF NOT EXISTS pg_trgm`, 30+ `CREATE INDEX IF NOT EXISTS` — **12 trigram GIN indexes not expressible in schema.prisma**; `20260829230000`, `20260904000000`, `20260910220000`: `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`; `20260829000000`: `ALTER TYPE "NotificationType" ADD VALUE` **without `IF NOT EXISTS`**.
- **Why:** `IF NOT EXISTS` migrations always "succeed" masking drift; trigram indexes invisible to drift tooling (no allowlist documented); non-idempotent `ADD VALUE` fails on replay and (PG < 12) inside the transaction `migrate deploy` wraps.
- **MEDIUM · S–M** — add `IF NOT EXISTS` to the enum migration; commit drift-notes/allowlist; CI drift gate. · **static: yes**

## DB-12 — Redundant duplicate indexes backing unique constraints
- **Location:** `User @@index([email])` dup `@unique` (13/76); `@@index([username])` (40/77); `@@index([phone])` (16/80); `@@index([googleId])` (15/81); `DjProfile @@index([userId])` (153/256); `OfficialPlaylist @@index([slug])` (1371/1384); `SmartPlaylist @@index([slug])` (1394/1408); `EventTicket @@index([qrPayload])` (893/927).
- **LOW · S** — drop redundant `@@index` entries. · **static: yes**

## DB-13 — PascalCase table names for 3 models (no `@@map`)
- **Location:** `SupportTicket` (512), `SupportTicketReply` (529), `MixReaction` (499) → quoted PascalCase tables among 40+ snake_case.
- **LOW · S** — `@@map` renames (or document). · **static: yes**

## DB-14 — Dead OTP columns on User (plaintext design, currently unused)
- **Location:** `User.phoneOtp` (18), `phoneOtpExpiry` (19) — no code path reads/writes; OTPs live in Redis (`utils/otp.ts`). If ever wired, OTPs would sit plaintext in the users table.
- **LOW · S** — drop columns. · **static: yes**

## DB-15 — Secrets/tokens audit (informational — mostly safe)
- `User.passwordResetToken` (32): stored **hashed** (auth.ts:450) ✓ · `Event.onsitePassword` (836): bcrypt cost 12 ✓, stripped from public reads ✓ · `Gig.clientToken` (639): unique cuid bearer — no rate limit evident on token-auth'd gig views (flag for pentest) · No plaintext refresh tokens; JWTs stateless. **LOW (info).**

## DB-16 — Timezone-naive timestamps
- **Location:** all `DateTime` → `TIMESTAMP(3)` (no `WITH TIME ZONE`); correctness depends on the app always writing UTC; week-boundary logic (RankingHistory.week, Battle.weekStart/weekEnd, purge deletedAt) sensitive.
- **LOW · M** — enforce UTC in app config (document), or migrate to `TIMESTAMPTZ`. · **static: yes**

## DB-17 — Missing indexes on plausible hot filter columns
- **Location:** `PayPalPayment.status` (771) — subscription/cron code filters `status = 'CAPTURED'`; `Notification.entityId/entityType` (104–105); `MixPlay.userId` (461, no relation); `Popup` — only `@@index([isActive])` but queries filter startsAt/endsAt window; `Battle.weekEnd` not indexed, **no unique on week window → two overlapping ACTIVE battles possible** (vote-splitting); `DjSupport.paymentReference` (1453) unindexed, not unique (duplicate support-payment claims possible without app check).
- **LOW–MEDIUM · S** — targeted indexes; `@@unique` partial on `Battle(status='ACTIVE')`. · **static: partial** (indexes missing = yes; impact needs EXPLAIN/query logs)

## DB-18 — Unbounded growth tables with no retention
- **Location:** `SiteVisit` (1288), `MixPlay` (457), `SystemErrorLog` (1345), `EventScanLog` (938), `Notification` (96), `AppDownload` (1178) — insert-only with createdAt indexes; no pruning/partitioning job.
- **LOW (now) → MEDIUM at scale · M** — scheduled pruning (extend `jobs/scheduler.ts` pattern) or PG partitioning. · **static: yes**

## DB-19 — `payments.bookingId` Cascade deletes the payment ledger with a booking
- **Location:** `schema.prisma:722` `booking Booking @relation(... onDelete: Cascade)`.
- **Why:** Admin cleanup / client request deleting a Booking cascades its Payment rows — same ledger-loss class as DB-3, reachable from more paths.
- **MEDIUM · S** — `onDelete: Restrict`; require explicit financial voiding. · **static: yes**

## DB-20 — Prisma client config gaps
- **Location:** `utils/prisma.ts` — global singleton ✓, debian binary target ✓, dev slow-query logger ✓. Gaps: no `$use` soft-delete middleware (every query site must remember `deletedAt: null` manually — inconsistent-application risk); no `connection_limit` (each cluster worker gets its own pool — can exhaust PG connections on small VPS); no graceful `$disconnect` on SIGTERM.
- **LOW–MEDIUM · S–M** — set `connection_limit`; SIGTERM handler; consider `$use` extension enforcing `deletedAt` filters. · **static: yes**
