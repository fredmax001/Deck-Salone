# Findings — Uploads, Storage, Static Serving (UPL-1…14)

Scope: `app/api/utils/{upload,storage,imageProcessor,audioResolver}.ts`, `app/api/routes/{photos,mixes,events,eventTicketing,users,admin}.ts`, `app/api/server.ts`.

---

## UPL-1 — Paid/gated mix audio downloadable by unauthenticated users — **CRITICAL** (full detail in `01-FINDINGS-critical.md`)
- `mixes.ts` list/detail return raw `audioUrl`; `/uploads` public static mount with CORS `*`, before the rate limiter. **Effort M–L · static: yes**

## UPL-2 — `/uploads` statically exposes sensitive non-public folders with CORS `*` and no rate limiting
- **File:** `utils/upload.ts` `serveUploads` (184–200); `server.ts` (183–184, 217–218); writes at `users.ts:1104` (`subscription-proofs`), `eventTicketing.ts:485` (ticket payment screenshots), `users.ts` (`documents`)
- **Code:** whole uploads root served: `avatars`, `covers`, `mixes`, `events`, `documents`, **`subscription-proofs`**, **`tickets`**; `Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`; mount precedes `generalLimiter`.
- **Why:** KYC/payment proof screenshots and user documents are personal financial data. Unguessable UUID names, but any leaked URL (logs, referrers, admin responses, browser history) is permanently public, hotlinkable, scrapable at unlimited rate.
- **HIGH · M** — serve only public folders; move `documents`/`subscription-proofs`/`tickets` out of the static tree behind authenticated endpoints; drop CORS `*`; add rate limiting. · **static: yes**

## UPL-3 — Arbitrary file deletion via `deleteFile` path traversal (chained with unsanitized `avatar` string)
- **Files:** `utils/storage.ts` `keyFromUrl` (43–60) + `deleteFile` (89–109); `users.ts` `updateProfileSchema` (424: `avatar: z.string().optional()`) and L500–502 (`updateData.avatar = avatar`); `users.ts:563` `await deleteFile(user.avatar)`; also `djs.ts:204/214/258`
- **Code:**
  ```js
  const match = url.match(/^\/uploads\/(.*)$/);
  if (match) return match[1];          // no sanitization
  ...
  const dest = localPath(key);          // path.join(getUploadsDir(), key)
  await fs.promises.unlink(dest);
  ```
