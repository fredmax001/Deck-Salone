# Findings — Admin, Moderator, Support, Tickets, Events, Bookings, Gigs

Scope: `app/api/routes/{admin,moderator,support,tickets,userTickets,eventTicketing,events,bookings,gigs}.ts`, `middleware/{auth,permissions}.ts`, `utils/ticketQr.ts`.

---

## ADM-1 — No role hierarchy: any ADMIN can demote/ban SUPER_ADMIN and other ADMINs
- **File:** `admin.ts` `PUT /users/:id/role` (384–459), `PUT /users/:id/status` (462–496)
- **Code:**
  ```js
  const user = await prisma.user.update({ where: { id: targetId }, data: { role } ...
  const [user] = await prisma.$transaction([ prisma.user.update({ where: { id: targetId }, data: { status } ...
  ```
  Neither checks the target's current role.
- **Why:** A compromised (or rogue) single ADMIN account can set `role: 'USER'` on the SUPER_ADMIN or `status: 'BANNED'` on every other admin → unchallengeable platform takeover.
- **HIGH · S** — refuse when `targetUser.role === 'SUPER_ADMIN'` unless actor is that SUPER_ADMIN; require second-admin confirmation for ADMIN grants. · **static: yes**

## ADM-2 — Role-grant endpoint allows creating arbitrary new ADMINs; schema omits SUPPORT_ADMIN
- **File:** `admin.ts:68-70, 384`
- **Code:** `updateRoleSchema = z.object({ role: z.enum(['USER', 'DJ', 'ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN']) })`
- **Why:** Any plain ADMIN can mint new ADMINs in one call (audit-logged but not prevented). Schema can't set `SUPPORT_ADMIN`, yet `SUPPORT_ADMIN` passes the router gate (L57) — inconsistent role model.
- **MEDIUM · S** — restrict ADMIN grants to SUPER_ADMIN; add reason + notify existing admins; reconcile SUPPORT_ADMIN. · **static: yes**

## ADM-3 — Router-level gate lets FINANCE/VERIFICATION/SUPPORT_ADMIN access every admin endpoint incl. private messages and full PII
- **File:** `admin.ts:52-58`; consumed by `GET /messages` (1241–1272, returns `latestMessage: m.content.slice(0, 80)` between arbitrary users), `GET /users` (305–381, returns `idDocumentUrl`, `legalName`, `nationality`, `socialProof`), `GET /payments` (1043), `PUT /campaigns/:id` (2370, no endpoint-level check)
- **Code:**
  ```js
  return requireRole('ADMIN', 'SUPER_ADMIN', 'VERIFICATION_ADMIN', 'FINANCE_ADMIN')(req, res, next);
  ```
- **Why:** Least-privilege violation: a finance clerk can read users' ID documents and private DM snippets; a verification admin can view all platform payments and rewrite ad campaigns.
- **HIGH · M** — per-route role maps (messages/payments → ADMIN+SUPER_ADMIN only; verification docs → VERIFICATION_ADMIN+ADMIN). · **static: yes**

## ADM-4 — Audit-log gaps on sensitive mutations
- **File:** `admin.ts` `PUT /djs/:id/ranking` (782–802), `PUT /djs/:id/hall-of-fame` (730), `PUT /mixes/:id/hall-of-fame` (743), `PUT /mixes/:id/visibility` (1493), `POST /rankings/recalculate` (805), `PUT /campaigns/:id` (2370)
- **Why:** Ranking rewrites, hall-of-fame toggles, visibility changes, campaign edits write **no** `createAuditLog` entry — no non-repudiation for exactly the actions that need it.
- **MEDIUM · S** — add `createAuditLog` (pattern exists). · **static: yes**

## ADM-5 — Admin broadcast/custom email endpoints accept arbitrary recipients, unbounded sends, no audit; `/notifications` returns all users' phone numbers
- **File:** `admin.ts` `POST /broadcast-email` (2441–2518), `/send-email` (2830), `/test-email` (2805), `/send-custom-email` (3420), `POST /notifications` (1980 — returns `whatsappTargets: [{ id, name, phone, whatsappUrl }]` for every matched user)
- **Why:** Leaked ADMIN token → bulk-email/spam tool + phone-number harvesting (the response payload itself is mass PII exfiltration). No audit trail of who emailed whom.
- **MEDIUM · S** — audit-log every send; return counts only; rate limit. · **static: yes**

