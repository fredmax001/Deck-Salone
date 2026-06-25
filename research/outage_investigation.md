# PRODUCTION OUTAGE INVESTIGATION

## 1. CODE WALKTHROUGH

### 1.1 Registration Failure Path (Line-by-Line)

**User Input → Form Submission:**

1. **Register.tsx:100–106** — Component state initialized. `step = 1`, `register = useAuthStore((state) => state.register)`.
2. **Register.tsx:329** — User submits Step 1 form. `handleSubmitStep1(onStep1Submit)` validates against `step1Schema` (lines 45–58).
3. **Register.tsx:146–149** — `onStep1Submit` simply advances to step 2. **No `password === confirmPassword` validation exists.**
4. **Register.tsx:599** — User submits Step 2 form. `handleSubmitStep2(onStep2Submit)` validates against `step2Schema` (lines 61–72).
5. **Register.tsx:152–163** — `onStep2Submit` executes:
   - `const step1 = watchStep1();` — retrieves all Step 1 values
   - `const role = step1.userType === 'DJ' ? 'DJ' : 'USER';` — maps user type to role
   - `const registerResult = await register(step1.email, step1.password, role, step1.phone);`

**Frontend → API Request:**

6. **authStore.ts:63–75** — `register()` action:
   - `const res = await api.post('/auth/register', { email, password, role, phone });`
   - `api` is the axios instance from `api.ts`

7. **api.ts:3–6** — Axios client configured:
   - `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';`
   - `baseURL: API_URL` → request URL becomes `http://localhost:5002/api/auth/register`

8. **api.ts:13–23** — Request interceptor runs:
   - Checks `localStorage.getItem('soundit_token')` — **null** for new registration
   - `config.data` is a plain object, not `FormData`, so `Content-Type: application/json` is kept
   - Returns config unchanged

**Backend → Route Handling:**

9. **server.ts:28** — Express server starts on:
   - `const PORT = process.env.PORT || 5000;` → **port 5000 by default**

10. **server.ts:70** — Auth router mounted at `/api/auth`
11. **auth.ts:81** — `router.post('/register', authLimiter, ...)` matches `POST /api/auth/register`
12. **auth.ts:83** — `registerSchema.safeParse(req.body)` validates input:
    - `email: z.string().email()` ✓
    - `password: z.string().min(6)` ✓
    - `role: z.enum(['USER', 'DJ']).optional()` ✓
    - `phone: z.string().optional()` ✓

**The Network Failure (Port Mismatch):**

13. **THE FAILURE POINT:** The frontend targets port **5002** (`api.ts:3`). The backend listens on port **5000** (`server.ts:28`). With no `VITE_API_URL` env var configured, the frontend makes a TCP connection to `localhost:5002`. No process is listening on that port.

14. **Axios throws a network error** (`ECONNREFUSED` or `ERR_NETWORK`). `error.response` is `undefined` because the request never reached the server.

15. **api.ts:26–38** — Response interceptor:
    - `error.response?.status === 401` → **false** (no response object)
    - Returns `Promise.reject(error)` unchanged

16. **authStore.ts:73–74** — Catch block:
    - `error.response?.data?.error` → `undefined` (no response)
    - Falls back to: `return { success: false, error: 'Could not create account' }`

17. **Register.tsx:166–169** — `onStep2Submit` receives:
    - `registerResult.success = false`
    - `registerResult.error = 'Could not create account'`
    - Displays error banner: **"Could not create account"**
    - The real error (connection refused to port 5002) is **completely hidden**.

**If DJ Profile Creation Were Attempted (post-registration success hypothetical):**

18. **Register.tsx:173–193** — Only executes if `registerResult.success === true`:
    - `const formData = new FormData();` — constructs multipart form data
    - `await api.post('/djs', formData);` — hits `/api/djs` (backend: `djs.ts:288`)
    - `djs.ts:288` — `router.post('/', authMiddleware, uploadDjProfileImages, ...)` — requires auth
    - If the auth request from step 6 succeeded, the token would be in `localStorage` and the interceptor would attach it
    - `parseFormFields(req.body)` converts `yearsActive` string → number, `genres` → array
    - `createDjSchema.safeParse()` validates
    - `prisma.djProfile.create({ data: {...data, userId: req.user.id} })` creates profile
    - `prisma.user.update({ where: { id: req.user.id }, data: { role: 'DJ' } })` updates role

