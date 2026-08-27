# Deck Salone — Performance Optimization Report

**Date:** 2026-08-25
**Goal:** Improve mobile PageSpeed from 61 → 90+ and prepare architecture for 100,000+ users.

## What Was Done (Phase 1)

### 1. Image Optimization — Biggest Win
- Created `app/scripts/optimize-images.js` to generate responsive WebP variants at build time.
- Integrated into `npm run build` so variants are always fresh.
- Converted the largest public images:
  - `hero-bg.jpg` 4.2 MB → `hero-bg-640.webp` 43 KiB, `hero-bg-1920.webp` 335 KiB
  - `login-bg.jpg` 4.1 MB → `login-bg-640.webp` 48 KiB, `login-bg-1920.webp` 284 KiB
  - `default-avatar.jpg`, `mix-placeholder.jpg`, `og-banner.png`, `og-image.jpg`, `how_it_works_*.jpg`
- Added `.gitignore` rule so generated variants are not committed (they regenerate on build).

### 2. New `<OptimizedImage>` Component
- File: `app/src/components/ui/optimized-image.tsx`
- Features:
  - Automatic `srcset` generation for local public images
  - Lazy loading + eager/priority support
  - Explicit `width`/`height` for layout stability
  - Skeleton placeholder
  - Error fallback
- Replaced `<img>` tags in the most impactful components:
  - `AuthLayout` (login background, eager + high priority)
  - `HeroBanner` (hero slide, eager + high priority)
  - `MixCard`
  - `DjCard`
  - `EventCard`

### 3. Build & Compression
- Enabled `vite-plugin-compression` for **gzip** and **brotli** in `vite.config.ts`.
- Improved `manualChunks` to split heavy libraries into separate chunks:
  - `charts` (recharts)
  - `scan` (@zxing)
  - Kept `vendor` and `ui` leaner
- Enabled source maps for production builds.

### 4. PWA Tuning
- Reduced Workbox precache from 142 entries / 9.2 MB → **18 entries / 1.1 MB**.
- Precache now only includes the app shell + critical assets.
- Added runtime caching for:
  - Static JS/CSS (CacheFirst, 1 year)
  - API read endpoints (StaleWhileRevalidate, 5 min)
  - `/uploads` images (CacheFirst, 7 days)

### 5. Nginx & Deployment
- Updated `nginx.conf` to serve static files directly with `.br`/`.gz` pre-compressed fallback.
- Updated `docker-compose.prod.yml` to mount `app/dist` into the Nginx container.
- Updated `deploy.sh` to build the frontend locally before syncing, ensuring Nginx serves the latest dist.

### 6. Backend Caching (Redis)
- Added Redis `withCache` to heavy read endpoints:
  - `GET /api/rankings` (15 min TTL)
  - `GET /api/rankings/overview` (15 min TTL)
  - `GET /api/discover/djs` (5 min TTL)
  - `GET /api/discover/djs/rising` (5 min TTL)
  - `GET /api/discover/djs/battle-leaders` (5 min TTL)
  - `GET /api/discover/mixes/trending` (5 min TTL)
  - `GET /api/discover/mixes/hall-of-fame` (5 min TTL)
- Falls back to DB if Redis is unavailable.

### 7. Accessibility / Best Practices
- Removed `user-scalable=no` and `maximum-scale=1.0` from viewport meta.
- Added explicit dimensions to splash screen logo.
- Created `app/public/llms.txt` with H1 header and relevant links.

## Files Modified

```
.gitignore
app/package.json
app/index.html
app/vite.config.ts
app/scripts/optimize-images.js           (new)
app/src/components/ui/optimized-image.tsx (new)
app/src/components/AuthLayout.tsx
app/src/components/home/HeroBanner.tsx
app/src/components/home/MixCard.tsx
app/src/components/home/DjCard.tsx
app/src/components/feed/EventCard.tsx
app/api/routes/rankings.ts
app/api/routes/discover.ts
app/public/llms.txt                      (new)
nginx.conf
docker-compose.prod.yml
deploy.sh
```

## Build Verification

```bash
cd app
npm run build       # ✅ success
npm run api:build   # ✅ success
```

- Mobile LCP source images reduced from **4+ MB** to **< 50 KiB on mobile**.
- Brotli pre-compression reduces main JS bundle from 567 KB → 143 KB.
- PWA install cache reduced from **9.2 MB** to **1.1 MB**.

## Expected Impact

| Metric | Before | After Phase 1 | Target |
|---|---|---|---|
| Mobile PageSpeed | 61 | ~75–80 | 90+ |
| LCP | 12.9 s | ~4–6 s | <2.5 s |
| FCP | 2.7 s | ~1.5 s | <1 s |
| Login/Hero BG (mobile) | 4 MB | 48 KiB | — |
| PWA precache | 9.2 MB | 1.1 MB | <2 MB |
| API response (rankings hit) | DB query every time | Redis < 5 ms | <500 ms |

## What to Test Before Deploy

1. Run `npm run build` locally and confirm no errors.
2. Run `npm run preview` and visually verify:
   - Home page hero image loads
   - Login page background loads
   - Mix/DJ/Event cards render correctly
3. Run `npm run api:build` and confirm no errors.
4. Deploy to staging first and run PageSpeed Insights again.
5. Verify Nginx serves `.br` files with `Content-Encoding: br`.

## Remaining Roadmap

### Phase 2 — Frontend Architecture (1–2 weeks)
- Lazy-load heavy tabs inside `DjProfile.tsx` and `AdminDashboard.tsx`.
- Add virtualized lists (`react-window`/`react-virtuoso`) for Discover, Mixes, Rankings.
- Replace heavy Framer Motion `whileInView` on feed cards with CSS `content-visibility`.
- Add explicit `width`/`height` to remaining 50+ `<img>` tags.

### Phase 3 — Backend Query & DB (2–3 weeks)
- Add full-text GIN indexes for search (`stageName`, `username`, `mix.title`, etc.).
- Replace in-memory ranking/discovery scoring with pre-computed `rankingScore` / `discoveryScore` columns.
- Add DB read replica for heavy GET endpoints.
- Eliminate N+1 queries in rankings, mixes, djs, dashboard.

### Phase 4 — Infrastructure (3–6 weeks)
- CDN for static assets and `/uploads` images.
- Background job queue (BullMQ + Redis) for ranking recalc, image processing, emails.
- Replace 5-second subscription polling with WebSocket/Server-Sent Events.
- Switch audio uploads from memory to streaming/disk/multipart.
- Add APM/RUM (Sentry) and alerting.

### Phase 5 — Quality
- Fix remaining Lighthouse accessibility issues (contrast, touch targets).
- Add Core Web Vitals CI checks.

## Notes

- Redis is required in production for caching (`REDIS_URL=redis://...`). If not set, the app falls back to direct DB queries.
- The Nginx static-file serving depends on `app/dist` being mounted into the `deck-salone-web` container. This is configured in `docker-compose.prod.yml`.
- Generated WebP variants are excluded from git; they are recreated on every build.
