# Findings — Authentication, Sessions, Authorization (AUTH-1…17)

Scope: `app/api/middleware/{auth,permissions,turnstile}.ts`, `app/api/utils/{jwt,authSecurity,passport,otp,rateLimiter}.ts`, `app/api/routes/auth.ts`, plus an authn/authz sweep of all other routes and `server.ts`.

**Positives verified:** bcrypt cost 12 with transparent hash migration; sha256-hashed single-use 15-min reset tokens; zod whitelisting on every Prisma write (no `{...req.body}` mass-assignment found); per-route ownership checks on mixes/sets/DJs/events/notifications/payments/bookings/PayPal capture; admin/moderator routers gated; HS256 pinned; boot-time failure on missing/short JWT_SECRET; Redis-backed OTPs (CSPRNG, 10-min TTL, 3-attempt cap); helmet; rightmost-XFF IP resolution in the rate limiter; audit logging on admin role/status changes and moderator actions.

---

## AUTH-1 — No token revocation; password change/reset does NOT invalidate existing sessions
- **File:** `app/api/utils/jwt.ts:9-11`; `app/api/routes/auth.ts` `POST /change-password` (881–910), `POST /reset-password` (437–472); `app/api/routes/users.ts` `PUT /password` (585–613). No `/logout` endpoint exists.
- **Code:** `return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });` — on password change only `data: { password: hashedPassword }` is updated; no token-version field or blacklist.
- **Why:** A token stolen via XSS, logs, or a leaked mobile deep-link (`decksalone://auth/callback?token=...`, auth.ts:568) remains valid up to 7 days **even after the victim resets their password**. No logout = no mitigation short of rotating JWT_SECRET globally.
- **HIGH · M** — add `tokenVersion` on User, bump in change/reset-password, check in `getActiveUserFromToken` (auth-cache invalidation already exists). · **static: yes**

## AUTH-2 — Login lockout keyed per-email across all IPs → targeted account-lockout DoS
- **File:** `app/api/utils/authSecurity.ts` `recordFailedAttempt` (94–122), `checkAccountLockout` (58–89)
- **Code:**
  ```js
  const key = `${normalizedEmail}:${ip}`;
  const record = failedAttemptStore.get(key) || failedAttemptStore.get(normalizedEmail);
  ...
  failedAttemptStore.set(key, record);
  if (normalizedEmail) { failedAttemptStore.set(normalizedEmail, record); }
  ```
  The same record is stored under both `email:ip` and bare `email`, and incremented regardless of source IP.
- **Why:** An attacker who knows a victim's email needs only 5 wrong-password attempts — rotating source IPs defeats the per-IP limiter (25/min/IP `login_ip:` key only fires when email is absent) — to lock the victim out for 15 min, repeatable forever. No unlock/self-service path.
- **HIGH · S** — drop the email-only shared record; keep `email:ip` keying plus a higher threshold for email-wide lockout, require CAPTCHA/OTP unlock rather than hard lockout. · **static: yes**

## AUTH-3 — Failed-attempt lockout store is in-memory, per-process
- **File:** `app/api/utils/authSecurity.ts:18` — `const failedAttemptStore = new Map()`
- **Why:** With >1 replica (Docker Swarm/K8s/PM2 cluster), lockouts become probabilistic (1/N of attempts counted) and vanish on restart. Also makes the AUTH-2 DoS fragile in the benign direction while brute-force resistance degrades horizontally.
- **MEDIUM · S** — move the store to Redis (same pattern as `otp.ts`). · **static: no** (depends on deployment topology)

## AUTH-4 — Login/status checks inconsistent; banned/deleted users issued tokens; OTP/OAuth flows skip status checks
- **File:** `app/api/routes/auth.ts` `POST /login` (177: only `status === 'SUSPENDED'` rejected), `POST /phone/verify` (208–250: no status check); `app/api/utils/passport.ts` (26–87: no status check)
- **Why:** `BANNED`/`DELETED` users receive fresh 7-day tokens at login (contained today because `getActiveUserFromToken` requires `ACTIVE`, but any future `softAuthMiddleware` endpoint inherits the gap). Also: account deletion sets `status: 'DELETED'` (users.ts:767) while the deletion flow promises "You can log in before then to reactivate" — reactivation is impossible (functional + policy inconsistency).
- **MEDIUM · S** — reject any `status !== 'ACTIVE'` at token issuance in all three flows; implement or remove the reactivation promise. · **static: yes**