## ADM-6 — Admin list endpoints expose payment/booking PII broadly; `/users` search omits username
- **File:** `admin.ts` `GET /users` (339–371), `/bookings`/`/payments` (return `payments: true` full rows)
- **Why:** Identity documents (passport uploads!) exposed to finance/verification roles; GDPR-style data-minimization failure.
- **MEDIUM · S** — split verification docs into dedicated endpoint gated to VERIFICATION_ADMIN/ADMIN. · **static: yes**

## ADM-7 — `PUT /djs/:id/verify` & `DELETE /djs/:id` crash (500) on missing DJ
- **File:** `admin.ts:538` (`prisma.djProfile.update` without existence check), 1430–1431 (`dj?.userId` then unconditional delete throws when null)
- **LOW · S** — 404 guard. · **static: yes**

---

## MOD-1 — Moderator can unban/suspend arbitrary users via `/admin/djs/:id/suspend` toggle
- **File:** `admin.ts:1395-1425` (`requireRole('ADMIN', 'MODERATOR')`)
- **Code:**
  ```js
  const newIsPublic = !dj.isPublic;
  const newUserStatus = newIsPublic ? 'ACTIVE' : 'SUSPENDED';
  ... prisma.user.update({ where: { id: dj.userId }, data: { status: newUserStatus } })
  ```
- **Why:** (1) MODERATOR can set any user's account status (login block) with one toggle; (2) if an admin had set the user `BANNED`, a moderator toggling `isPublic` back on sets `status: 'ACTIVE'` — silently **unbanning** banned users. Conflates "hide profile" with "account status".
- **HIGH · S** — restrict to ADMIN, or only toggle `isPublic` and never write `user.status` from this endpoint; never upgrade status (only set SUSPENDED if currently ACTIVE). · **static: yes**

## MOD-2 — Report action `RESTRICT` is a no-op; action strings unvalidated
- **File:** `moderator.ts:1046-1107`
- **Code:** `const { action, notes } = req.body;` — only `REMOVE_CONTENT`/`UNPUBLISH`/`ESCALATE_ADMIN` handled; anything else (incl. documented `WARNING`/`RESTRICT`) falls through and marks the report `RESOLVED` with `actionTaken = action`.
- **Why:** Reports closed with fake action labels; UI shows "RESTRICT" as done when nothing happened.
- **MEDIUM · S** — validate enum + implement or reject `RESTRICT`/`WARNING`. · **static: yes**

## MOD-3 — Moderator mix update accepts `moderatorCurated` from body
- **File:** `moderator.ts:185-252` — `updateMixSchema` permits `moderatorCurated: z.boolean().optional()`
- **Why:** Moderator compromise → featured-placement manipulation (with `/djs/:id/feature` L962, moderators fully control homepage prominence).
- **LOW · S** — gate curation to ADMIN. · **static: yes**

## MOD-4 — Playlist item delete has no ownership check on `itemId` (cross-playlist IDOR)
- **File:** `moderator.ts:766-800` — `prisma.officialPlaylistItem.delete({ where: { id: itemId } })` then re-sequences `{ playlistId: id }`; `itemId` never verified to belong to `:id`.
- **Why:** Delete item from playlist B while re-sequencing playlist A → corrupted positions, wrong item removed.
- **LOW · S** — delete with `{ id: itemId, playlistId: id }`. · **static: yes**

## MOD-5 — `/mixes` moderator list allows `limit` up to 1000
- **File:** `moderator.ts:135` — `Math.min(1000, ...)`. **LOW · S** — cap at 100–200. · **static: yes**

*(Positive: moderator ranking adjustments require a reason and write `ModeratorAuditLog`; report PATCH logs. Audit completeness on the moderator router is good.)*

---

## SUP-1 — Support reply created outside the transaction that updates ticket status
- **File:** `support.ts:170-198` — reply `create` outside `prisma.$transaction` that updates status.
- **Why:** Tx failure after reply commit → reply exists with stale status; staff queues desync.
- **LOW · S** — move reply creation inside the transaction. · **static: yes**

## SUP-2 — Ticket status lifecycle gaps (no re-open on reply to `resolved`; `resolvedAt` never cleared)
- **File:** `support.ts:180-183, 219`
- **LOW · S** — auto-reopen on user reply to resolved/closed; null `resolvedAt`. · **static: yes**

---

