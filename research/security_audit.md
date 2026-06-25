# SECURITY AUDIT REPORT

**Project:** Deck Salone  
**Scope:** Full-stack DJ platform (API + Frontend)  
**Audited Files:** api/routes/*.ts, api/middleware/*.ts, api/utils/*.ts, api/server.ts, api/prisma/schema.prisma, src/pages/*.tsx, src/lib/api.ts, src/stores/authStore.ts, src/components/ProtectedRoute.tsx, package.json  
**Date:** 2026-06-26  

---

## 1. THREAT MODEL

### Assets (what has value to attackers)
- [x] Asset: User PII (emails, phone numbers, WhatsApp numbers, city locations) → Value: Identity theft, social engineering, spam
- [x] Asset: DJ booking data (event locations, dates, fees, client emails) → Value: Competitive intelligence, stalking
- [x] Asset: Payment records (booking amounts, deposit statuses, client/dj links) → Value: Financial fraud, blackmail
- [x] Asset: Admin dashboard access → Value: Full data exfiltration, platform manipulation
- [x] Asset: DJ rankings and battle scores → Value: Reputation damage, vote manipulation
- [x] Asset: Google OAuth tokens (via account linking) → Value: Account takeover
- [x] Asset: JWT signing secret → Value: Complete authentication bypass
- [x] Asset: S3 credentials (AWS access keys) → Value: Full media bucket compromise
- [x] Asset: Database URL → Value: Direct database access, full data breach

### Attackers (likelihood per asset)
- **Script kiddies:** Can exploit XSS on OG meta route, brute-force weak passwords, abuse unprotected endpoints → Likelihood: **High**
- **Competitors:** Can manipulate battle votes, post fake reviews, scrape DJ pricing data → Likelihood: **Medium**
- **Insiders:** Can access other users' bookings/payments via admin endpoints (if role escalated), read console logs with reset tokens → Likelihood: **Medium**
- **Organized criminals:** Can target payment flow, S3 bucket, or JWT secret for full platform compromise → Likelihood: **Low**

### Entry Points
- **External API:** `/api/auth/*`, `/api/djs/*`, `/api/mixes/*`, `/api/battles/*`, `/api/bookings/*`, `/api/payments/*`, `/api/events/*`, `/api/messages/*`, `/api/reviews/*`, `/api/rankings/*`, `/api/dashboard/*`, `/api/admin/*`
- **Admin panel:** `/api/admin/*` (protected by role check, but role escalation possible if vulnerabilities exist)
- **Third-party integrations:** Google OAuth (passport-google-oauth20), S3-compatible storage (AWS SDK), payment processing (manual only — no live provider yet)
- **Supply chain:** `esbuild` LOW severity (arbitrary file read on Windows dev server), `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `passport`, `sharp`, `multer`, `zod`, `prisma`

---

## 2. VULNERABILITY SCAN

### Authentication
- [ ] **Session management:** JWT expires in 7 days (`expiresIn: '7d'`). No refresh token, no rotation, no revocation list. A stolen token is valid for 7 days with no way to invalidate it.
- [ ] **Token storage:** Token is stored in `localStorage` (frontend: `src/stores/authStore.ts`, `src/lib/api.ts`). Vulnerable to XSS extraction if any XSS vulnerability exists (and one does — see OG route finding below).
- [ ] **MFA:** Not implemented. No multi-factor authentication for any login method (password, Google OAuth, phone OTP).
- [ ] **Password policy:** Minimum 6 characters. No complexity requirements, no breach database check, no dictionary check. `bcryptjs` with salt rounds 10 is used.
- [ ] **OAuth:** Google OAuth flow is correct but the callback redirects the JWT token in the URL query string (`/auth/callback?token=${token}`), exposing it to browser history, referrer headers, and server logs.

### Authorization
- [ ] **Horizontal escalation:** Booking and payment endpoints verify ownership (`clientId === req.user.id`), and message endpoints verify sender/receiver. However, the `GET /api/messages/:userId` endpoint does not verify the *current user* is actually a participant in the conversation beyond the query itself — it relies on the query filter.
- [ ] **Vertical escalation:** No direct path found. Admin routes use `requireRole('ADMIN', 'MODERATOR', ...)` which is applied after `authMiddleware`. No mass-assignment vulnerability on role field via user registration (role is validated against `z.enum(['USER', 'DJ'])`). However, `PUT /api/auth/me` does not allow role modification.
- [ ] **Role enforcement:** Admin routes (`/api/admin`) are protected by `requireRole` at the router level. All routes inside the admin router apply the role check.
- [ ] **API ownership checks:** Most `PUT/DELETE` endpoints verify ownership (`dj.userId !== req.user.id && req.user.role !== 'ADMIN'`). The `PUT /api/events/:id` and `DELETE /api/events/:id` correctly check owner/admin.

### Input Handling
- [ ] **SQL injection:** All queries use Prisma ORM with parameterized queries. No raw SQL found. **Safe.**
- [ ] **NoSQL injection:** Prisma queries are type-safe. No raw MongoDB queries. **Safe.**
- [ ] **Command injection:** No `exec`, `spawn`, `child_process`, or `eval` found in API code. **Safe.**
- [ ] **XSS:** The OG meta route (`/og/dj/:identifier`) interpolates `dj.bio`, `dj.stageName`, `image`, and `profileUrl` directly into HTML without sanitization. This is a **stored XSS** vulnerability — any DJ can set a malicious bio or stage name.
- [ ] **File upload:** `multer` uses memory storage. `fileTypeFromBuffer` validates actual magic bytes before `sharp` processing. File sizes are limited (10MB images, 500MB audio). However, the `audio/mpeg` MIME type check is weak and could be bypassed with polyglot files. No virus scanning. No secondary filename validation after `originalname.split('.').pop()`.
- [ ] **CSRF:** API uses stateless Bearer JWT tokens. CSRF is not applicable for JSON API endpoints. However, if cookies were introduced later, CSRF protection would be needed.

### Data Exposure
- [ ] **PII in logs:** `auth.ts:259` logs the full password reset URL (including the JWT token) to `console.log`. If logs are collected by a log aggregator, this exposes reset tokens.
- [ ] **Error messages:** Production error handler returns `err.message` but only exposes `stack` when `NODE_ENV === 'development'`. If misconfigured, stack traces leak. Error messages like `'Invalid credentials'` are safe (no user enumeration on login).
- [ ] **Debug endpoints:** `/health` endpoint exposed (acceptable). No other debug endpoints found.
- [ ] **.env exposure:** `.env` files are loaded from `../.env` and `.env` in the API. The frontend uses `import.meta.env.VITE_API_URL` which is compiled into the bundle. No backend secrets are referenced in frontend code.

### Infrastructure
- [ ] **Secrets management:** `JWT_SECRET`, `DATABASE_URL`, `S3_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_SECRET` are loaded from environment variables. No hardcoded secrets in source code. However, `create-admin.js` has a hardcoded default password (`AdminPass123!`) and the seed script mentions `admin123`.
- [ ] **Dependency vulnerabilities:** `npm audit` found 1 LOW vulnerability: `esbuild` arbitrary file read on Windows dev server. No critical or high vulnerabilities in runtime dependencies.
- [ ] **TLS configuration:** No HTTPS enforcement in the Express app. No HSTS header configured. `helmet` is used but with `contentSecurityPolicy: false`.
- [ ] **CORS configuration:** CORS is configured to allow only `ALLOWED_ORIGINS` (from `FRONTEND_URL` env var). It rejects unknown origins. `credentials: true` is set. This is **correctly configured**.
- [ ] **Rate limiting:** Global limiter (100 req/15 min) applied globally. Auth limiter (10 attempts/15 min, skipping successful). Booking limiter (5/hour). Vote limiter (50/hour). **Missing:** Message endpoints, review endpoints, and public DJ/mix search endpoints have no dedicated rate limiting.

---

## 3. PER-FINDING FORMAT

### Finding 1: Stored XSS in OG Meta Route

- **Severity:** **Critical** (CVSS: 8.8 AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N)  
- **Location:** `api/server.ts:84-142` (OG meta route `/og/dj/:identifier`)  
- **Attack scenario:**
  1. Attacker creates a DJ profile (or modifies an existing one) and sets `stageName` to `"<script>alert('xss')</script>"` or `bio` to a malicious payload.
  2. Attacker shares the profile link on social media (or tricks a victim into visiting `/og/dj/:identifier`).
  3. The server renders the attacker-controlled `stageName` and `bio` directly into HTML without escaping.
  4. Victim's browser executes the injected JavaScript in the context of the Deck Salone domain, allowing session hijacking (theft of `localStorage` token), defacement, or phishing.
- **Fix:**
  ```typescript
  // Add HTML escaping function
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  const title = `${escapeHtml(dj.stageName)} — The Deck Salone`;
  const description = escapeHtml(dj.bio?.slice(0, 200) || `Check out ${escapeHtml(dj.stageName)} on The Deck Salone...`);
  const image = escapeHtml(dj.avatar || dj.coverBanner || `${baseUrl}/cover-placeholder.jpg`);
  const profileUrl = escapeHtml(`${baseUrl}/dj/${dj.user.username || dj.id}`);
  ```
- **Detection:** Monitor for `script` tags or HTML entities in `stageName` and `bio` fields via database query or application logs. Add a WAF rule for `<script>` in profile fields.

---

### Finding 2: JWT Token Transmitted in URL Query String (OAuth Callback)

- **Severity:** **High** (CVSS: 7.5 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)  
- **Location:** `api/routes/auth.ts:308` and `src/pages/AuthCallback.tsx`  
- **Attack scenario:**
  1. User logs in via Google OAuth.
  2. The backend redirects to `FRONTEND_URL/auth/callback?token=<JWT>`.
  3. The JWT token is now stored in:
     - Browser history
     - Web server access logs (if the frontend is server-rendered or has logging middleware)
     - Referrer headers when navigating to external sites from the callback page
     - Any analytics or error tracking tools that capture the URL
  4. An attacker with access to any of these (e.g., shared computer, leaked logs, XSS on a third-party site) can steal the token and impersonate the user.
- **Fix:** Use the OAuth "state + localStorage" pattern or fragment-based token transfer:
  ```typescript
  // Backend: redirect with token in hash fragment (not query string)
  const redirectUrl = `${FRONTEND_URL}/auth/callback#token=${token}`;
  
  // Frontend: read from hash, then immediately clear it
  const hash = window.location.hash;
  const token = new URLSearchParams(hash.replace('#', '')).get('token');
  if (token) {
    localStorage.setItem('soundit_token', token);
    window.location.hash = ''; // Clear from URL
    fetchMe().then(() => navigate('/dashboard'));
  }
  ```
  Alternatively, use `httpOnly` secure cookies for the session and a separate short-lived callback token.
- **Detection:** Monitor server logs for JWT tokens in URL paths. Scan for `token=` in referrer headers in any analytics platform.

---

### Finding 3: Password Reset Token Reusability and Long Expiry

- **Severity:** **High** (CVSS: 7.4 AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N)  
- **Location:** `api/routes/auth.ts:253` and `api/routes/auth.ts:275-287`  
- **Attack scenario:**
  1. User requests a password reset. The system generates a standard JWT (`signToken({ id: user.id, type: 'password_reset' })`) with the default 7-day expiry.
  2. User resets their password using the token.
  3. The token is **not invalidated** after use. The reset endpoint does not store a "used tokens" list or rotate the user's secret.
  4. An attacker who intercepted the reset email (or the logged reset URL in server logs) can reuse the same token to reset the password again within the 7-day window, locking the user out.
- **Fix:**
  ```typescript
  // Add a passwordResetToken field to User model (schema.prisma)
  model User {
    // ... existing fields
    passwordResetToken String? @unique
    passwordResetExpires DateTime?
  }
  
  // In forgot-password:
  const resetToken = crypto.randomUUID();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: resetToken, passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000) },
  });
  
  // In reset-password:
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
  });
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  // Hash password, then clear token
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null },
  });
  ```
- **Detection:** Log all password reset attempts. Alert on multiple successful resets for the same user within 7 days. Monitor for reuse of the same reset token.

---

### Finding 4: Google OAuth Automatic Account Linking Without Verification

- **Severity:** **High** (CVSS: 7.1 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N)  
- **Location:** `api/utils/passport.ts:32-45`  
- **Attack scenario:**
  1. Attacker creates a local account with `victim@example.com` and a weak password (if the victim hasn't registered yet, or if the victim registered but the attacker knows the password).
  2. Victim later tries to log in with Google OAuth using `victim@example.com`.
  3. The system automatically links the Google account to the existing local account without any verification (no "Link your Google account?" prompt, no email confirmation, no password re-entry).
  4. If the attacker had created the account first, they now have access to the victim's Google-linked account. Alternatively, if the attacker compromises the victim's Google account, they gain access to the local account seamlessly.
- **Fix:** Require explicit linking confirmation when an email-based account already exists:
  ```typescript
  if (existingByEmail) {
    if (existingByEmail.googleId) {
      // Already linked, proceed
      return done(null, existingByEmail);
    }
    // Don't auto-link. Require the user to login with password first, then link.
    return done(null, false, { 
      message: 'An account with this email already exists. Please log in with your password and link Google from settings.' 
    });
  }
  ```
  Add a separate `/api/auth/link-google` endpoint that requires an authenticated session.
- **Detection:** Log all Google OAuth account linking events. Alert on accounts that switch from `password` to `googleId` login method unexpectedly.

---

### Finding 5: Password Reset URL Logged to Console

- **Severity:** **Medium** (CVSS: 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
- **Location:** `api/routes/auth.ts:259`  
- **Attack scenario:**
  1. When a password reset is requested, the full reset URL (including the JWT token) is printed to `console.log`.
  2. If server logs are aggregated by a cloud logging service (AWS CloudWatch, Datadog, etc.), the token is stored in plaintext in the logs.
  3. Anyone with log access (devops, SRE, compromised logging account) can read the token and reset the user's password.
- **Fix:** Remove the console.log entirely. Use a proper email provider (SendGrid, AWS SES) to send the reset link:
  ```typescript
  // Remove:
  // console.log(`[Password Reset] ${email}: ${resetUrl}`);
  
  // Add:
  await sendEmail({
    to: email,
    subject: 'Password Reset - Deck Salone',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
  });
  ```
- **Detection:** Set up log scanning rules to detect JWT tokens (base64 strings matching JWT format) in application logs.

---

### Finding 6: JWT Stored in localStorage (XSS Impact Amplification)

- **Severity:** **Medium** (CVSS: 6.5 AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N)  
- **Location:** `src/stores/authStore.ts:44,79`, `src/lib/api.ts:14`  
- **Attack scenario:**
  1. If any XSS vulnerability exists (confirmed: OG route), an attacker can inject JavaScript that reads `localStorage.getItem('soundit_token')`.
  2. The token is sent to the attacker's server, allowing full account takeover for 7 days (no revocation).
  3. With the token, the attacker can access all user data, bookings, payments, and admin endpoints if the victim is an admin.
- **Fix:** Migrate to `httpOnly`, `Secure`, `SameSite=Strict` cookies for session management:
  ```typescript
  // Backend: set cookie on login
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
  
  // Frontend: remove localStorage token logic
  // api.ts: read cookie automatically (withCredentials: true already set)
  ```
  If staying with localStorage, implement a short expiry (e.g., 15 minutes) + refresh token rotation, and add a Content Security Policy (CSP) to mitigate XSS.
- **Detection:** Monitor for unusual API patterns (new IP, new User-Agent) using existing tokens.

---

### Finding 7: No Rate Limiting on Message Endpoints

- **Severity:** **Medium** (CVSS: 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L)  
- **Location:** `api/routes/messages.ts`  
- **Attack scenario:**
  1. An authenticated user can send unlimited messages via `POST /api/messages`.
  2. An attacker can automate spam to every user on the platform, causing notification fatigue, database bloat, and potential DoS.
  3. The `GET /api/messages/:userId` and `GET /api/messages/conversations` endpoints are also unprotected, allowing enumeration and scraping.
- **Fix:** Add a message rate limiter:
  ```typescript
  const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 messages per minute per user
    keyGenerator: (req) => req.user?.id || req.ip,
  });
  
  router.post('/', authMiddleware, messageLimiter, async (req, res) => { ... });
  ```
- **Detection:** Monitor for high message volume from single users. Alert on >100 messages/hour per user.

---

### Finding 8: Hardcoded Default Credentials in Admin Scripts

- **Severity:** **Medium** (CVSS: 6.5 AV:L/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H)  
- **Location:** `api/scripts/create-admin.js:8`, `api/prisma/seed.ts:832`  
- **Attack scenario:**
  1. A developer runs `node create-admin.js` without arguments in production.
  2. The script creates an admin account with `admin@deck.salone` / `AdminPass123!` (or `admin@soundit.sl` / `admin123` from seed).
  3. If the database is exposed or the default credentials are not changed immediately, an attacker can log in as admin.
- **Fix:** Remove default passwords from scripts. Require explicit arguments:
  ```javascript
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: node create-admin.js <email> <password>');
    process.exit(1);
  }
  ```
  Remove the seed script credentials or add a prominent warning not to run in production.
- **Detection:** Monitor for login attempts to `admin@deck.salone` or `admin@soundit.sl`. Alert on successful logins.

---

### Finding 9: In-Memory OTP Store (Multi-Instance Incompatibility & Availability)

- **Severity:** **Medium** (CVSS: 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)  
- **Location:** `api/utils/otp.ts:11`  
- **Attack scenario:**
  1. In a production environment with multiple API instances (e.g., Kubernetes with 3 pods), the OTP is stored in a local `Map` on one instance.
  2. User requests OTP from Pod A, but the verification request is routed to Pod B. The OTP is not found.
  3. This causes a denial of service for phone-based authentication. Also, an instance restart clears all OTPs.
- **Fix:** Replace the in-memory store with Redis:
  ```typescript
  // Using Redis with TTL
  await redis.setex(`otp:${normalizedPhone}`, 600, code); // 10 minutes
  const code = await redis.get(`otp:${normalizedPhone}`);
  ```
- **Detection:** Monitor OTP verification failure rates. Alert if >50% of OTPs fail with "not found" in a multi-instance environment.

---

### Finding 10: No HTTPS / HSTS Enforcement

- **Severity:** **Medium** (CVSS: 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
- **Location:** `api/server.ts`  
- **Attack scenario:**
  1. If the app is deployed without a TLS-terminating reverse proxy, or if the reverse proxy is misconfigured, traffic travels in plaintext.
  2. An attacker on the same network (e.g., public Wi-Fi) can intercept JWT tokens, passwords, and booking data via a man-in-the-middle attack.
- **Fix:** Add HTTPS redirection and HSTS in Express:
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, 'https://' + req.headers.host + req.url);
      }
      next();
    });
  }
  
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  ```
  Ensure the reverse proxy sets `X-Forwarded-Proto`.
- **Detection:** Regular SSL/TLS scanning (e.g., Qualys SSL Labs). Monitor for HTTP traffic in production.

---

### Finding 11: Weak Password Policy

- **Severity:** **Low** (CVSS: 4.3 AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N)  
- **Location:** `api/routes/auth.ts:51` (registerSchema)  
- **Attack scenario:**
  1. Users can register with 6-character passwords like `123456` or `aaaaaa`.
  2. These passwords are easily brute-forced even with the 10 req/15 min rate limit (distributed attacks over days).
- **Fix:** Enhance the Zod schema:
  ```typescript
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  ```
- **Detection:** Audit existing user passwords for weak hashes (if using a library like `zxcvbn`).

---

### Finding 12: CSP Disabled on API (OG Route HTML Unprotected)

- **Severity:** **Low** (CVSS: 3.7 AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)  
- **Location:** `api/server.ts:33-36`  
- **Attack scenario:**
  1. The OG meta route serves HTML but the API has `contentSecurityPolicy: false`.
  2. Even if the XSS is fixed, the lack of CSP means other HTML injection vectors (e.g., via a compromised S3 image URL that redirects to a script) are not mitigated.
- **Fix:** Enable CSP for the OG route or globally:
  ```typescript
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // allow inline redirect script
      imgSrc: ["'self'", "data:", "https:"],
    },
  }));
  ```
  For the OG route specifically, set the `Content-Security-Policy` header to `default-src 'none'; script-src 'self'; img-src https:;`.

---

### Finding 13: S3 Bucket ACL `public-read`

- **Severity:** **Low** (CVSS: 3.5 AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
- **Location:** `api/utils/storage.ts:73`  
- **Attack scenario:**
  1. All uploaded files (avatars, covers, mixes, event images) are uploaded with `ACL: 'public-read'`.
  2. If the S3 bucket is also configured with public access, any file uploaded by any user is publicly accessible by URL.
  3. An attacker could upload malicious content (e.g., a PDF with an exploit, or an HTML file with a polyglot extension) and share the direct URL.
- **Fix:** Remove the `ACL` parameter and use bucket-level policies instead. Serve files through a CloudFront CDN or a signed URL proxy:
  ```typescript
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: options.contentType || 'application/octet-stream',
    // Remove: ACL: 'public-read'
  }));
  ```
  Configure the bucket policy to allow only CloudFront or the application server to read objects.
- **Detection:** Audit S3 bucket ACLs and policies. Scan for unexpected file types in uploads.

---

## 4. PRIORITIZED FIXES

### Top 3: "Which 3 fixes reduce the most risk with the least implementation effort?"

#### #1 Fix: Sanitize OG Meta Route Output (Critical → Low effort, High impact)
- **Why:** This is a critical stored XSS that can be exploited by any DJ to steal tokens from any visitor. The fix is a single `escapeHtml` function applied to 4 variables.
- **Effort:** 15 minutes.
- **Risk reduction:** Eliminates the most severe and easily exploitable vulnerability in the codebase.

#### #2 Fix: Switch OAuth Callback Token to Fragment-Based Transfer (High → Low effort, High impact)
- **Why:** Moving the token from the query string to the URL hash fragment prevents it from appearing in server logs, browser history, and referrer headers. The frontend already reads query params; changing to hash is a 3-line change.
- **Effort:** 20 minutes.
- **Risk reduction:** Prevents token leakage via logs and referrers, stopping a common OAuth attack vector.

#### #3 Fix: Implement Single-Use Password Reset Tokens (High → Medium effort, High impact)
- **Why:** A reusable 7-day reset token is a ticking time bomb. If any email or log is intercepted, the attacker can reset the password repeatedly. Adding a `passwordResetToken` field to the Prisma schema and clearing it after use is a straightforward database migration.
- **Effort:** 1 hour (including schema migration and testing).
- **Risk reduction:** Prevents account takeover via intercepted reset links, which is one of the most common attack vectors for web applications.

---

## APPENDIX: Additional Security Recommendations

1. **Migrate to httpOnly cookies** for the JWT to eliminate the XSS → token theft kill chain entirely. This is a larger architectural change but should be prioritized post-launch.
2. **Add Redis for OTP and rate limiting** when moving to multi-instance production.
3. **Implement MFA** (TOTP or SMS) for admin accounts and optionally for all users.
4. **Add a CAPTCHA** (e.g., hCaptcha or reCAPTCHA) on registration, login, and battle voting to prevent bot abuse.
5. **Set up Content Security Policy (CSP)** on the frontend to prevent inline script execution.
6. **Add audit logging** for all admin actions (role changes, booking status overrides, payment refunds) to a tamper-resistant log store.
7. **Review S3 bucket policies** to ensure `public-read` is not set at the bucket level; use CloudFront OAI or signed URLs.
8. **Add a dependency scanning step** to CI/CD (e.g., `npm audit`, Snyk, Dependabot) to catch future vulnerabilities.
9. **Implement a security.txt** file at `/.well-known/security.txt` with a contact email for responsible disclosure.
10. **Run a penetration test** before production launch, focusing on the payment flow once a real payment provider is integrated.
