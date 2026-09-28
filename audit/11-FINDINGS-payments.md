# Findings — Payments, Subscriptions, Trials, Referrals (PAY-1…11)

Scope: `app/api/routes/{payments,paypal,campaigns,admin,users,djs,auth,bookings,eventTicketing}.ts`, `app/api/utils/{subscription,subscriptionConfig,subscriptionExpiry,trial,campaignBoost}.ts`, `app/src/components/PayPalButton.tsx`.

**Architecture note:** there is **no PayPal webhook endpoint anywhere**. All payment confirmation is synchronous: client calls server-side `capture-*` endpoints that call PayPal server-to-server with `custom_id` verification. Legitimate pattern (no webhook signature to spoof), but refunds/disputes/reversals are never processed (PAY-3).

---

## PAY-1 — Admin subscription-proof approval is not idempotent; double-approve stacks paid months
- **File:** `app/api/routes/admin.ts` `POST /pro-subscription-requests/:id/approve` (1103–1174)
- **Code:**
  ```js
  const request = await prisma.proSubscriptionRequest.findUnique({ ... });
  if (!request) return fail(res, 404, ...);
  const targetUserId = request.userId || request.dj?.userId;
  if (targetUserId) { await activateSubscriptionFeatures(targetUserId, request.plan); }
  ```
  No `if (request.status !== 'pending')` guard. `activateSubscriptionFeatures` (middleware/permissions.ts:309) **stacks** time: `const base = new Date(Math.max(Date.now(), currentExpiryMs)); const expiresAt = addMonths(base, months);`
- **Why:** Double-click / retry / re-approval grants 2+ months of Pro/Legend for a single mobile-money proof. Race: two parallel POSTs both read `status: 'pending'` and both activate.
- **HIGH · S** — reject unless `request.status === 'pending'` (409); or atomic `updateMany({ where: { id, status: 'pending' }, ... })` and activate only if count === 1. · **static: yes**

## PAY-2 — Concurrent capture race corrupts payment record (CAPTURED overwritten by FAILED)
- **File:** `app/api/routes/paypal.ts` `capture-order` catch (160–167), `captureVerifiedOrder` (294–299)
- **Code:**
  ```js
  } catch (err: any) {
    const status = err.response?.status;
    await prisma.payPalPayment.update({
      where: { orderId },
      data: { status: status === 422 ? 'FAILED' : record.status },
    }).catch(() => {});
  ```
  Idempotency check (`if (record.status === 'CAPTURED') return replay`) is read-then-act with no locking.
- **Why:** Two simultaneous captures of the same order: A captures at PayPal → `CAPTURED`; B gets PayPal 422 (already captured) → **unconditionally overwrites row to `FAILED`**. Money captured + premium activated, but ledger says FAILED; ticket flow leaves `meta.ticketIds` under a FAILED status → permanent false "capture failed" for valid paid tickets.
- **MEDIUM · S** — on 422, conditional update `updateMany({ where: { orderId, status: { not: 'CAPTURED' } }, ... })`. · **static: yes**

## PAY-3 — No webhook / dispute / refund handling: refunded or reversed PayPal payments keep benefits
- **File:** whole `app/api` (no webhook route; server.ts:239–240 mounts only `paymentRoutes`/`paypalRoutes`)
- **Why:** `capture-*` endpoints grant subscription/tickets/COMPLETED bookings immediately and permanently. The refund endpoint (`payments.ts:368 /:id/refund`) only covers manually-recorded `Payment` rows, not PayPal captures. A PayPal-side refund/dispute/chargeback of a subscription leaves `subscriptionTier='pro'` (up to 12 months for annual); same for paid event tickets — refunded buyer still holds scannable QR tickets.
- **HIGH · M** — add `POST /api/payments/paypal/webhook` verifying PayPal webhook signatures, idempotent by `event.id`, downgrading subscriptions / voiding tickets / flagging bookings on `PAYMENT.CAPTURE.REFUNDED|REVERSED`. · **static: yes** (absence is confirmable)