---

### 1.2 Login Failure Path (Line-by-Line)

**User Input → Form Submission:**

1. **Login.tsx:45–58** — Component renders form with `react-hook-form` + `zodResolver(loginSchema)`
2. **Login.tsx:60–70** — `onSubmit` handler:
   - `setIsSubmitting(true); setError(null);`
   - `const result = await login(data.email, data.password);`

**Frontend → API Request:**

3. **authStore.ts:48–60** — `login()` action:
   - `const res = await api.post('/auth/login', { email, password });`
   - Same axios instance as registration → same baseURL: `http://localhost:5002/api`
   - Request URL: `http://localhost:5002/api/auth/login`

**Backend → Route Handling:**

4. **server.ts:28** — Express listens on port **5000** (default)

**The Network Failure (Same Port Mismatch):**

5. **THE FAILURE POINT:** Frontend connects to `localhost:5002`. Backend is on `localhost:5000`. Connection refused.

6. **Axios throws network error.** `error.response` is `undefined`.

7. **api.ts:26–38** — Response interceptor:
   - `error.response?.status === 401` → **false**
   - Returns `Promise.reject(error)`

8. **authStore.ts:58–59** — Catch block:
   - `error.response?.data?.error` → `undefined`
   - Falls back to: `return { success: false, error: 'Invalid credentials' }`

9. **Login.tsx:67–68** — `result.success = false`, `result.error = 'Invalid credentials'`
   - Displays: **"Invalid credentials"**
   - The user thinks they entered the wrong password. The real error is a **network disconnect**.

**If the Request Had Succeeded (Hypothetical Success Path):**

10. **auth.ts:130–160** — `router.post('/login', authLimiter, ...)`:
    - `loginSchema.safeParse(req.body)` → `{ email, password }`
    - `prisma.user.findUnique({ where: { email } })` → finds user
    - `if (!user || !user.password)` → `!user.password` is true for OAuth-only users (returns 401)
    - `bcrypt.compare(password, user.password)` → compares hashes
    - `signToken({ id: user.id, email: user.email, role: user.role })` → JWT signed with `JWT_SECRET`
    - Returns `{ success: true, data: { user: {id, email, username, role}, token } }`

11. **authStore.ts:51–55** — Stores token and updates state:
    - `localStorage.setItem('soundit_token', token);`
    - `set({ user, token, isAuthenticated: true });`
    - Returns `{ success: true }`

12. **Login.tsx:65–66** — `navigate('/dashboard')`

---

## 2. ROOT CAUSE

**The failure occurs because the frontend Axios client defaults to API port 5002 while the Express backend defaults to port 5000, causing a complete TCP connection refusal on every auth request when the `VITE_API_URL` environment variable is not explicitly set, and the generic error handling masks this as "Invalid credentials" / "Could not create account".**

---

## 3. FAILURE EXPLANATION

Why this wasn't caught by existing tests/monitoring:

- [ ] **Test coverage gap:** No integration or E2E test validates the full registration → login flow against the actual backend. The `onStep2Submit` handler in Register.tsx has no unit test. The axios network error fallback path (`error.response === undefined`) is not tested.
- [ ] **Monitoring gap:** No frontend error logging (e.g., Sentry, LogRocket) captures the raw `error.message` from axios network failures. The `error.response?.data?.error` fallback silently swallows `ECONNREFUSED` / `ERR_NETWORK` errors. No backend health check is performed before making auth requests.
- [ ] **Configuration gap:** No `.env.example` or validation script exists to verify that `VITE_API_URL` matches the actual backend `PORT` at startup. The codebase has **three different hardcoded fallback ports**: 5000 (`server.ts`), 5001 (`Login.tsx`), 5002 (`api.ts`). No CI/CD pipeline checks env var consistency.
- [ ] **Process gap:** No pre-deployment smoke test makes an actual HTTP request to `/health` from the frontend build environment before declaring the deployment healthy. The `server.ts:65–67` health check endpoint exists but is not used as a deployment gate.