## AUTH-5 — Turnstile captcha silently bypassed when env unset or equals the public test key; login never uses it
- **File:** `app/api/middleware/turnstile.ts:10-15`
- **Code:**
  ```js
  if (!secretKey || secretKey === '1x0000000000000000000000000000000AA') { return next(); }
  ```
  Plus fail-open on Cloudflare error unless `NODE_ENV === 'production'` (45–48); `remoteIp` taken from the **leftmost** (client-spoofable) XFF entry (23).
- **Why:** Missing/misconfigured `TURNSTILE_SECRET_KEY` in prod removes `/register`'s only bot defense *silently*; `/login` has no Turnstile at all; spoofed remoteIp weakens token-replay detection.
- **MEDIUM · S** — fail startup loudly when unset in production; remove test-key bypass outside test envs; use rightmost XFF. · **static: yes**

## AUTH-6 — Duplicate, weaker password-change endpoint (min 6 chars, bcrypt cost 10, no complexity, no hash migration)
- **File:** `app/api/routes/users.ts` `PUT /password` (585–613)
- **Code:** `if (!currentPassword || !newPassword || newPassword.length < 6) ...` / `const hashedPassword = await bcrypt.hash(newPassword, 10);` vs `POST /auth/change-password` (auth.ts:743–748) enforcing 8 chars + complexity + cost-12 `hashPassword` with `verifyAndMigratePassword`.
- **Why:** Two endpoints, different policies; the weaker one silently downgrades hash cost 12→10 on every use. Policy is only as strong as the weakest route. Shares AUTH-1's no-invalidation flaw.
- **MEDIUM · S** — delegate both routes to one shared implementation; ideally delete `PUT /users/password`. · **static: yes**

## AUTH-7 — Admin role-management: SUPER_ADMIN locked out; no protection of SUPER_ADMIN targets; self-elevation possible
- **File:** `app/api/routes/admin.ts:68-70, 384-459`
- **Code:** `updateRoleSchema = z.enum(['USER','DJ','ADMIN','MODERATOR','FINANCE_ADMIN','VERIFICATION_ADMIN'])` guarded by `requireRole('ADMIN')` only; no check on the *target*.
- **Why:** An `ADMIN` can demote a `SUPER_ADMIN` to `USER`, change any other admin, or re-grant `ADMIN` to themselves after being demoted elsewhere (cache invalidation at 456 makes it effective within ~30 s). `SUPER_ADMIN` can't manage roles at all (tempting workaround: grant `ADMIN`).
- **MEDIUM · S** — refuse when `targetUser.role === 'SUPER_ADMIN'` unless actor is that same super admin; include `SUPER_ADMIN` in guard/enum. · **static: yes**

## AUTH-8 — Phone number change without uniqueness check or verification reset
- **File:** `app/api/routes/auth.ts` `PUT /me` (735–845; phone branch 768–770)
- **Code:** `updateData.phone = phone ? phone.trim() : null;` — no `findUnique({where:{phone}})` collision check (register does this at 100–105), no OTP confirmation, `phoneVerified` left `true`.
- **Why:** Collision → P2002 500 (crash vector) or ambiguous phone-based login; verified-phone status silently transfers to an uncontrolled number; any feature trusting `phoneVerified` (payouts, OTP login) is weakened.
- **MEDIUM · S** — uniqueness check + reset `phoneVerified: false` + optional OTP confirm, mirroring the email-change flow. · **static: yes** (DB-level behavior depends on schema uniqueness — flag for confirmation)

## AUTH-9 — Open unauthenticated image proxy = SSRF-lite
- **File:** `app/api/server.ts:259-284` `GET /api/proxy-image`
- **Code:** `const imageUrl = req.query.url; ... await axios.get(imageUrl, { timeout: 10000 })` with only an `http(s)` scheme check, then `Access-Control-Allow-Origin: *` and 24 h public cache.
- **Why:** Anyone can make the server fetch arbitrary URLs — internal-network enumeration, bandwidth/latency abuse, cache-poisoning of proxied content. Not full SSRF (response only to requester) but a clear amplification/recon primitive. (Full SSRF analysis: INFRA-5 / UPL-4.)
- **MEDIUM · S/M** — allowlist hosts/CDNs, block private/link-local ranges, drop `*` CORS + long cache or gate behind auth. · **static: yes**

## AUTH-10 — Google OAuth auto-links accounts by email without checking Google's `verified` flag
- **File:** `app/api/utils/passport.ts:28-49`
- **Code:** `const email = profile.emails?.[0]?.value;` then `existingByEmail` → silently attaches `googleId`. No check of `profile.emails[0].verified`.
- **Why:** If Google returns an unverified email (or a misconfigured client accepts non-verified Workspace emails), an attacker logging in with a Google account carrying the victim's email gains full access to the victim's local account.
- **MEDIUM · S** — require `verified === true` before email-based linking; else reject or force manual verification. · **static: yes**