## PAY-4 — Triple inconsistent price sources for the same plans (underpayment via whichever rail is cheapest)
- **Files:** `app/api/routes/users.ts:1026-1027` — `EXPECTED_MONTHLY_PRICE = { pro: 100, legend: 150 }`, `EXPECTED_ANNUAL_PRICE = { pro: 1000, legend: 1500 }` (hardcoded); `app/api/utils/subscriptionConfig.ts:26-27` — defaults `proPrice: 200, legendPrice: 350` (DB-overridable); `app/api/routes/paypal.ts:35` — `ANNUAL_PRICES_SLE = { pro: 2000, legend: 4000 }` (hardcoded annual); `app/api/routes/payments.ts:145` — fallback `legend ? (isAnnual ? 4200 : 350) : (isAnnual ? 2400 : 200)`; `app/api/utils/trial.ts:226` — trial email advertises "Pro Plan — SLE 150/mo".
- **Why:** Manual-request flow validates against 100/150 SLE, Orange Money flow prices at 200/350, PayPal charges 2000/4000 annual regardless of config. Admin config changes never propagate. Revenue leakage + un-auditable pricing.
- **HIGH · M** — single source of truth: `getSubscriptionConfig()` used by all three flows (extend with annual prices); delete hardcoded constants. · **static: yes**

## PAY-5 — Concurrent booking deposit/full-payment orders can double-charge
- **File:** `app/api/routes/paypal.ts` `POST /booking-order` (528–567), `capture-booking` (569–622)
- **Code:** `completedSum = aggregate(...)` then `if (type === 'DEPOSIT') { const existing = await findFirst({ where: { bookingId, status: 'COMPLETED' } }); if (existing) return fail(res, 409, ...)` — checks at order-creation time, not enforced at capture time; `capture-booking` has no unique constraint/guard before `prisma.payment.create`.
- **Why:** Two different PayPal orders created+captured concurrently for the same deposit → buyer charged twice, deposit overwritten. For FULL_PAYMENT, `amountSle = finalPrice - paidSoFar` computed at order time → two concurrent orders each charge the full remaining balance.
- **MEDIUM · M** — enforce at capture time inside a transaction; unique partial index on `(bookingId, type)` for non-refund COMPLETED payments; recompute `paidSoFar` in the capture transaction. · **static: yes**

## PAY-6 — Referral system is unimplemented server-side (and would have no anti-fraud controls)
- **Files:** `app/api/routes/auth.ts` `register` (73–144), `app/api/prisma/schema.prisma:35-36,226`, `app/api/routes/djs.ts:1193-1239`
- **Code:** `registerSchema` has **no `ref` field**; `prisma.user.create` never writes `referredBy`; `djProfile.referralCount` never incremented anywhere; `GET /djs/my/referral` counts `prisma.user.count({ where: { referredBy: user.referralCode } })` — always 0.
- **Why:** (a) Functional: referrals silently never tracked — growth loop dead, admins see fabricated "0/5" progress. (b) Latent debt: if `referredBy` gets wired into registration later, nothing prevents self-referral / same-IP referral farming / replayed codes.
- **MEDIUM · M** — accept optional validated `ref` code at register (reject own code, rate-limit by IP/device); increment `referralCount` transactionally; auto-grant reward idempotently at threshold. · **static: yes**

## PAY-7 — Trial is per-account-creation; purge + re-registration yields unlimited free trials
- **Files:** `app/api/utils/trial.ts:60` (`trialStartDate = profile?.createdAt || user?.createdAt`); `app/api/jobs/scheduler.ts:63-95` (daily purge hard-deletes djProfile then user)
- **Why:** Trial entitlement derives solely from `createdAt`. Purge permanently deletes users; re-registering same email/phone = brand-new user with fresh 14-day trial. Trivial trial farming of Pro-gated features (unlimited uploads, ticketing).
- **MEDIUM · M** — keep a non-PII trial-claim registry (hashed phone/email) not purged, or follow phone number across accounts. · **static: yes**

