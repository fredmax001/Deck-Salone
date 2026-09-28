# Findings — Infrastructure: Server, Docker, NGINX, Compose, CI, Deploy (INFRA-1…23)

Scope: `app/api/server.ts`, `app/api/cluster.ts`, `app/api/jobs/scheduler.ts`, `Dockerfile`, `docker-compose{,.prod,.homelab}.yml`, `nginx.conf`, `.github/workflows/*`, `app/api/utils/{logger,redis,cache,response,bugReport}.ts`, `deploy.sh`, `rollback.sh`, `launcher.js`, `start-server.sh`, `.env.example`.

**Good (verified):** no secrets in git history or tracked files (`.env` gitignored); helmet + nginx security headers; DB-backed `/health`; request-ID tracing; prod compose healthcheck; pre-deploy DB backup + rollback script; error handler masks internals in production; JWT/TQR secrets fail fast when missing; layered rate limiting.

---

## INFRA-1 — Hardcoded database credentials in committed compose file
- **File:** `docker-compose.homelab.yml:13`
- **Code:** `- DATABASE_URL=postgresql://soundit:password@host.docker.internal:5432/sounditdjs?schema=public`
- **Why:** Working DB credentials committed to a **public** GitHub repo (`fredmax001/Deck-Salone`). Rotate immediately; purge from git history.
- **HIGH · S** — `${DATABASE_URL}` from untracked env file; rotate password; history scrub. · **static: yes**

## INFRA-2 — Container runs as root
- **File:** `Dockerfile:42-59` — no `USER` directive; final image defaults to root, with bind mounts (`/opt/deck-salone/uploads`, `/opt/deck-salone/logs`).
- **Why:** Any RCE in the container = root; mounted host paths writable.
- **HIGH · S** — `adduser`/`USER app`; tighten bind-mount writability. · **static: yes**

## INFRA-3 — Graceful shutdown does not drain in-flight requests
- **File:** `server.ts:628-637`
- **Code:**
  ```ts
  async function shutdown() {
    logger.info('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
  }
  ```
  `server.close()` never called; `setInterval` background jobs never cleared.
- **Why:** Every deploy drops in-flight requests (300 MB mix uploads, payment operations) mid-flight.
- **MEDIUM · S** — module-level `server` ref; `server.close()` with deadline; clear intervals. · **static: yes**

## INFRA-4 — SIGTERM never reaches Node process in Docker
- **File:** `Dockerfile:59`
- **Code:** `CMD ["sh", "-c", "npx prisma migrate deploy && node dist/cluster.js"]` — PID 1 is `sh`; POSIX `sh` does not forward signals to children.
- **Why:** `docker stop` SIGTERM → Node never sees it → SIGKILL after grace period → every deploy is a hard kill (compounds INFRA-3; risks corrupt writes, interrupted cron transactions).
- **HIGH · S** — entrypoint script that `exec`s node after migrations. · **static: yes**

## INFRA-5 — Unauthenticated open image proxy (SSRF)
- **File:** `server.ts:259-284` (see AUTH-9, UPL-4 for the app-level analysis)
- **Why:** No IP/host blocklist (127.0.0.1, 10.x, 169.254.169.254, host.docker.internal all allowed), `http://` allowed, axios follows 5 redirects (redirect-to-internal bypass), no `maxContentLength`, whole response buffered in memory, mounted before the `/api` rate limiter with CORS `*`.
- **HIGH · S** — host allowlist, private-IP rejection after DNS resolution, redirect re-validation, size cap, behind rate limiter. · **static: yes**

## INFRA-6 — No automated database backup (backup only inside manual deploy)
- **File:** `deploy.sh` (Step 3.5/5); `grep pg_dump` matches only docs + `deploy.sh`
- **Why:** Only backup = `predeploy_*.sql.gz` in `/opt/deck-salone/backups` on the **same VPS**, retention 10, runs only when someone deploys. No cron/timer, no offsite copy, no uploads/media backup. VPS loss = data loss.
- **HIGH · M** — nightly `pg_dump` cron + offsite object storage (rclone/restic); include uploads; alert on failure. · **static: yes** (absence confirmable)

## INFRA-7 — Production schema applied with `prisma db push --accept-data-loss`
- **File:** `deploy.sh` Step 4/5: `docker exec deck-salone-api sh -c 'cd /app/app/api && npx prisma db push --accept-data-loss'`
- **Why:** Silently drops drifted columns/tables; no migration-history safety; conflicts with the Dockerfile CMD's `migrate deploy`. On a prod DB with no real backup cadence (INFRA-6), one bad schema state = irreversible data loss. Root cause of the DB-1 drift class.
- **HIGH · S** — `prisma migrate deploy` exclusively; delete `--accept-data-loss`. · **static: yes**

## INFRA-8 — Homelab deployment broken by HTTPS redirect
- **File:** `nginx.conf:46-48` + `docker-compose.homelab.yml:40-41`
- **Code:** `if ($forwarded_proto = "http") { return 301 https://$host$request_uri; }` — homelab serves plain HTTP on 8080 with nothing setting `X-Forwarded-Proto` → map falls back to `$scheme` = http → infinite redirect loop.
- **MEDIUM · S** — separate homelab nginx conf or env-driven redirect. · **static: yes**

## INFRA-9 — Dev compose exposes Postgres/Redis publicly with weak default password
- **File:** `docker-compose.yml:31-34, 49-50` — `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-securepassword123}` with `ports: ["5432:5432"]`, `ports: ["6379:6379"]` on all interfaces; Redis no `requirepass`.
- **MEDIUM · S** — remove `ports:` (internal network only); fail hard if password unset. · **static: yes**