- **Why:** `PUT /profile` with `avatar="/uploads/../../.env"` persists; then `PUT /avatar` → `deleteFile(user.avatar)` → `new URL(...)` throws → catch branch returns `'../../.env'` → `path.join` resolves **outside** uploads → `unlink` deletes any file writable by the Node process (`.env`, DB files, other users' uploads via `../avatars/<uuid>.webp` — names visible in public API responses). Arbitrary file deletion.
- **HIGH · S** — validate `avatar` as http(s) or `/uploads/...` against folder allowlist; in `keyFromUrl`/`deleteFile`: `path.normalize`, strip leading `../`, verify resolved path strictly inside `getUploadsDir()` with separator-aware prefix check. · **static: yes**

## UPL-4 — Unauthenticated SSRF + unbounded response buffering in `/api/proxy-image`
- **File:** `server.ts:258-284` (see also AUTH-9, INFRA-5)
- **Code:** `axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000, ... })` — no allowlist, no private-IP blocking, no size cap, remote Content-Type echoed, CORS `*`, mounted outside auth and outside the rate limiter.
- **Why:** `?url=http://169.254.169.254/...` or internal dashboards — full body exfiltrated cross-origin; multi-GB internal responses buffered fully in memory (`arraybuffer` + `Buffer.from`) → memory exhaustion; echoed `text/html` enables same-origin content injection.
- **HIGH · S–M** — allowlist trusted image hosts; block private/loopback/link-local after DNS resolution; `maxContentLength`; fixed safe content-types only; require auth. · **static: yes**

## UPL-5 — In-memory multer storage with 300 MB/file cap → memory-exhaustion DoS
- **File:** `utils/upload.ts:28` (`multer.memoryStorage()`), L101–105 (`MAX_AUDIO_UPLOAD_MB = 300`); `events.ts:577` (`uploadGallery.array('photos', 20)` × 8 MB = 160 MB/request)
- **Why:** All uploads buffered wholly in RAM; concurrent requests multiply; no `files`/`fields`/parts caps. Dozens of parallel 300 MB uploads OOM a modest VPS. (Compounds with INFRA-14/15.)
- **MEDIUM · M** — disk/streaming storage for audio; lower `MAX_AUDIO_UPLOAD_MB`; `limits: { files, fields, parts }`; per-IP upload rate limits. · **static: yes**

## UPL-6 — Event gallery upload has no file filter and no magic-byte validation
- **File:** `events.ts:576-604`
- **Code:** `const ext = file.mimetype === 'image/png' ? 'png' : 'jpg'; const url = await uploadBuffer(file.buffer, 'events/gallery', { contentType: file.mimetype, ext });` — no `fileFilter` at all.
- **Why:** Arbitrary content persisted under the app's origin served as `image/jpeg/png`; polyglot/content-smuggling, tracking-pixel/malware abuse; no per-event photo cap (20/request, loop forever) → storage/quota abuse.
- **MEDIUM · S** — reuse `imageFileFilter` + `validateImage`/`processEventImage`; per-event photo cap. · **static: yes**

## UPL-7 — Raw, unvalidated user uploads in photos, ticket purchase proofs, subscription proofs
- **Files:** `photos.ts:11-44` (raw buffer, mimetype-only filter, stored with client `contentType`); `eventTicketing.ts:432-485` (screenshot stored raw); `users.ts:1103-1107` (proof stored raw, PDFs allowed)
- **Why:** No `sharp` re-encoding or magic-byte checks on these paths; client-supplied `Content-Type` trusted; `upload.ts:71` itself comments *"Downstream image processors should still validate file magic bytes"* — but these routes have no downstream processor. Stored on S3 with `ACL: 'public-read'` (storage.ts:76-77) with attacker-chosen ContentType.
- **MEDIUM · S** — run every image through `validateImage` + `sharp` re-encode; verify PDF magic bytes; derive ContentType from validated type. · **static: yes**

## UPL-8 — `POST /api/mixes/:id/download` leaks `directAudioUrl`; design relies on URL obscurity
- **File:** `mixes.ts:1637-1642`
- **Code:** `return res.json({ success: true, downloadUrl: `/api/mixes/${mixId}/download-file`, directAudioUrl: updated.audioUrl, downloads: updated.downloads });`
- **Why:** Even with UPL-1 fixed, the authorized flow hands the raw permanently-valid URL back; S3 mode = public `ACL: 'public-read'` object URL. No signed/short-TTL URLs anywhere.
- **MEDIUM · M** — return only the gated `downloadUrl`; presigned short-TTL GET URLs; make objects private. · **static: yes**

## UPL-9 — Guest-download policy + external `audioUrl` makes `download-file` an open redirect
- **File:** `mixes.ts:161-167` (guests allowed when no gates), L1549-1551: `if (/^https?:\/\//i.test(mix.audioUrl)) { return res.redirect(mix.audioUrl); }`
- **Why:** Any DJ can set `audioUrl` to any URL with an audio extension (`audioResolver.ts:26,327-333`); unauthenticated guests reach the redirect → server-blessed open redirect for phishing, IP/referrer leakage.
- **LOW–MEDIUM · S** — validate external audio URLs against platform/CDN allowlist; interstitial instead of `res.redirect`. · **static: yes**

## UPL-10 — Weak path-prefix check in `download-file` (missing path separator)
- **File:** `mixes.ts:1554-1563`
- **Code:** `const safeSuffix = path.normalize(relativeMatch[1]).replace(/^(\.\.(\/|\\|$))+/, ''); const filePath = path.join(uploadsDir, safeSuffix); if (!filePath.startsWith(uploadsDir)) { ... }`
- **Why:** Works today only because normalize+strip already removed leading `..`; `startsWith` without trailing separator is not containment (`/app/uploads2/x`.startsWith(`/app/uploads`) === true). Latent traversal fragility on `audioUrl` (DJ-controlled).
- **LOW · S** — `const root = path.resolve(uploadsDir); if (!filePath.startsWith(root + path.sep)) reject`. · **static: yes**

## UPL-11 — Orphaned files on delete/replace; no storage lifecycle
- **Files:** `photos.ts:113-133` (DB row deleted, `deleteFile` never called); `events.ts:606-615` (same); `mixes.ts` — **no `DELETE /:id` route exists at all**; `PUT /mixes/:id` (1040/1067) uploads new audio/cover without deleting old files
- **Why:** Unbounded storage growth (300 MB mixes on re-upload); replaced "deleted" private files remain publicly fetchable at the old UUID URL.
- **LOW · M** — `deleteFile` on replacement/deletion (with UPL-3 containment fix); cleanup job for unreferenced blobs. · **static: yes**

## UPL-12 — Multer rejection errors surface as 500s (no MulterError handling)
- **Files:** `upload.ts:64/84/131/147/173` (`cb(new Error(...))`); `server.ts:592-596` (`const status = err.status || 500` — MulterError has `.code`, not `.status`)
- **Why:** File-type rejections and `LIMIT_FILE_SIZE` returned as 500; clients can't distinguish 413/400; error-alert spam.
- **LOW · S** — map MulterError codes (`LIMIT_FILE_SIZE` → 413), fileFilter rejections → 400. · **static: yes**

## UPL-13 — Admin media upload: video stored raw with client-controlled extension; image cap misapplied to video
- **File:** `admin.ts:3028-3058`; `upload.ts:138-151`
- **Code:** for `video/*`: `ext = file.originalname?.split('.').pop()` (attacker-controlled), `ContentType: file.mimetype` stored raw; `limits.fileSize = MAX_IMAGE_UPLOAD_MB` (10 MB) also applies to videos.
- **Why:** Mitigated by `/api/admin` authMiddleware. Residual: compromised admin session can plant arbitrary-content files with chosen extension/ContentType; legit admin videos >10 MB always fail.
- **LOW · S** — whitelist video extensions; server-determined ContentType; separate `MAX_VIDEO_UPLOAD_MB`. · **static: yes**

## UPL-14 — Image pipeline lacks decompression-bomb / pixel-count limits
- **File:** `imageProcessor.ts:3-70` (all `process*` functions)
- **Why:** `sharp` fed buffers up to 10 MB with no `limitInputPixels`/dimension cap → crafted PNG (30k×30k) expands to GB of bitmap → memory/CPU DoS per upload.
- **LOW · S** — `sharp(buffer, { limitInputPixels: 50_000_000 })`; reject oversized `metadata.width*height`. · **static: yes**

## Checked, NOT vulnerable
- SVG excluded from image filters; `originalname` never used for stored filenames (UUID keys) → no classic write-path traversal.
- All avatar/cover/event/HoF images re-encoded to WebP via `sharp` → effective magic-byte validation for those paths.
- `download-file` Range requests handled correctly (`res.download` acceptRanges default).
- `audioResolver` host-pinned Hearthis/SoundCloud; `normalizeUrl` forces http(s) — no scheme injection.
- JSON/urlencoded bodies capped at 1 MB (server.ts:142-145).
