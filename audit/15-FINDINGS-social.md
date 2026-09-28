# Findings — Users, DJs, Messages, Notifications, Reviews, PII (SOC-1…28)

Scope: `app/api/routes/{users,djs,messages,notifications,reviews,reports,discover,dashboard,analytics,sets,opportunities,developers,officialPlaylists,smartPlaylists,popups,og,sitemap,appVersion}.ts`, `app/api/utils/{notifications,push,email,sms}.ts`.

---

## SOC-1 — Full DJ record (ID documents, payout method, legal name) leaked in public list endpoints — **CRITICAL** (full detail in `01-FINDINGS-critical.md`)
- `djs.ts` `GET /` (310–341), `GET /hall-of-fame` (350–390), `GET /:identifier` (543–614); `discover.ts` `GET /api/discover/djs` (157–202). Prisma `include` returns every `djProfile` column incl. `idDocumentUrl`, `legalName`, `payoutMethod`. **Effort S · static: yes**

## SOC-2 — Private (isPublic=false) DJ profiles fully exposed via `GET /api/djs/:identifier` and `/og/dj/:identifier`
- **File:** `djs.ts:543-579`; `og.ts:57-72`
- **Code:**
  ```js
  let dj = await prisma.djProfile.findUnique({ where: { id: identifier }, include: commonInclude });
  if (!dj) { dj = await prisma.djProfile.findFirst({ where: { user: { username: ... } } ... }); }
  if (!dj) { dj = await prisma.djProfile.findFirst({ where: { userId: identifier } ... }); }
  ```
  No `isPublic: true` filter anywhere (unlike `GET /`). Raw `userId` fallback links user IDs to profiles.
- **Why:** A DJ who hides their profile still has the full profile (mixes, reviews, events + all SOC-1 fields) served to anyone; user→profile enumeration oracle.
- **HIGH · S** — add `isPublic: true` to all lookups; drop the `userId` fallback (or restrict to self/admin). · **static: yes**

## SOC-3 — Followers' email + home location exposed to every DJ
- **File:** `djs.ts` `GET /me/followers` (843–874)
- **Code:** `user: { select: { id: true, name: true, username: true, email: true, avatar: true, location: true, createdAt: true } }` then `email: f.user.email, location: f.user.location`.
- **Why:** Fans' emails/locations given to any third-party DJ account at scale with no consent — fan-list scraping.
- **HIGH · S** — drop `email`/`location` or gate behind consent. · **static: yes**

## SOC-4 — Other users' email leaked in messages endpoints
- **File:** `messages.ts:51` (`GET /conversations`), `:103` (`GET /:userId`)
- **Code:** `select: { id: true, username: true, email: true, djProfile: { select: { stageName: true, avatar: true } } }`
- **Why:** Message someone → obtain their account email. Email-harvesting oracle.
- **HIGH · S** — remove `email` from select. · **static: yes**

## SOC-5 — Sender email leaked in synthetic notification feed
- **File:** `users.ts` `GET /api/users/notifications` (292–310, title at 390)
- **Code:** `sender: { select: { id: true, username: true, email: true, djProfile: {...} } }, ... title: `New message from ${m.sender.djProfile?.stageName || m.sender.username || m.sender.email}``
- **HIGH · S** — remove `email` from select. · **static: yes**

## SOC-6 — Unauthenticated email-enumeration oracle in user discovery
- **File:** `discover.ts` `GET /api/discover/users` (250–303)
- **Code:** `where.OR = [ ..., { email: { contains: search, mode: 'insensitive' } }, ... ]` — no auth required.
- **Why:** `?search=@gmail.com` + hit counts (`meta.total`) enumerates registered emails anonymously.
- **HIGH · S** — remove email from OR / require auth. · **static: yes**

## SOC-7 — Report spam → admin email bomb; unbounded `details`
- **File:** `reports.ts` `POST /api/v1/reports` (9–98)
- **Code:** `details: z.string().min(10, '...')` (no `.max()`); `router.post('/', softAuthMiddleware, ...)` — anonymous, no rate limiter; `sendAdminViolationAlertEmail` fires synchronously per report.
- **Why:** Script submits thousands of reports → DB rows + in-app notification for every admin + real email per report → mailbox flooding / SMTP quota burn / alert fatigue hiding genuine reports.
- **HIGH · S** — `.max(2000)`; add rate limiter; debounce per reporter/IP. · **static: yes**