## AUTH-11 — On-site staff tokens: same secret/7-day TTL as user tokens, no revocation, identity overwrite
- **File:** `app/api/routes/eventTicketing.ts:107-159, 1359-1442`
- **Code:** `signToken({ role: 'onsite_staff', eventId, ... })` uses the global secret and default `7d` expiry; `authOrOnsiteMiddleware` (142–159) **replaces `req.user`** with the staff identity, bypassing `authMiddleware`.
- **Why:** A leaked staff password = 7 days of token validity with no server-side kill switch (changing `onsitePassword` doesn't invalidate tokens). The `req.user` overwrite means any future route on this router that checks `req.user` but forgets `canScanEvent`'s event-id match grants cross-event access (`canScanEvent` 165–189 currently contains it — defense-in-depth advice).
- **MEDIUM · S** — short TTL for staff tokens (e.g. 12 h), store jti in Redis for revocation, use `req.staff` instead of overwriting `req.user`. · **static: yes**

## AUTH-12 — OAuth state cookie scope derived from request Host; shared parent-domain cookie
- **File:** `app/api/routes/auth.ts` `getOAuthCookieOptions` (490–510), `getOAuthCallbackUrl` (478–486)
- **Code:** When `BACKEND_URL` is unset, cookie domain computed from `req.get('host')`; in production any host with ≥2 dot-parts yields `options.domain = '.<last-two-parts>'`.
- **Why:** Any sibling subdomain can read the `oauth_state` cookie; host-header-derived cookie domains/redirect URLs are fragile. Low impact given state validation.
- **LOW · S** — always derive from an env allowlist in production. · **static: yes**

## AUTH-13 — CORS allows missing/null `Origin` together with `credentials: true`
- **File:** `app/api/server.ts:109-123` — `if (!origin || origin === 'null') return true;` inside `cors({ credentials: true, ... })`
- **Why:** Not exploitable today (auth is Bearer, not cookies; `oauth_state` is SameSite=lax with state validation) — but any future cookie-based auth inherits a hole.
- **LOW · S** — reject non-null origins in production if mobile apps use custom headers. · **static: yes**

## AUTH-14 — Email verification optional; full-access tokens at register
- **File:** `app/api/routes/auth.ts:74-144` (token at 142 before any verification), `/email/verify` (331–375)
- **Why:** `emailVerified` set only voluntarily; nothing gates token issuance; no audited feature enforces `emailVerified` (payouts, pro-subscription submissions, broadcasts). Disposable/typosquatted emails become fully functional accounts; any future sensitive flow trusting `emailVerified` is retro-exploitable.
- **LOW · M** — require verification before sensitive actions; verified-only payouts. · **static: yes**

## AUTH-15 — SMS/OTP cost-abuse window
- **File:** `app/api/routes/auth.ts:191-205`; `app/api/utils/otp.ts:27-64`; `app/api/utils/rateLimiter.ts:69-88`
- **Code:** `/phone/send-otp` has no per-phone cooldown, only generic `authLimiter` (60/15 min keyed `auth:${email}` or `auth_ip:${ip}`); every call dispatches a paid Sent.dm SMS.
- **Why:** Attacker burns SMS credits (~60/15 min/IP, more with IP rotation) with phantom numbers — recurring cost DoS.
- **LOW · S** — per-phone resend cooldown 60 s + daily cap, keyed in Redis. · **static: no** (economic impact depends on provider pricing)

## AUTH-16 — `PUT /users/profile` stores arbitrary `avatar` URL; `DELETE /account` contains copy-pasted payment gate
- **File:** `app/api/routes/users.ts:500-502` (`updateData.avatar = avatar` — any string); `users.ts:738-742` (`if (payerCountry !== 'Sierra Leone') return fail(res, 403, 'Manual payments are only available…')` inside **account deletion**)
- **Why:** Avatar URL rendered in `<img>` tags and HTML emails (tracking pixels/content injection); the deletion gate means non-SL users cannot delete accounts (right-to-delete gap). (Also filed as SOC-20.)
- **LOW · S** — validate avatar URL host/scheme; remove the payment gate from deletion. · **static: yes**

## AUTH-17 — Auth-cache staleness window (30 s) for role/status changes
- **File:** `app/api/middleware/auth.ts:12-35` — `setCache(cacheKey, authUser, 30)`; `clearCache` at L39 is fire-and-forget (not awaited).
- **Why:** Accepted trade-off, but invalidation is easy to forget for future sensitive fields.
- **LOW · S** — await the clear; consider 5–10 s TTL. · **static: yes**