## INFRA-10 — No tests run in CI; no `test` script exists
- **File:** `.github/workflows/deploy.yml:38-41` (`# npm test` commented out); `app/package.json` has no `test` script despite jest config + test files existing.
- **MEDIUM · S** — add `"test": "jest"`; uncomment CI step. · **static: yes**

## INFRA-11 — CI install commands inconsistent (ci.yml `npm ci` vs deploy.yml/Dockerfile `--legacy-peer-deps`)
- **File:** `.github/workflows/ci.yml:27` vs `deploy.yml:26`
- **LOW · S** — align install commands; fix peer-dep conflicts. · **static: yes**

## INFRA-12 — No automated deployment; prod credentials/infra details in repo scripts
- **File:** `.github/workflows/deploy.yml:58` (`push: false`); `deploy.sh:10-11`
- **Code:** `SERVER="${DECK_SALONE_SERVER:-root@31.97.116.21}"`, `SSH_KEY="${DECK_SALONE_SSH_KEY:-/Users/djfredmax/.ssh/deck_deploy_key}"`, `StrictHostKeyChecking=no` — in a public repo.
- **Why:** Public repo exposes prod server IP, root-over-SSH deploys, key path; deploys unrepeatable/ungated.
- **MEDIUM · M** — env-only config; GitHub Actions deploy job with protected environment; stop deploying as root. · **static: yes**

## INFRA-13 — No log rotation / unbounded Docker logs
- **File:** `docker-compose.prod.yml` (no `logging:` blocks); `logger.ts:40-46` (console-only); nginx default json-file.
- **Why:** Long-running prod containers fill VPS disk → Postgres + API fall over together.
- **MEDIUM · S** — `logging: { driver-opts: { max-size: "50m", max-file: "5" } }` per service. · **static: yes**

## INFRA-14 — Cluster sizing uncapped; per-worker in-memory limits multiply
- **File:** `cluster.ts:5,17` (`const numCPUs = os.cpus().length` — no env override); `rateLimiter.ts` memory fallback; `cache.ts:6` (`new Map()`); `server.ts:313` metaCache.
- **Why:** 8-core VPS = 8 workers × Prisma pools × 300 MB upload buffers; effective rate limit 8×5000/15 min; cache hit-rates drop; OOM risk during uploads.
- **MEDIUM · S** — `Math.min(os.cpus().length, Number(process.env.WEB_CONCURRENCY || 2))`; verify Redis limiter store active. · **static: yes**

## INFRA-15 — Memory-buffered 300 MB uploads + 500M nginx body limit
- **File:** `upload.ts:28,101-104`; `nginx.conf:31` (`client_max_body_size 500M`)
- **MEDIUM · M** — disk/tmpfs storage for audio; align nginx limit per location. · **static: yes**

## INFRA-16 — `trust proxy: true` trusts every hop
- **File:** `server.ts:73` — `app.set('trust proxy', true);`
- **Why:** Client-supplied `X-Forwarded-For` poisons `req.ip` used in security/audit logs (`logSystemError` 617, `/metrics`); express-rate-limit validation warning.
- **LOW · S** — `app.set('trust proxy', 1)`. · **static: yes**

## INFRA-17 — CORS allows null origin and any localhost origin with credentials
- **File:** `server.ts:109-123` — `if (!origin || origin === 'null') return true;` + localhost regex, with `credentials: true` + Capacitor/Ionic wildcard prefixes.
- **LOW · S** — allow `null` only for non-credentialed requests; enumerate exact Capacitor origins. · **static: yes**

## INFRA-18 — Scheduler has no real stop; jobs log to console; shutdown leaves intervals
- **File:** `jobs/scheduler.ts:133-137`; `server.ts:649-661`
- **Code:** `// node-cron tasks are stopped automatically when the process exits. jobsStarted = false;`
- **LOW · S** — track handles, `task.destroy()`; route through winston; `uncaughtException` guard in cluster primary. · **static: yes**

## INFRA-19 — `/metrics` token compared non-constantly; token optional
- **File:** `server.ts:203-207` — `const hasValidToken = expectedToken && token === expectedToken;`
- **LOW · S** — `crypto.timingSafeEqual`; loud warning when `METRICS_TOKEN` unset in production. · **static: yes**

## INFRA-20 — Duplicate/conflicting cache headers for hashed frontend assets
- **File:** `nginx.conf:72-84` vs `server.ts:303-305` — nginx adds `Cache-Control "public, no-transform"` + `expires 30d`; Express sets `public, max-age=31536000, immutable`. Both emitted.
- **LOW · S** — single source (proxy upstream header untouched or same policy in nginx only). · **static: yes**

## INFRA-21 — Bug report email interpolates error message into HTML unescaped
- **File:** `utils/bugReport.ts:75-91` — `${err.message}`, `err.path`, `userEmail` injected into HTML email without escaping.
- **LOW · S** — HTML-escape all interpolations. · **static: yes**

## INFRA-22 — Legacy launch scripts bypass cluster/monitoring conventions
- **File:** `app/api/launcher.js` (hardcoded `PORT: '5002'`, detached, plain log), `start-server.sh` (nohup, port 5002); stray `server.log`, `server.pid`, `screenlog.0` in `app/api/`.
- **Why:** Two divergent "run prod" paths invite operators to start the wrong one during an incident.
- **LOW · S** — delete or mark dev-only; document single entrypoint (`node dist/cluster.js`). · **static: yes**

## INFRA-23 — Port/NODE_ENV drift between environments
- **File:** `app/.env.example:5` (`PORT=5002`) vs `Dockerfile:44`/`compose` (5000) vs legacy scripts (5002).
- **LOW · S** — standardize on 5000 in `.env.example`. · **static: yes**