## SOC-8 — Message/comment content injected as raw HTML into notification emails
- **File:** `utils/notifications.ts` `createNotification` (169–183, `looksLikeHtml` at 7–10); triggered from `messages.ts:205` (`body: content.slice(0,120)`, `sendEmail: true`) and `mixes.ts` comment/like flows (1837–1861, 1968–1970)
- **Code:**
  ```js
  const content = emailBody || body || '';
  const isHtml = looksLikeHtml(content);
  await sendEmailFn({ to: user.email, subject: ..., text: isHtml ? htmlToText(content) : content, html: isHtml ? content : undefined });
  ```
- **Why:** If attacker text "looks like HTML" (small tag-list regex), the entire string is sent as the **HTML part unchanged** → stored phishing injection into emails appearing to come from Deck Salone; credential-theft vector against trusting users.
- **HIGH · M** — never pass user content as `html`; escape or build templates with escaped interpolation. · **static: yes**

## SOC-9 — No `allowMessages` enforcement; no rate limit on messaging → notification + email spam
- **File:** `messages.ts` `POST /` (147–223)
- **Why:** `allowMessages` privacy preference exists (`users.ts:841`) but is never checked; no rate limiter; each message fires `createNotification(... sendEmail: true)` (205-216). Mass-messaging = push + email per message per victim.
- **HIGH · S–M** — check receiver's `privacyPreferences.allowMessages`; per-sender rate limit. · **static: yes**

## SOC-10 — Unauthenticated analytics beacon → DB write amplification
- **File:** `analytics.ts` `POST /api/analytics/visit` (15–49) — `softAuthMiddleware`, one `prisma.siteVisit.create` per request, no rate limit, no `path` length cap.
- **MEDIUM · S** — rate limit; cap `path` length. · **static: yes**

## SOC-11 — DJ can add ANY mix (incl. others' private mixes) to their set; `/mine` then exposes private `audioUrl`
- **File:** `sets.ts` `POST /:id/mixes` (270–313), `GET /mine` (52–89), `GET /:id` (135–169)
- **Why:** Add-mix validates set ownership but not mix ownership/visibility; `GET /mine` includes `mix.audioUrl` with no `isPublic` filter (contrast `/dj/:djId` and `/:id` which do filter); `GET /:id` returns a set with no `isPublic` check at all. IDOR: add a private mix's ID to a set → read its private `audioUrl`.
- **MEDIUM · S** — verify `mix.isPublic`/ownership on add; filter items in `/mine`; check `set.isPublic` in `GET /:id`. · **static: yes**

## SOC-12 — DJs self-assign `isPro` (paid-badge forgery)
- **File:** `djs.ts` `createDjSchema` (61: `isPro: z.boolean().optional()`), `updateDjProfile` (176: `const updateData = { ...parsed.data };`)
- **Why:** Any DJ sets `isPro: true` on create/update → Pro badge/UI treatment never paid for.
- **MEDIUM · S** — strip `isPro`/`isPublic` from user-writable schema. · **static: yes**

## SOC-13 — `switch-to-dj` lets any account become a DJ instantly
- **File:** `djs.ts` `POST /switch-to-dj` (685–724)
- **Why:** One click → DJ role + public profile; amplifies SOC-3/SOC-12 abuse and throwaway DJ accounts for ranking/review abuse.
- **MEDIUM · M** — add friction/verification. · **static: yes**

