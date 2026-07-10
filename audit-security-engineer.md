# Deck Salone — Production Security Audit Report

**Auditor:** Security Engineer  
**Date:** 2026-01-18  
**Scope:** Full-stack review of the Deck Salone codebase (`/Users/djfredmax/Desktop/Deck Salone`)  
**Methodology:** Static code analysis of backend API, frontend auth flow, infrastructure configuration, and dependency surface. No dynamic testing or penetration testing was performed.

---

## Executive Summary

The Deck Salone platform demonstrates a **solid foundation** with modern tooling (Express 5, Prisma, Zod validation, bcrypt, helmet) and thoughtful architectural patterns. However, **several critical and high-severity issues** must be addressed before production deployment, primarily around:

1. **CORS misconfiguration** allowing any origin
2. **Disabled Content Security Policy**
3. **JWT session management** without refresh tokens
4. **In-memory OTP storage** not suitable for production
5. **Permissive rate limiting** with private-IP bypasses
6. **Information disclosure** in error responses and admin endpoints

**Risk Rating:** 🔴 **HIGH** — Deploying as-is exposes the API to CSRF attacks, credential theft via malicious websites, and horizontal privilege escalation.

---

## 1. CRITICAL SEVERITY FINDINGS

### 1.1 CORS Reflects Any Origin (`origin: true`)
- **File:** `app/api/server.ts:50`
- **Code:**
  ```ts
  app.use(cors({
    origin: true,  // ← REFLECTS ANY ORIGIN
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  ```
- **Impact:** Any malicious website can make authenticated cross-origin requests to the API on behalf of logged-in users. With `credentials: true`, the browser sends cookies/auth headers. This is equivalent to having no CSRF protection.
- **Attack Scenario:** An attacker hosts `evil.com` with JavaScript that calls `POST /api/bookings` or `DELETE /api/mixes/:id` using the victim's active session.
- **Remediation:**
  ```ts
  const ALLOWED_ORIGINS = process.env.FRONTEND_URL?.split(',').map(u => u.trim()) || [];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  ```

### 1.2 Content Security Policy Completely Disabled
- **File:** `app/api/server.ts:45`
- **Code:** `contentSecurityPolicy: false`
- **Impact:** The API returns JSON, so CSP is less critical here, but this comment is misleading — the API also serves the frontend static files (`express.static`) and OG HTML pages. The OG route (`/og/dj/:identifier`) renders user-generated content (DJ bios) into HTML and could be an XSS vector.
- **Remediation:** Enable a strict CSP on the OG route and ensure the frontend enforces its own CSP via meta tags or headers.

---

## 2. HIGH SEVERITY FINDINGS

### 2.1 JWT Tokens: 7-Day Expiry, No Refresh Token Mechanism
- **File:** `app/api/utils/jwt.ts:10`
- **Code:** `jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })`
- **Impact:** 
  - Tokens are valid for 7 days. If a user's role is changed (e.g., promoted to ADMIN or demoted), the old token remains valid until expiry.
  - No token revocation mechanism exists.
  - Stolen tokens grant 7 days of access.
- **Remediation:**
  - Implement short-lived access tokens (15-60 minutes) + long-lived refresh tokens stored in httpOnly cookies.
  - Maintain a token blocklist in Redis for revoked sessions.
  - Or: verify role against DB on sensitive operations (admin routes already do this via `requireRole`, but the JWT payload is trusted for identity).

### 2.2 In-Memory OTP Store (Map) — Not Production-Viable
- **File:** `app/api/utils/otp.ts:11`
- **Code:** `const otpStore = new Map();`
- **Impact:** 
  - OTPs are lost on server restart.
  - In a multi-instance deployment (Kubernetes, PM2 cluster), OTPs created on Instance A cannot be verified on Instance B.
  - No persistence = broken phone auth in production.
- **Remediation:** Replace with Redis, PostgreSQL, or a managed cache. Example:
  ```ts
  // Redis example
  await redis.setex(`otp:${phone}`, 600, code); // 10 min TTL
  ```

### 2.3 General Rate Limiter: 1000 Requests / 15 Minutes
- **File:** `app/api/utils/rateLimiter.ts:4-6`
- **Code:** `max: 1000` per 15 minutes
- **Impact:** Extremely permissive. An attacker can brute-force endpoints, scrape data, or perform enumeration at 1000 requests per window. The `skip` function also bypasses rate limits entirely for private IP ranges.
- **Remediation:** Reduce to 100-200 requests per 15 minutes for general API access. Remove private-IP bypass in production or gate it behind `NODE_ENV === 'development'`.