## TKT-1 — TOCTOU race on legacy purchase → ticket oversell
- **File:** `tickets.ts:40-59`
- **Code:**
  ```js
  const sold = await prisma.eventTicket.count({ where: { eventId, status: { in: ['approved', 'checked_in'] } } });
  if (sold >= event.totalTickets) return fail(res, 400, 'Event is sold out');
  ...
  const ticket = await prisma.eventTicket.create({ ... status: 'pending' ... });
  ```
  Count-then-create, no transaction, no unique constraint on `(eventId, userId)`.
- **Why:** Concurrent purchases both see `sold < total` → oversell; duplicate-purchase check (L35-38) races → multiple pending tickets per user/event.
- **MEDIUM · M** — mirror the atomic `UPDATE ... SET sold = sold + $1 WHERE ...` pattern from `eventTicketing.ts:494-501`; unique index on `(eventId, userId)` for non-rejected tickets. · **static: yes**

## TKT-2 — Legacy scan is a non-atomic check-then-update → duplicate check-ins
- **File:** `tickets.ts:221-232`
- **Code:** `if (ticket.status === 'checked_in') return fail(...ALREADY_SCANNED...); ... prisma.eventTicket.update({ where: { qrCode }, data: { status: 'checked_in', ... } });`
- **Why:** Two scanners fire the same QR simultaneously → both pass → same ticket admitted twice.
- **MEDIUM · S** — conditional `updateMany({ where: { qrCode, status: 'approved' } })` pattern (as eventTicketing.ts:1280-1287 does). · **static: yes**

## TKT-3 — Pro/legend DJ can scan (and see attendee PII) for events they don't own
- **File:** `tickets.ts:216-219, 231`
- **Code:** `const isProPlus = dj && ['pro', 'legend'].includes(dj.subscriptionTier?.toLowerCase()); if (!isAdmin && !isProPlus && (!dj || event.djId !== dj.id)) return fail(res, 403, ...);` — response includes attendee `name`, `username`, `avatar`.
- **Why:** Cross-event scanning combined with the same shortcut in `canScanEvent` (eventTicketing L184-185) grants guest-list read access to any Pro DJ.
- **MEDIUM · S** — split "may scan" from "may read guest list". · **static: yes**

## TKT-4 — `userTickets.ts /resend` is an unauthenticated no-op stub that lies to clients
- **File:** `userTickets.ts:46-58` — returns `{ message: 'Confirmation resent' }` without sending.
- **LOW · S** — implement via `sendTicketApprovalEmail` + rate limit, or return 501. · **static: yes**

---

## ETK-1 — Staff password hash leaked via `event` in dashboard & onsite responses
- **File:** `eventTicketing.ts:74-97` helper `getEventWithAuth` returns full `event`; consumed raw at L625-647 (`/ticketing/dashboard` → `ok(res, { event, summary })`) and L1466-1479 (`/onsite/dashboard`)
- **Code:** `return ok(res, { event, summary: {...} });   // event includes onsitePassword (bcrypt hash)`
- **Why:** Every Pro organizer (and every on-site staff token holder, using a shared likely-weak gate password) receives the bcrypt hash → offline cracking of weak staff passwords; the plaintext-upgrade path (L1396-1403) proves plaintext legacy passwords exist.
- **HIGH · S** — strip `onsitePassword` (as `/availability` does at L421) before returning `event` anywhere. · **static: yes**

## ETK-2 — Pro/legend DJs can read the full guest list (name/email/phone) of ANY event
- **File:** `eventTicketing.ts:165-189` (`canScanEvent` grants Pro+ DJs), used by `/onsite/guests` (1487), `/onsite/dashboard` (1445), `/scan` (1175)
- **Code:** `const proTiers = ['pro', 'legend']; if (proTiers.includes(user?.djProfile?.subscriptionTier?.toLowerCase())) return true; ... // /onsite/guests includes: user: { select: { id, name, username, avatar, email, phone } }`
- **Why:** A $Pro subscription becomes a bulk-PII harvesting tool: enumerate public event IDs, call `/onsite/guests?limit=200`, collect attendee emails/phones of competitor events.
- **HIGH · S** — remove the blanket Pro+ grant, or restrict to scan-only with attendee details redacted. · **static: yes**