---

## 4. EDGE CASE INVENTORY

All input combinations that trigger this, including "almost worked" near-misses:

- [ ] **Condition:** `VITE_API_URL` is unset AND `PORT` is unset (default dev mode) → **Result:** Frontend hits `localhost:5002`, backend on `localhost:5000`. **Every** auth request fails with `ECONNREFUSED`. The generic fallback message is shown. **100% failure rate.**
- [ ] **Condition:** `VITE_API_URL=http://localhost:5000/api` AND `PORT=5000` → **Result:** Everything works. This is the "correct" configuration that bypasses the bug.
- [ ] **Condition:** `VITE_API_URL` is set correctly but `PORT` is changed to a different value (e.g., `PORT=5001`) → **Result:** Frontend hits the old port, backend moved. Same failure as the default mismatch.
- [ ] **Near-miss:** `Login.tsx` has its own `API_URL` fallback (`http://localhost:5001/api`). If a developer set `VITE_API_URL=5001` to match `Login.tsx`, it would still fail because `api.ts` uses `5002`. The Google OAuth button URL would be wrong too.
- [ ] **Condition:** User registers with `password="Password123"` and `confirmPassword="Password124"` (mismatch) → **Result:** Frontend does NOT validate password equality. Registration proceeds with `password` value. User is created with `"Password123"`. Later login with `"Password124"` fails with "Invalid credentials" — a **different** failure path that compounds the confusion. **This is a secondary bug, not the systematic outage cause.**
- [ ] **Condition:** App is deployed behind a reverse proxy (Nginx, Cloudflare, ALB) without `app.set('trust proxy', true)` in `server.ts` → **Result:** `authLimiter` sees the proxy's IP for ALL requests. After 10 failed attempts from any user, **all users** behind that proxy are blocked for 15 minutes with "Too many authentication attempts." This is a **cascading failure** that manifests as an auth outage.
- [ ] **Condition:** User registers with `role="DJ"` but backend `djProfile` creation fails (e.g., S3 upload failure) → **Result:** User is already created in `users` table with `role="DJ"` but no `djProfile` exists. The frontend shows "Could not create DJ profile" but the user is actually registered. They can log in but have no profile. This is a **partial failure** that leaves the DB in an inconsistent state.
- [ ] **Condition:** Existing user created via Google OAuth (no password) tries email/password login → **Result:** `auth.ts:140` — `if (!user || !user.password)` returns 401 "Invalid credentials". The user cannot log in with email/password. **No error message distinguishes this from a wrong password.**
- [ ] **Condition:** `JWT_SECRET` is missing from environment → **Result:** `jwt.ts:4` throws `Error: JWT_SECRET environment variable is required` on server startup. The server crashes immediately. **This is a hard failure, not a silent one,** and would be caught by any basic health check.
- [ ] **Condition:** `DATABASE_URL` is missing or invalid → **Result:** Prisma fails on every DB query. Both `/register` and `/login` return 500 with `error.message`. This is a server-side failure, not the frontend network failure.
- [ ] **Condition:** Frontend runs on `http://localhost:5173` (Vite default) but `FRONTEND_URL` is set to `http://localhost:3000` (vite.config.ts port) → **Result:** CORS blocks all requests. The browser shows a CORS error in the console, but the frontend catch block still shows the generic fallback message.

---

## 5. FIX PROPOSAL

### (a) Minimal Change: Unify the Default Port

**Single file change — `app/src/lib/api.ts`:**

Change the default `API_URL` from `5002` to `5000` to match the backend default:

```typescript
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

**Secondary change — `app/src/pages/Login.tsx`:**

Remove the hardcoded `API_URL` fallback and import the shared `api` config, or use `import.meta.env.VITE_API_URL` consistently:

```typescript
// Login.tsx
import api from '@/lib/api'; // already imported at line 8