## PAY-8 — Manual subscription-proof endpoints: no rate limit; orphaned storage on duplicate flow
- **Files:** `app/api/routes/payments.ts:97` (`POST /pro-subscription`, no limiter); `app/api/routes/users.ts:1076` (`POST /users/subscription/request`, no limiter) — `users.ts` uploads the file (1103) **before** the duplicate check (1127) → orphaned storage objects on every 409.
- **Why:** Unbounded orphaned uploads (storage cost), admin-queue flooding with fake proofs (review fatigue → higher chance of approving a fake proof = premium without payment).
- **LOW · S** — add `purchaseLimiter` to both; check pending-request before `uploadBuffer`; clean up file on 409. · **static: yes**

## PAY-9 — Client-created `Payment` rows accept client-supplied amount/currency
- **File:** `app/api/routes/payments.ts:244-300`
- **Code:** `paymentSchema = z.object({ bookingId: z.string(), amount: z.number().min(0), currency: z.string().default('SLE'), type: z.enum([...]).optional() })` → `prisma.payment.create({ data: { ..., amount, currency, type: type || 'DEPOSIT', status: 'PENDING' } })`
- **Why:** Amount/currency fully client-chosen (no comparison to `booking.deposit`/`finalPrice`). Mitigated: only ADMIN/FINANCE_ADMIN can mark COMPLETED (305). Residual: duplicate-check race → duplicate PENDING rows; crafted amounts misstate finance dashboard; `type: 'REFUND'` rows with min(0) sit in queue.
- **LOW · S** — server-derive amount from booking; drop REFUND from client enum; unique guard per (bookingId, type) open payments. · **static: yes**

## PAY-10 — Revenue aggregation uses a status value the code never writes (`'COMPLETED'` on PayPalPayment)
- **File:** `app/api/routes/admin.ts:204-209`
- **Code:**
  ```js
  prisma.payPalPayment.aggregate({ where: { createdAt: { ... }, status: 'COMPLETED' }, _sum: { amountSle: true } }),
  ```
  but `paypal.ts` only ever writes `CREATED`, `CAPTURED`, `FAILED` (130, 147, 165, 187, 298, 314). Also `bookingTotal = Math.max(finalPrice+deposit, payments-sum)` double-counts arbitrarily.
- **Why:** Finance "revenue" dashboard permanently under-reports all PayPal income (aggregate always 0). Wrong numbers drive wrong decisions; with PAY-2 the ledger isn't trustworthy even after fixing the constant.
- **MEDIUM · S** — change where to `status: 'CAPTURED'`; one canonical revenue query. · **static: yes**

## PAY-11 — PayPal OAuth token cached in module-scope singleton; refresh thundering herd
- **File:** `app/api/routes/paypal.ts:44-64` — `let cachedToken`, refreshed without locking.
- **Why:** N concurrent requests all POST to `/v1/oauth2/token` at expiry. Efficiency issue, not a leak.
- **LOW · S** — in-flight promise dedupe for token refresh. · **static: yes**

## Verified NON-issues
- PayPal client secret NOT in client bundle (only `PAYPAL_CLIENT_ID` via public `/config`; secret only in backend `process.env`).
- Synchronous capture + server-created orders + `custom_id` round-trip verification is sound against order substitution; order amounts fixed server-side at creation.
- Plan tier decided server-side for PayPal; premium granted only after successful server-to-server capture.
- Ticket oversell guarded by atomic conditional `UPDATE ... SET sold = sold + $1 WHERE ... sold + $1 <= quantity` in both manual purchase and PayPal capture.
- Campaign status elevation by advertiser: blocked by allow-list `updateData` (campaigns.ts:285-294).
- Manual tip self-support blocked in both flows (djs.ts:1137, paypal.ts:641).
- Refund endpoint admin-only, refuses non-COMPLETED rows, audit-trailed.