## ETK-3 — Encrypted QR `exp` is never validated — expired/reissued tickets remain valid forever
- **File:** `eventTicketing.ts:1186-1199` + `utils/ticketQr.ts` (`generateTicketQrPayload(... expiresInHours = 72)` sets `exp`)
- **Why:** Scan handler checks only `ticketId`/`eventId`; never compares `exp` to `Date.now()`. A leaked QR screenshot is valid indefinitely; reissue intent (nonce rotation) only partially honored.
- **MEDIUM · S** — after decrypt, `if (payload.exp && Date.now() > payload.exp) return fail(...EXPIRED...)`. · **static: yes**

## ETK-4 — `reissue-qr` on a `checked_in` ticket silently reverts it to `approved` — re-admits entered attendees
- **File:** `eventTicketing.ts:991-1008`
- **Code:** `if (!['approved', 'checked_in'].includes(ticket.status)) return fail(...); const updated = await prisma.eventTicket.update({ ... data: { qrPayload: payload, status: 'approved', scannedAt: null, checkedInBy: null } });`
- **Why:** No reason required, no buyer notification; organizer (or hijacked organizer account) can reset entry state; `updateEventAggregates` not called → aggregates desync.
- **MEDIUM · S** — forbid reissue when `checked_in`, or require reason + scan log + aggregate refresh. · **static: yes**

## ETK-5 — Walk-in sale accepts a client-supplied `amount`, bypassing the ticket-type price
- **File:** `eventTicketing.ts:1627`
- **Code:** `const finalAmount = parsed.data.amount !== undefined ? parsed.data.amount : ticketType.price * qty;`
- **Why:** Any staff token holder records a 0/-price cash sale while handing out real approved tickets → revenue skimming, bogus analytics.
- **MEDIUM · S** — server-computed price; discounts require explicit flag + reason + audit. · **static: yes**

## ETK-6 — Guest-list additions bypass capacity/sold accounting
- **File:** `eventTicketing.ts:730-812` — guest-list creates tickets directly (status approved/checked_in) without the atomic `sold += qty` increment and without capacity checks.
- **Why:** Oversell beyond announced capacity; public `availability` shows seats that don't exist.
- **MEDIUM · S** — same conditional `sold` increment inside a transaction. · **static: yes**

## ETK-7 — `undo-checkin` lets any scanner reverse entry; log indistinguishable from real admissions
- **File:** `eventTicketing.ts:1564-1593` — `checked_in → approved` flip; `eventScanLog` row uses `status: 'valid'` with `metadata.action: 'undo_checkin'`; dashboards count all `status: 'valid'` rows (L602/L1459).
- **Why:** Entry-fraud enabler (scan friend in, undo, scan again); attendance metrics inflated by design.
- **MEDIUM · S** — distinct scan-log status (`undone`), excluded from counts; require reason. · **static: yes**

## ETK-8 — CSV export not protected against spreadsheet formula injection; unbounded rows
- **File:** `eventTicketing.ts:240-251` (`buildCsv`), 1074-1112
- **Code:** `escape` quotes only values containing `, " \n` — a `buyerName` of `=HYPERLINK("http://evil","click")` emitted raw.
- **LOW · S** — prefix cells starting with `= + - @` with `'`. · **static: yes**

## ETK-9 — `onsite/auth` minor issues
- **File:** `eventTicketing.ts:1359-1442` — lockout key `onsite_lock:<eventId>:<username||'-'>`: omitting username always targets the `-` bucket → fresh 5-attempt bucket per username guess; username check (L1379-1385) bypassed entirely by omitting username.
- **LOW · S** — require username when `onsiteUsername !== 'staff'`. · **static: yes**

*(Positive: purchase uses atomic conditional `UPDATE ... sold = sold + $1 ... WHERE sold + $1 <= quantity` (494-501); walkin idempotencyKey replay (1632-1637); scan/checkin use `updateMany({ where: { status: 'approved' } })` atomic guards (1280, 1329, 1546); onsite token bound to single eventId; availability strips staff credentials.)*

---

## EVT-1 — Public event detail leaks every RSVP user's ID
- **File:** `events.ts:248-288` — `rsvps: { select: { userId: true } }` returned to anonymous callers.
- **Why:** Full attendee enumeration of any event; user IDs correlate with other endpoints.
- **MEDIUM · S** — return only `userRsvp` + count. · **static: yes**