const googleLoginUrl = `${api.defaults.baseURL?.replace('/api', '')}/api/auth/google`;
```

This removes the third conflicting default port (5001).

### (b) No Regression Risk: How to Ensure Nothing Breaks

1. **Add a startup env validation script** (`app/api/utils/validateEnv.ts`):
   ```typescript
   const required = ['JWT_SECRET', 'DATABASE_URL', 'FRONTEND_URL'];
   const recommended = ['VITE_API_URL', 'PORT'];
   ```
   Run this before `app.listen()` in `server.ts`.

2. **Add a CI/CD smoke test** that:
   - Starts the backend on the configured `PORT`
   - Makes a `GET /health` request to `VITE_API_URL`
   - Fails the build if the response is not `{ success: true }`

3. **Add an `.env.example` file** to the repo root with all required variables and comments:
   ```
   # Backend
   PORT=5000
   DATABASE_URL=postgresql://...
   JWT_SECRET=change-me-in-production
   FRONTEND_URL=http://localhost:5173

   # Frontend
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Verify existing tests** for `authStore.ts` and `auth.ts` pass. The change only affects the fallback URL, not the request logic or response handling.

### (c) Test Case: Exact Test for the Failure Mode

**E2E Test (Playwright / Cypress):**

```typescript
test('registration fails with clear network error when backend is unreachable', async ({ page }) => {
  // Intercept or block the API port to simulate the outage
  await page.route('http://localhost:5002/api/**', (route) => route.abort('failed'));

  await page.goto('/register');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123');
  await page.fill('input[name="confirmPassword"]', 'Password123');
  await page.fill('input[name="stageName"]', 'DJ Test');
  await page.fill('input[name="fullName"]', 'Test User');
  await page.check('input[name="terms"]');
  await page.click('button[type="submit"]'); // Step 1

  await page.fill('select[name="city"]', 'Freetown');
  await page.click('button[type="submit"]:has-text("Create Profile")'); // Step 2

  // Assert the error message reveals the network issue, not a generic auth error
  const error = await page.locator('[data-testid="auth-error"]').textContent();
  expect(error).toContain('Cannot connect'); // or similar, not "Could not create account"
});
```

**Unit Test for `authStore.ts`:**

```typescript
test('register returns network error when axios throws without response', async () => {
  const networkError = new Error('Network Error');
  (networkError as any).response = undefined;
  vi.mocked(api.post).mockRejectedValue(networkError);

  const result = await useAuthStore.getState().register('test@example.com', 'password', 'DJ');
  expect(result.success).toBe(false);
  expect(result.error).toContain('Network Error'); // Not generic "Could not create account"
});
```

**Backend Unit Test for `authLimiter` proxy behavior:**

```typescript
test('authLimiter should not rate-limit all users behind a proxy', async () => {
  // Simulate 15 requests from the same X-Forwarded-For IP
  // With the current config, all 15 would share the same req.ip and hit the limit
  // After fix (trust proxy + custom keyGenerator), each real IP is counted separately
});
```

### (d) Monitoring/Alerting: How to Detect This if It Happens Again

1. **Frontend error tracking:** Add Sentry or equivalent to capture raw axios errors. Create an alert when `error.message` contains `ECONNREFUSED`, `ERR_NETWORK`, or `Failed to fetch` on auth endpoints.

2. **Backend health check monitoring:** Ping `GET /health` from the frontend domain every 30 seconds. Alert if:
   - Response time > 2s
   - Status code ≠ 200
   - Response body does not contain `"success": true`

3. **API error rate alert:** Track the ratio of `500` / `502` / `503` / `504` responses on `/api/auth/*` routes. Alert if error rate > 1% for 2 minutes.

4. **Synthetic login test:** Run a headless browser test every 5 minutes that attempts to register a test user and log in. Alert if either step fails.

5. **Port consistency check:** In CI/CD, verify that `VITE_API_URL` (from frontend build env) resolves to the same host:port as the deployed backend health check. Fail deployment if mismatch detected.

6. **Frontend error message audit:** Log all instances where the generic fallback message "Could not create account" or "Invalid credentials" is shown without a corresponding `error.response` object. These are strong indicators of network-level failures.