## SOC-14 — Push-token hijack via upsert keyed on token
- **File:** `notifications.ts` `POST /push-token` (22–41)
- **Code:** `await prisma.pushToken.upsert({ where: { token }, update: { userId: req.user.id, ... } })` — re-registering an existing (victim's) token **reassigns it to the attacker's account**.
- **Why:** Victim's device then receives the attacker's private push notifications; victim loses their own pushes.
- **MEDIUM · S** — only `create` on conflict, or keep original userId. · **static: yes**

## SOC-15 — Public profile endpoints ignore account status and `profilePublic` privacy pref
- **File:** `users.ts` `GET /public/:username` (975–1022), `GET /:username` (1154–1197)
- **Why:** No `status: 'ACTIVE'` filter (suspended/banned/DELETED-scheduled users remain visible); `privacyPreferences.profilePublic` never enforced (only DJs' `isPublic` is). Privacy setting is a no-op.
- **MEDIUM · S** — enforce both. · **static: yes**

## SOC-16 — Fake "mark as read" — read state never persisted
- **File:** `users.ts` `PATCH /notifications/:id/read` and `/read-all` (673–684)
- **Code:** `// Notifications are synthetic; nothing to persist yet. return ok(res, { id, read: true });`
- **Why:** Real `Notification` model exists (used by `routes/notifications.ts`); synthetic feed returns `read: false` forever → badges never clear; endpoint lies about success.
- **MEDIUM · M** — unify on the Notification model or wire PATCH to it. · **static: yes**

## SOC-17 — Unauthenticated developer-application endpoint → admin notification/email spam
- **File:** `developers.ts` `POST /apply` (40–139) — `softAuthMiddleware`, no rate limit; each submission notifies up to 5 admins + emails applicant + internal.
- **MEDIUM · S** — rate limit + require auth. · **static: yes**

## SOC-18 — N+1 and unbounded partner loop in conversations
- **File:** `messages.ts` `GET /conversations` (46–85) — 3 queries × N partners, N unbounded.
- **MEDIUM · M** — single grouped query for last messages/unread counts. · **static: yes**

## SOC-19 — Review integrity: self-review; no-booking 5-stars; score never decremented
- **File:** `reviews.ts` `POST /` (67–128), `DELETE /:id` (131–160)
- **Why:** No check reviewer ≠ DJ (`djProfile.userId === req.user.id`); completed booking only sets `verified` flag (anyone can review any DJ); create increments `communityScore` by `rating * 2` but delete only recomputes `averageRating` → permanent inflation; sock-puppets + delete asymmetry drift the score.
- **MEDIUM · S** — block self-review; optionally require completed booking; decrement communityScore on delete. · **static: yes**

## SOC-20 — Account deletion wrongly blocked for non–Sierra Leone users (copy-paste bug)
- **File:** `users.ts` `DELETE /account` (738–742)
- **Code:** `// Manual mobile-money payments are for Sierra Leone only ... if (payerCountry !== 'Sierra Leone') { return fail(res, 403, 'Manual payments are only available in Sierra Leone. Please use PayPal checkout.'); }`
- **Why:** A payments check pasted into account deletion — foreign users are forbidden from deleting their own accounts. (Also filed as AUTH-16.)
- **MEDIUM · S** — remove the block. · **static: yes**

## SOC-21 — `GET /api/users/search` dead email fallback
- **File:** `users.ts:717-721` — `name: u.name || u.username || u.email` but `email` not in select → `undefined`; dead/misleading code only, no leak.
- **LOW · S** · **static: yes**

## SOC-22 — `GENDER_VALUES` defined but gender accepts any string
- **File:** `users.ts:415,422,473-475` — `gender: z.string().max(50)`; constant never used.
- **LOW · S** — `z.enum(GENDER_VALUES)`. · **static: yes**

## SOC-23 — `campaigns.ts GET /stats` loads entire tables for city counting
- **File:** `campaigns.ts:85-101` — `prisma.djProfile.findMany({ select: { city: true } })` and `prisma.event.findMany(...)` — no `take`, unbounded memory/transfer on a public endpoint.
- **LOW · S** — `groupBy`/`distinct` in SQL. · **static: yes**

## SOC-24 — `liked-mixes` exposes private mixes' `audioUrl`
- **File:** `users.ts` `GET /liked-mixes` (37–72) — `include: { mix: { include: ... } }` returns all mix scalars (audioUrl, downloadUrl) even for `isPublic=false` mixes.
- **LOW · S** — select public fields or filter `mix.isPublic`. · **static: yes**

## SOC-25 — Arbitrary avatar URL accepted (stored, rendered as `img src` everywhere)
- **File:** `users.ts` `PUT /profile` (500–502). (Chained exploit: UPL-3.)
- **LOW · S** — validate URL host/scheme. · **static: yes**

## SOC-26 — `og.ts` serves OG metadata for private mixes
- **File:** `og.ts` `GET /mix/:id` (96–126) — no `isPublic` check; metadata leak only. `sanitize()` escapes `" < >`; verified no XSS.
- **LOW · S** · **static: yes**

## SOC-27 — `opportunities.ts` — free-tier users read full opportunity details (budget/location); accept/reject properly `requireRole(['ADMIN'])`; applicants correctly scoped. No actionable authz bug. (Visibility decision.)

## SOC-28 — Clean: `officialPlaylists.ts` / `smartPlaylists.ts` / `popups.ts` / `appVersion.ts` / `tickets.ts`
- Playlists filter `mix.isPublic`; popups select only admin-authored content; appVersion streams server-controlled path only; tickets ownership checks correct, QR is random 8 bytes, capacity checked. No findings.

## Cross-reference: `utils/email.ts`, `utils/sms.ts`, `utils/push.ts`, `utils/notifications.ts`
- Email HTML injection covered by SOC-8 (user content as `html`); bug-report HTML injection covered by INFRA-21.
- No template-injection of secrets observed; SMTP/SMS credentials server-side only (MOB-5 covers the on-disk `.env` exposure).