## EVT-2 — Gallery photo delete IDOR: `photoId` never checked against `:id`
- **File:** `events.ts:607-615` — `prisma.eventPhoto.delete({ where: { id: req.params.photoId } })` after checking ownership of event A only.
- **MEDIUM · S** — `delete where { id: photoId, eventId: req.params.id }`. · **static: yes**

## EVT-3 — Mass-assignment surface in create/update: arbitrary `status`, `publishStatus`, `eventCode`, `filledSlots`
- **File:** `events.ts:89-91, 110-155, 362-381, 543-548` — `status: z.string().optional()`, `publishStatus: z.string().optional()` accept any string; `filledSlots` and `isSyncedToSalone` in update schema; `eventCode` client-supplied, no uniqueness/format check (318).
- **Why:** DJ can set `publishStatus: 'suspended'` on their own event, fabricate `eventCode`s (used in onsite staff login context), manipulate `filledSlots`.
- **MEDIUM · S** — enum-validate; drop `filledSlots`/`isSyncedToSalone` from public schema. · **static: yes**

## EVT-4 — Accepting an application increments `filledSlots` unconditionally
- **File:** `events.ts:512-552` — re-ACCEPTing an already-ACCEPTED application increments again; no cap against `slots`; DECLINED→ACCEPTED allowed.
- **LOW · S** — increment only when previous status !== ACCEPTED; validate transitions. · **static: yes**

## EVT-5 — (No issue) Event create forces non-admin `djId` to own profile; drafts scoped correctly; `onsitePassword` bcrypt(12) on write and stripped from public reads; ownership checks consistent.

---

## BKG-1 — Client can self-confirm a PENDING booking via `/counter` accept, with no DJ terms
- **File:** `bookings.ts:106-170`
- **Code:** `if (action === 'accept') { newStatus = 'CONFIRMED'; } ... if (booking.status !== 'NEGOTIATING' && booking.status !== 'PENDING') return fail(...);` — the `finalPrice == null` guard exists only in `/status` (509), not here.
- **Why:** Client `PUT /counter {action:'accept'}` on own fresh PENDING booking → CONFIRMED with no DJ interaction and no agreed price; pollutes DJ pipelines, triggers DJ notifications, downstream flows treat as real.
- **MEDIUM · S** — require `finalPrice != null` before client accept. · **static: yes**

## BKG-2 — Daily 3-booking cap and slot-uniqueness are check-then-insert (race)
- **File:** `bookings.ts:372-411` — `findMany` count → `create` without transaction.
- **LOW · M** — conditional insert with unique partial index or serializable transaction. · **static: yes**

## BKG-3 — Public availability endpoint reveals booking event types per day
- **File:** `bookings.ts:222-309` — `select: { id, eventDate, timeSlot, eventType, status }` via softAuth (anonymous OK).
- **LOW · S** — drop `eventType`/`id` from public projection. · **static: yes**

*(Positive: `finalPrice`/`deposit` DJ/admin-only; client money-lifecycle restrictions sound; status transitions whitelisted; review restricted to COMPLETED + owner; single-booking GET enforces client/DJ/admin. Client-supplied finalPrice concern disproven.)*

---

## GIG-1 — Gig creation is fully anonymous/unauthenticated
- **File:** `gigs.ts:46-71` — `router.post('/', bookingLimiter, ...)` — no authMiddleware.
- **Why:** Gig listing poisoning (fake high-budget gigs to phish DJs who apply), DB spam.
- **MEDIUM · S** — require auth or email verification; trim/escape fields. · **static: yes**

## GIG-2 — Application accept/decline has no state machine
- **File:** `gigs.ts:264-313` — accepts WITHDRAWN/PENDING-again applications, accepts on non-OPEN gigs, races multiple ACCEPTED.
- **LOW · S** — guard `application.status === 'PENDING' && gig.status === 'OPEN'`. · **static: yes**

*(Positive: apply is DJ-role + Pro-gated with compound unique `(gigId, djId)`; withdraw owner-or-admin; list/detail `requireRole('DJ', 'ADMIN)`; DJ emails not leaked to DJ role.)*

---

## Cross-cutting notes
- **Onsite staff tokens:** 7-day TTL, no revocation list (see AUTH-11). **MEDIUM · S.**
- **No refund endpoints** — refunds are status flips only; no financial audit trail for ticket refunds (cancel has no reason/audit log). **LOW.**
- **No ticket-transfer endpoint exists** (despite expectations) — nothing to IDOR there.
