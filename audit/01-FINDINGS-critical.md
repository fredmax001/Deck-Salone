# CRITICAL Findings — full detail

Four CRITICAL findings. Each is also cross-listed in its domain file.

---

## UPL-1 — Paid/gated mix audio downloadable by unauthenticated users (download-gate bypass)

- **File:** `app/api/routes/mixes.ts` `GET /api/mixes` (L240–268), `GET /:id` (L751–790), `/by-slug/...` (L667–748); `app/api/utils/upload.ts` `serveUploads` (L184–200); `app/api/server.ts` L184
- **Problem (actual code):**
  ```js
  // GET /api/mixes — no auth, no select:
  prisma.mix.findMany({ where, ... include: { dj ... } })   // full row incl. audioUrl
  ```
  ```js
  // server.ts:184 — mounted BEFORE the /api rate limiter:
  app.use('/uploads', (req,res,next)=>{ res.setHeader('Access-Control-Allow-Origin','*'); ... },
    express.static(getUploadsDir(), { ... }));
  ```
  `GET /:id` / `/by-slug` return `ok(res, mix)` with only an `isPublic` check — **no check of `isExclusive`, `repostToDownload`, `followToDownload`, or any subscription gate.**
- **Why it matters:** `checkDownloadAccess()` (L105–168) and `POST /:id/download` + `GET /:id/download-file` implement the entire monetization gate (Pro subscription, repost-to-download, follow-to-download, exclusive mixes). All of it is bypassable: call `GET /api/mixes` (unauthenticated), take any `audioUrl` (`/uploads/mixes/<uuid>.mp3`), fetch the bytes directly from the public static mount (CORS `*`, `Cross-Origin-Resource-Policy: cross-origin`, no rate limit). Unauthenticated bulk download of the entire paid catalog + hotlinking.
- **Severity:** CRITICAL · **Effort:** M–L
- **Fix:** Never return raw `audioUrl` for gated content; serve audio only through an authorized streaming endpoint that enforces `checkDownloadAccess` (or short-TTL signed URLs); remove public static serving for `mixes/` and other sensitive folders or gate it behind auth.
- **static: yes**

---

## SOC-1 — Full DJ record (ID documents, payout method, legal name) leaked by public list endpoints

- **File:** `app/api/routes/djs.ts` `GET /api/djs/` (L310–341), `GET /hall-of-fame` (L350–390), `GET /:identifier` (L543–614); `app/api/routes/discover.ts` `GET /api/discover/djs` (L157–202)
- **Problem (actual code):**
  ```js
  prisma.djProfile.findMany({ where, orderBy, skip, take: limitNum,
    include: { user: {...}, mixes: ..., streamingPlatforms: ..., _count: ... } })
  ...
  data: djs.map((dj) => ({ ...dj, username: dj.user.username, ... }))
  ```
  Prisma `include` does NOT restrict scalar fields — every column of `djProfile` is spread into the response: `idDocumentUrl` (passport/ID scan), `idDocumentType`, `legalName`, `nationality`, `payoutMethod` (JSON with mobile-money account number / bank details), `whatsappNumber`, `verificationReason`, `socialProof`, `blockedDates`.
- **Why it matters:** Any unauthenticated visitor who opens the DJ directory downloads every public DJ's government ID document URL and payout account details. Massive PII/financial-data breach and likely a regulatory violation (Sierra Leone Cyber Security & Crimes Act 2021 data-protection duties). Payout data is exactly what's needed to social-engineer or intercept DJ payouts.
- **Severity:** CRITICAL · **Effort:** S (add explicit `select` of public fields; a `DJ_PUBLIC_SELECT` already exists in the codebase)
- **Fix:** Replace all `include`-everything DJ queries with an explicit public-field `select`.
- **static: yes**

---

## RANK-1 — Play count endpoint: anonymous self-play inflation

- **File:** `app/api/routes/mixes.ts` `POST /:id/play` (L1172–1196); `app/api/utils/rateLimiter.ts` `playLimiter` (L119–131)
- **Problem (actual code):**
  ```js
  router.post('/:id/play', softAuthMiddleware, playLimiter, asyncHandler(async (req, res) => {
    ...
    const updated = await prisma.mix.update({
      where: { id: req.params.id },
      data: { plays: { increment: 1 } },
  ```
  limiter: `windowMs: 60_000, max: 20, keyGenerator: (req) => `play:${req.user?.id || getClientIp(req)}:${req.params.id}``
- **Why it matters:** Anonymous users can increment plays; the cap is 20 plays/min **per mix per IP** = 28,800 plays/day/mix from one IP, unlimited across rotating IPs/accounts. `plays` feeds DJ composite ranking (25% weight mixEngagement), discovery engagement score, battle base score (`PLAYS` metric), homepage "trending by plays", and `sortBy: 'plays'`. One script defeats the entire leaderboard economy. No minimum-listen-time, no session token, no dedup.
- **Severity:** CRITICAL · **Effort:** M
- **Fix:** Require a short-lived signed playback token issued when audio actually streams; dedup per (userId|ipHash, mixId, 24h) before incrementing; make anonymous limits per-mix global; count only authenticated plays toward ranking.
- **static: yes**

---

## DB-1 — Schema column `EventTicket.idempotencyKey` has NO migration (drift)

- **File:** `app/api/prisma/schema.prisma:915` (`idempotencyKey String? @unique`); used at `app/api/routes/eventTicketing.ts:1633,1663`; **zero hits** in `app/api/prisma/migrations/`
- **Problem (actual code):**
  ```prisma
  idempotencyKey String? @unique   // schema only — no migration ever created it
  ```
  `grep -rn "idempotencyKey" app/api/prisma/migrations/` → no matches.
- **Why it matters:** Either (a) applied to prod via `prisma db push` — so `migrate deploy` never manages it, any fresh environment built from migrations **lacks the column and the onsite walk-in ticket endpoint crashes** (double-sell protection silently absent); or (b) prod was migrated non-reproducibly. Compounds with INFRA-7 (`db push --accept-data-loss` in `deploy.sh`) and DB-11 (hand-edited migrations) into systemic drift risk.
- **Severity:** CRITICAL · **Effort:** S
- **Fix:** Generate a proper migration (`prisma migrate dev --create-only` adding column + unique index, partial-index variant since nullable); verify prod has exactly one matching index; adopt `migrate deploy` exclusively.
- **static: yes**