### 2.4 Auth Rate Limiter Skips Private IPs
- **File:** `app/api/utils/rateLimiter.ts:24-26`
- **Code:**
  ```ts
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
  }
  ```
- **Impact:** If the API is behind a reverse proxy (nginx, Cloudflare) and `trust proxy` is not configured, `req.ip` may appear as the proxy's internal IP, causing all requests to bypass rate limiting. An attacker could also spoof `X-Forwarded-For` to appear as a private IP if the proxy is misconfigured.
- **Remediation:** 
  - Ensure `app.set('trust proxy', 1)` is configured correctly behind a proxy.
  - Remove private-IP bypass in production.
  - Use `req.headers['x-forwarded-for']` with caution and validation.

### 2.5 Password Reset Tokens: SHA-256 Hashed (Not bcrypt/Argon2)
- **File:** `app/api/routes/auth.ts:263`
- **Code:** `const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');`
- **Impact:** SHA-256 is fast to compute. If the database is compromised, an attacker can brute-force the reset tokens (which are only 32 bytes of entropy but SHA-256 is ~1M+ hashes/sec on GPU).
- **Remediation:** While 32 bytes of randomness provides sufficient entropy, best practice is to store reset tokens with a slow hash like bcrypt or use cryptographically secure random strings with sufficient length (64+ bytes) and time-bound expiry. The current 15-minute expiry mitigates this somewhat, but switching to bcrypt is recommended for defense in depth.

---

## 3. MEDIUM SEVERITY FINDINGS

### 3.1 Booking Limiter Uses IP for Guest Bookings
- **File:** `app/api/utils/rateLimiter.ts:45`
- **Code:** `keyGenerator: (req) => req.user?.id || req.ip`
- **Impact:** Guest bookings (no auth) are rate-limited by IP only. With IPv6, a single attacker has billions of addresses. Even with IPv4, proxies and VPNs make IP-based limiting ineffective.
- **Remediation:** Require authentication for bookings or implement CAPTCHA/honeypot for guest flows.

### 3.2 S3 Uploads Use `public-read` ACL
- **File:** `app/api/utils/storage.ts:73`
- **Code:** `ACL: 'public-read'`
- **Impact:** All uploaded files (avatars, mixes, documents, payment proofs) are publicly accessible to anyone with the URL. There is no authorization check on `/uploads/*` static serving.
- **Remediation:** 
  - Use presigned URLs for private content.
  - Or: serve files through an authenticated proxy route instead of `express.static`.
  - At minimum, remove `ACL: 'public-read'` and use bucket policies to restrict access.

### 3.3 No Input Sanitization on Search Queries
- **Files:** `app/api/routes/mixes.ts:86-94`, `app/api/routes/djs.ts`, `app/api/routes/admin.ts:143-147`
- **Impact:** While Prisma's parameterized queries prevent SQL injection, search terms are passed directly to `contains` filters. This could enable NoSQL-like injection if Prisma's query engine has edge cases, or cause ReDoS with crafted regex patterns.
- **Remediation:** Sanitize search inputs — limit length (e.g., 100 chars), strip control characters, and validate against allowlists.

### 3.4 Duplicate Route Definitions in `mixes.ts`
- **File:** `app/api/routes/mixes.ts:47-134` and `135-205`
- **Impact:** Two `router.get('/', ...)` definitions. Express will use the first match, making the second unreachable. This is a maintenance risk — developers may edit the wrong handler.
- **Remediation:** Remove the duplicate route definition.

### 3.5 OG Route XSS — Incomplete Sanitization
- **File:** `app/api/routes/og.ts:40`
- **Code:**
  ```ts
  const sanitize = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  ```
- **Impact:** The sanitize function only handles quotes and angle brackets. It does not handle:
  - Single quotes (`'`) — could break `content='...'` attributes
  - Backticks — could break template literals in injected scripts
  - `&` — should be encoded as `&amp;` to prevent HTML entity injection
  - Newlines — could break attribute context
- **Remediation:** Use a proper HTML escaping library like `he` or `escape-html`:
  ```ts
  import escapeHtml from 'escape-html';
  const sanitize = (s: string) => escapeHtml(s);
  ```

### 3.6 Admin Role Update Without Re-authentication
- **File:** `app/api/routes/admin.ts:179-198`
- **Code:** `router.put('/users/:id/role', ...)` — changes user role immediately.
- **Impact:** If an admin's session is hijacked, the attacker can promote themselves to ADMIN. No additional verification (password re-entry, 2FA) is required.
- **Remediation:** Require password re-authentication or MFA for sensitive role changes.

