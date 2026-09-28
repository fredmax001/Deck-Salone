# Findings — Android APK / Capacitor API Usage (MOB-1…8)

**How the app talks to the API:** axios instance (`app/src/lib/api.ts`), base URL order: `VITE_API_URL` (set to `/api` in `app/.env`) → native hardcoded `https://decksalone.com/api` → web `/api`. JWT `Bearer` token attached by a request interceptor, read from `localStorage` keys `decksalone-auth` (zustand persist, `partialize` stores `{token, savedAccounts}`), legacy `soundit-auth`, or plain `token`. Google OAuth native: Chrome Custom Tab to `/api/v1/auth/google/mobile?device_id=...` → redirect `decksalone://auth/callback?token=...` → `DeepLinkHandler` stores token. Update check: `GET /app/version` vs build number — **advisory only**, no force-update block.

---

## MOB-1 — Global cleartext traffic allowed (manifest + Capacitor config)
- **File:** `app/android/app/src/main/AndroidManifest.xml:10`, `app/capacitor.config.ts:9`, `app/android/app/src/main/res/xml/config.xml:3`
- **Code:** `android:usesCleartextTraffic="true"` · `server: { androidScheme: 'https', cleartext: true, ... }` · `<access origin="*" />` — no `network_security_config.xml`.
- **Why:** Any `http://` URL the WebView loads (DJ-uploaded photo/audio links — `MixPlayer.tsx:494`, `DjProfile.tsx:1064` pass `http://` src as-is) is MITM-able on hostile Wi-Fi; content-injection vector into the app UI.
- **MEDIUM · S** — `usesCleartextTraffic="false"`, remove `cleartext: true`, add network security config; strip Cordova wildcard. · **static: yes**

## MOB-2 — JWT tokens stored unencrypted in WebView localStorage (multi-account tokens too)
- **File:** `app/src/stores/authStore.ts:353-356`, `app/src/lib/api.ts:59-68`, `app/src/App.tsx:192`
- **Code:** `name: 'decksalone-auth', partialize: (state) => ({ token: state.token, savedAccounts: state.savedAccounts })`; `localStorage.setItem('token', token)`; each `savedAccounts[]` entry contains a full `token`.
- **Why:** Every session token (incl. long-lived tokens for all saved accounts) in plaintext WebView localStorage; any XSS or malicious script (easier with MOB-1) = full account takeover for every saved account. No Keystore-backed storage anywhere in `app/src`.
- **MEDIUM · M** — move tokens to encrypted storage (`@capacitor-community/secure-storage` / Preferences + Keystore-wrapped key); don't persist multiple account tokens, or refresh-token-only. · **static: yes**

## MOB-3 — `android:allowBackup="true"` includes token-bearing WebView data in backups
- **File:** `app/android/app/src/main/AndroidManifest.xml:5`
- **Why:** Android Auto Backup exports app sandbox data incl. WebView localStorage with all JWTs to the user's Google account / desktop.
- **MEDIUM · S** — `allowBackup="false"` or backup rules excluding `app_webview`. · **static: yes**

## MOB-4 — Auth token transported in deeplink URL; blindly accepted from any intent
- **File:** `app/src/App.tsx:168-229`; `AndroidManifest.xml:26-40`
- **Code:** `token = search.get('token') || hash.get('token'); ... localStorage.setItem('token', token); useAuthStore.getState().setAuth({ id: '', ... } as any, token); ... navigate(`/auth/callback?token=${encodeURIComponent(token)}#token=${encodeURIComponent(token)}`);` — MainActivity exported+browsable for `decksalone://` and auto-verified `https://decksalone.com/auth/callback`.
- **Why:** (1) Token in URL → browser history, Android intent logs (`logcat` ActivityManager records intent URIs), referrer chains; re-written into React Router history. (2) Any app on the device can plant an arbitrary token via `decksalone://auth/callback?token=...` with no origin/state validation (`state`/`device_id` never checked client-side); defense relies entirely on backend rejecting invalid tokens.
- **MEDIUM · M** — short-lived one-time `code` exchanged over HTTPS; validate OAuth state/device_id; never route raw tokens through router URLs. · **static: yes** (token acceptance + URL flow); backend token validation not visible client-side

## MOB-5 — Plaintext production secrets in `app/.env` on disk
- **File:** `app/.env` (gitignored — verified **not** tracked)
- **Code:** `JWT_SECRET="sound-it-djs-super-secret-key-2026"` · `GOOGLE_CLIENT_SECRET="GOCSPX-…"` · `SMTP_PASS="Decksal0ne26!"` · `TICKET_QR_SECRET=…` · `DATABASE_URL="postgresql://soundit:password@localhost:…"`
- **Why:** Live production secret bundle plaintext in the working tree; one `git add -f`, directory sync, backup, or Docker context copy exfiltrates SMTP, Google OAuth, JWT-signing and ticket-QR keys. JWT_SECRET is a predictable string — weak if reused anywhere.
- **HIGH · S** — rotate all listed secrets now; secrets manager/env-only injection; verify `.dockerignore` excludes `.env`; never reuse the JWT secret string. · **static: yes**

## MOB-6 — Overly broad navigation allowlist + wildcard Cordova access
- **File:** `app/capacitor.config.ts:10-15` — `allowNavigation: ['decksalone.com', '*.decksalone.com', 'https://decksalone.com', 'https://*.decksalone.com']`; `config.xml:3` — `<access origin="*" />`.
- **Why:** Compromised/subdomain-takeover of `*.decksalone.com` gets in-WebView navigation + Capacitor bridge → steal localStorage tokens (MOB-2).
- **LOW · S** — only `https://decksalone.com` + actually-used subdomains; delete Cordova wildcard. · **static: yes**

## MOB-7 — PII/identifier and auth-flow logging to console
- **File:** `app/src/lib/googleAuth.ts:30` (`console.log('[Google Auth] Opening mobile OAuth:', url)` — contains device_id); `App.tsx:220,223`.
- **LOW · S** — strip debug logging in release builds. · **static: yes**

## MOB-8 — Update flow trusts server-provided `playStoreUrl`/`apkUrl`
- **File:** `app/src/lib/appUpdates.ts:77,107-124`, `pages/InstallApp.tsx:38,212`
- **Why:** APK install link driven entirely by `/app/version` response; no signature/hash verification. Advisory-only (needs prior compromise), but supply-chain hardening is cheap.
- **LOW · S–M** — only accept URLs under decksalone.com/Play host; publish + verify APK SHA-256. · **static: yes**

## Verified OK
- Manifest permissions minimal (INTERNET, NETWORK_STATE, POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK, RECEIVE_BOOT_COMPLETED — last one dead, cosmetic). No location/contacts/SMS overreach.
- Only MainActivity exported (launcher necessity); FileProvider correctly `exported="false"`.
- No hardcoded secrets in source/bundles (only placeholders + Turnstile **test** sitekey fallback in `TurnstileWidget.tsx:38` — aligns with AUTH-5).
- 401 interceptor clears tokens and redirects to `/login` correctly; `/auth/me` exempted.
- All first-party calls HTTPS; `getMediaUrl()` rewrites localhost dev URLs to production HTTPS.
