---
name: weekly-platform-audit
description: Weekly full-platform QA/security maintenance audit for the Deck Salone project (React+Vite frontend in app/src, Express+Prisma backend in app/api, Docker deploy to VPS). Use when the user asks for the weekly audit, platform health check, regression check, or "run the weekly audit". Covers codebase scan, page/feature/API/integration/database/security/performance/build checks, safe fixes, PLATFORM_AUDIT.md maintenance, and the weekly summary + approval flow.
---

# Weekly Platform Audit — Deck Salone

Repeatable end-to-end audit. Goal: keep the platform production-ready, functional, secure, stable.

## Ground rules

- **Subagents: NO git mutations ever** (no checkout/reset/restore/commit/stash). Read-only git only. A past incident wiped ~2,400 lines of uncommitted work via `git checkout --`.
- Fix safe, clearly-understood issues directly. **STOP and ask** for: product decisions, destructive DB changes/migrations, new external services/paid APIs, credential changes, role/taxonomy changes, or anything touching money flows beyond config.
- Never print secret values. Refer to them by variable name only.
- Never mark an issue fixed until re-verified (build/tests).
- After the audit: update `PLATFORM_AUDIT.md` (project root). Cadence is **on-demand** (user request only — no auto-recurrence approved 2026-09-04).

## Project facts (verify each run — don't trust blindly)

- App root: `app/` (nested git repo, branch `main`). Repo root holds `deploy.sh`, `rollback.sh`, `Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/deploy.yml`, `PLATFORM_AUDIT.md`.
- 73 pages (`app/src/pages`), ~31 route files (`app/api/routes`), 49 models (`app/api/prisma/schema.prisma`), ~250 endpoints. Route mounting map: `app/api/server.ts`.
- Verification commands (run from `app/` root): `npx tsc -b` · `npm run api:build` · `npx jest` (16 tests; MUST run from app root, not api/) · `npx vite build`.
- npm quirk: `rate-limit-redis@3.1.0` peers-conflict with `express-rate-limit@7` → all installs need `--legacy-peer-deps` (Dockerfile has it; CI now has it — keep it that way).
- Prod: `root@31.97.116.21:/opt/deck-salone-v2`, SSH key `~/.ssh/deck_deploy_key`; single nginx proxy → Docker node; Postgres on host via `host.docker.internal`.
- Frontend↔backend envelope: `{success,data}` via `api/utils/response.ts`; FE reads `res.data.data`. Known intentional deviations: `POST /mixes/:id/download` (flat fields), `GET /messages/:userId` (top-level `partner`).
- Scanner taxonomy: current scan = `POST /api/events/:id/ticketing/scan {qrPayload}` (error codes ALREADY_SCANNED/WRONG_EVENT/NOT_APPROVED); legacy `/tickets/scan` is deprecated but still mounted (see DB-1 split-brain in PLATFORM_AUDIT.md).
- Auth: JWT HS256 (≥32-char secret, boot-enforced), bcrypt cost 12, OTP in Redis, 30s auth cache, onsite staff = `X-Onsite-Token` JWT via `authOrOnsiteMiddleware`.

## Weekly workflow

### 0. Baseline (5 min)
- Read `PLATFORM_AUDIT.md` §10 Remaining Work + bug IDs (B-*, S-*, PF-*, DB-*, M-*, R-*).
- `git status` / `git log --oneline -15` (read-only) in both repo roots: note new commits, uncommitted changes, unpushed work.
- Confirm local↔deployed parity: last deploy time vs latest commit.

### 1. Inventory diff (10 min)
- Compare current page/route/model lists against last week: `find src/pages -name '*.tsx' | wc -l`, `find api/routes -name '*.ts'`, `grep -cE '^model ' api/prisma/schema.prisma`, route mounting greps in `server.ts` and `App.tsx`. New files → new audit surface.

### 2. Parallel deep audits (launch explore agents, read-only, thorough)
Partition as needed; the stable partition that worked:
1. Public/auth frontend pages (static+discovery+auth flows)
2. App pages (admin/finance/support/verification/moderator/dashboard/user/onsite) + `src/hooks/` inventory (flag dead hooks)
3. Backend routes (auth/validation/roles/error-shape/N+1/pagination per file)
4. Frontend↔backend integration (every `api.*` call site ↔ mounted route; missing/mismatch/shape)
5. Security (secrets handling, authz/IDOR, uploads, CORS, rate limits, error leakage, exposed infra)
6. Database (schema vs usage: indexes, cascades, enums/statuses, uniques, migrations)
7. Performance + build/deploy (bundle, queries, caching, Dockerfile/compose/nginx/CI/scripts)

In every agent prompt: READ-ONLY, no git mutations, report with file:line + severity P0-P3, and exact endpoint URLs for cross-checking.

### 3. Verify critical claims yourself
Never fix from an agent claim alone. Read the cited code first (false positives happen — e.g. `PUT /djs/:id` ownership is enforced inside `updateDjProfile`, not at the route).

### 4. Fix pass (coder agents or direct edits)
- Batch fixes by area (frontend/backend/deploy). Reuse the fix discipline from PLATFORM_AUDIT.md §5: minimal edits, match file style, no git commands, verify with the 4 build/test commands.
- Frontend response-format bugs, dead links, missing error/empty states, unauthenticated export/download paths → usually safe.
- Backend: 500-message leaks, extension-from-mimetype, missing select/omit leaks, role-list gaps → usually safe. Schema/data migrations → STOP, propose to user.
- Deploy/CI script fixes → safe if behavior-preserving or strictly safer (e.g. `migrate deploy` not `db push --accept-data-loss`).

### 5. Verify
- All four commands green. Spot-check 2–3 critical diffs by reading the final code.
- If anything was deployed this week, run post-deploy probes: `GET /health` (now DB-checked → expect `"database":"up"`), `GET /`, one public API route.

### 6. Update PLATFORM_AUDIT.md
- Move fixed items' status to Fixed (keep IDs, add fix date).
- Add new findings with next free IDs per prefix.
- Refresh §10 Remaining Work and counts in §1.

### 7. Weekly summary to user (concise)
```
## Weekly Audit — <date>
**FIXED** — items resolved (IDs)
**NEW** — new problems (IDs + one-liner)
**STILL OPEN** — carried-over items needing decision
**MISSING** — missing endpoints/features discovered
**SECURITY** — security findings (no secrets)
**BUILD** — tsc/api:build/jest/vite status
**RECOMMENDED** — top 3 next actions
```
Then request approval for the next weekly audit and for any deploy decision.

## Known-open decision backlog (verify status each week)
R-1 support dashboard backend · R-2 legacy tickets router + status migration · R-3 admin reports/scan-logs/mix-reactions endpoints · R-4 email-change verification · R-5 onsite password hashing+lockout · R-6 OTP anti-bombing · R-7 admin role tightening · R-8 blog backend · R-9 subscription price config authority · R-10 ticket download · R-11 SUPPORT_ADMIN enum · R-12 deploy approval.

## Anti-patterns (learned incidents)
- Subagent ran `git checkout -- routes/` to fix its own bug → wiped work. Forbid all git mutations in subagent prompts, every time.
- `jest` from `api/` fails ("File not found: api/tsconfig.json") — always from app root.
- `--accept-data-loss` once lived in deploy.sh — never reintroduce; schema changes go through `api/prisma/migrations/`.
- Production rebuild used `--no-cache` + double frontend build — flagged; if touching deploy.sh, don't reintroduce.
- 401 from any endpoint triggers a global FE interceptor that clears auth + redirects to /login — new public pages calling authed endpoints will bounce guests (check `enabled` gating).