---

## 4. LOW SEVERITY FINDINGS

### 4.1 Error Messages Expose Internal Details
- **Files:** Throughout all route files — pattern: `res.status(500).json({ success: false, error: error.message })`
- **Impact:** Database error messages, file paths, or internal logic may leak to clients. Example: Prisma errors like `P2025: Record not found` or connection failures reveal database structure.
- **Remediation:** Log full errors server-side. Return generic messages to clients:
  ```ts
  res.status(500).json({ success: false, error: 'Internal server error' });
  ```

### 4.2 No Request Logging or Audit Trail for Sensitive Operations
- **Files:** All admin routes, payment processing, role changes
- **Impact:** The schema has an `AuditLog` model, but it's not used in any route handler reviewed. There's no way to trace who performed what action.
- **Remediation:** Implement audit logging for all admin actions, payment status changes, and role modifications. The `AuditLog` model exists — wire it into a middleware or helper.

### 4.3 `process.memoryUsage()` Exposed in Admin System Endpoint
- **File:** `app/api/routes/admin.ts:766`
- **Code:** `memory: process.memoryUsage()`
- **Impact:** Leaks internal memory statistics (heap usage, external memory) which could aid an attacker in profiling the server for DoS attacks.
- **Remediation:** Remove or restrict to super-admin only. Consider using a proper monitoring solution (Datadog, New Relic, Prometheus).

### 4.4 JWT Secret Validation Only at Startup
- **File:** `app/api/utils/jwt.ts:3-5`
- **Code:**
  ```ts
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  ```
- **Impact:** Good practice, but no validation of secret strength. A weak secret like `secret123` would pass.
- **Remediation:** Enforce minimum length (32+ chars) and entropy check at startup.

### 4.5 Frontend: Token Stored in localStorage
- **File:** `app/src/stores/authStore.ts:114`
- **Code:** `name: 'soundit-auth', partialize: (state) => ({ token: state.token })`
- **Impact:** The JWT token is stored in localStorage via Zustand persist. XSS vulnerabilities (if any exist in the frontend) could steal this token.
- **Remediation:** Move to httpOnly cookies (set by the backend) to prevent JavaScript access. If localStorage must be used, implement strict CSP and ensure no XSS vectors exist.

### 4.6 Frontend API Client: No Token Expiry Handling
- **File:** `app/src/lib/api.ts:34-45`
- **Code:** On 401, clears localStorage and redirects. No proactive token refresh.
- **Impact:** Users are abruptly logged out when tokens expire. No silent refresh mechanism.
- **Remediation:** Implement a refresh token flow or use httpOnly cookies with automatic session management.

### 4.7 Missing `trust proxy` Configuration
- **File:** `app/api/server.ts:33`
- **Impact:** If behind a reverse proxy, `req.ip` will be the proxy's IP, breaking IP-based rate limiting and logging.
- **Remediation:** Add `app.set('trust proxy', 1)` when `NODE_ENV === 'production'`.

### 4.8 Phone OTP: `Math.random()` for Code Generation
- **File:** `app/api/utils/otp.ts:19`
- **Code:** `Math.floor(100000 + Math.random() * 900000).toString()`
- **Impact:** `Math.random()` is not cryptographically secure. While the entropy space is small (1M combinations) and attempts are limited to 3, this is still not best practice.
- **Remediation:** Use `crypto.randomInt(100000, 999999)` from Node.js crypto module.

### 4.9 Dependency: `dotenv` v17.4.2 — Potential Version Confusion
- **File:** `app/package.json:57`
- **Impact:** `dotenv` latest stable is v16.x. v17.4.2 does not exist on npm (latest is 16.4.7). This may cause install failures or pull a malicious package if a typo-squat exists.
- **Remediation:** Pin to `dotenv: ^16.4.7`.

### 4.10 No HTTPS Enforcement
- **File:** `app/api/server.ts`
- **Impact:** The server runs HTTP. In production, credentials and tokens are transmitted unencrypted if TLS termination is not handled by a reverse proxy.
- **Remediation:** Document that TLS termination MUST be handled by nginx/Cloudflare. Consider HSTS headers.

---

## 5. POSITIVE SECURITY PRACTICES OBSERVED

| Practice | Location | Notes |
|----------|----------|-------|
| Zod input validation | All route files | Consistent use of `safeParse` for request bodies and queries |
| Bcrypt password hashing | `auth.ts:123` | Salt rounds: 10 (acceptable) |
| Prisma parameterized queries | Throughout | Prevents SQL injection |
| Password reset token hashing | `auth.ts:263` | SHA-256 of 32-byte random — decent entropy |
| Single-use reset tokens | `auth.ts:327-333` | Tokens invalidated after use |
| User enumeration prevention | `auth.ts:254-258` | Same response for existing/non-existing emails |
| Username allowlist | `auth.ts:15-19` | Reserved usernames blocked |
| File type validation | `upload.ts:24-32` | MIME-type allowlist for all uploads |
| Image processing | `imageProcessor.ts` | Sharp resize + WebP conversion |
| Helmet usage | `server.ts:43` | Security headers enabled (except CSP) |
| Express 5 | `package.json:59` | Latest version with improved error handling |
| Role-based access control | `auth.ts:50-60` | `requireRole` middleware pattern |
| Subscription tier checks | `permissions.ts` | Feature gating by tier |

---

## 6. REMEDIATION PRIORITY MATRIX

| Priority | Finding | Effort | File(s) |
|----------|---------|--------|---------|
| **P0 — Critical** | Fix CORS `origin: true` | Low | `server.ts:50` |
| **P0 — Critical** | Enable CSP / secure OG route | Low | `server.ts:45`, `og.ts` |
| **P1 — High** | Implement refresh token mechanism | High | `jwt.ts`, `auth.ts`, `api.ts` |
| **P1 — High** | Replace in-memory OTP with Redis | Medium | `otp.ts` |
| **P1 — High** | Tighten rate limits, remove IP bypass | Low | `rateLimiter.ts` |
| **P1 — High** | Use bcrypt for reset token storage | Low | `auth.ts` |
| **P2 — Medium** | Authenticate file serving / S3 presigned URLs | Medium | `storage.ts`, `upload.ts` |
| **P2 — Medium** | Fix duplicate route in `mixes.ts` | Low | `mixes.ts` |
| **P2 — Medium** | Sanitize OG route with proper HTML escape | Low | `og.ts` |
| **P2 — Medium** | Require re-auth for role changes | Medium | `admin.ts` |
| **P3 — Low** | Generic 500 error messages | Low | All route files |
| **P3 — Low** | Implement audit logging | Medium | All admin routes |
| **P3 — Low** | Remove `process.memoryUsage()` from admin | Low | `admin.ts` |
| **P3 — Low** | Move token to httpOnly cookie | High | `auth.ts`, `authStore.ts` |
| **P3 — Low** | Fix `dotenv` version | Low | `package.json` |
| **P3 — Low** | Use `crypto.randomInt` for OTP | Low | `otp.ts` |

---

## 7. DEPENDENCY SECURITY NOTES

| Package | Version | Note |
|---------|---------|------|
| `express` | `^5.2.1` | ✅ Latest major — good |
| `jsonwebtoken` | `^9.0.3` | ✅ Latest — good |
| `bcryptjs` | `^3.0.3` | ✅ Latest — good |
| `helmet` | `^8.2.0` | ✅ Latest — good |
| `express-rate-limit` | `^7.5.1` | ✅ Latest — good |
| `zod` | `^4.4.3` | ✅ Latest — good |
| `multer` | `^2.2.0` | ⚠️ Check for latest — v2 is current |
| `dotenv` | `^17.4.2` | ❌ Invalid version — fix immediately |
| `@aws-sdk/client-s3` | `^3.1075.0` | ⚠️ Very old — upgrade recommended |

**Recommendation:** Run `npm audit` and update all dependencies before production deployment. The AWS SDK is particularly outdated (v3.1075 vs current v3.700+).

---

## 8. INFRASTRUCTURE & DEPLOYMENT CHECKLIST

Before going to production, ensure:

- [ ] **CORS** is restricted to known frontend origins only
- [ ] **CSP** is enabled on all HTML-serving routes
- [ ] **JWT_SECRET** is 32+ random characters, stored in secrets manager
- [ ] **Redis** is provisioned for OTP storage and rate limiting
- [ ] **HTTPS/TLS** is enforced (via reverse proxy or native)
- [ ] **Rate limits** are tightened and private-IP bypass removed
- [ ] **S3 bucket** is not public-read; use presigned URLs
- [ ] **Trust proxy** is configured for correct IP extraction
- [ ] **Audit logging** is wired to all admin and payment routes
- [ ] **Dependency audit** (`npm audit`) passes with zero critical/high findings
- [ ] **Environment variables** are in secrets manager, not `.env` files on disk
- [ ] **Database** connection uses SSL/TLS
- [ ] **Backup strategy** is in place for PostgreSQL

---

*End of Report*
