# Fix Plan: Moderator Mix Access + Performance Crash + Avatar Issues

## Issue 1: Moderator Can't Access All Mixes (CRITICAL - User Reported)
**Root Cause**: `GET /api/mixes` only filters `isPublic: true`. Moderators see the same limited set as guests.
**Fix**: Add a `GET /api/mixes/all` endpoint (or query param `?includePrivate=true`) that bypasses the `isPublic` filter for ADMIN/MODERATOR roles. Update the frontend playlist "add mix" modal to use this endpoint for staff.

## Issue 2: Platform Crashes at ~100 Concurrent Users (CRITICAL - User Reported)
**Root Causes Identified**:
1. **Prisma NO connection pool limit** — uses default (very low). DATABASE_URL needs `connection_limit=20&pool_timeout=10`.
2. **Nginx worker_connections = 1024** — too low. Should be 4096+ with `worker_processes auto`.
3. **SSR meta injection hits DB on EVERY page load** — `serveAppWithMeta()` runs Prisma queries for every non-API request. This is the #1 bottleneck.
4. **Rate limiter uses in-memory store** — not shared across containers. Should use Redis store.
5. **Prisma query logging enabled in production** — adds overhead.
6. **In-memory cache only** — not shared across instances, lost on restart.
7. **No container resource limits** in docker-compose.

**Fixes**:
- Add `connection_limit` to DATABASE_URL in docker-compose
- Tune nginx: worker_processes auto, worker_connections 4096, worker_rlimit_nofile 8192, keepalive to upstream
- Cache SSR meta tags aggressively (Redis or in-memory with TTL)
- Disable Prisma query logging in production
- Add Redis-backed rate limit store
- Add container memory/CPU limits

## Issue 3: Avatar Not Perfectly Circular / Not Showing Everywhere
**Fix**: Ensure all avatar containers use `rounded-full` with explicit `w-` and `h-` of the same size, and `object-cover`. Check `UserCard`, `UserListRow`, `DJCard`, and `FollowerCard`.

## File Changes Required
### Backend
- `/app/api/routes/mixes.ts` — add moderator-accessible endpoint
- `/app/api/utils/prisma.ts` — disable query logging in prod, add connection pool hints
- `/app/api/utils/rateLimiter.ts` — add Redis store option
- `/app/api/server.ts` — cache SSR meta injection
- `/docker-compose.yml` — add connection_limit, container limits
- `/nginx.conf` — tune workers and connections

### Frontend
- `/app/src/pages/Discover.tsx` — UserCard/UserListRow avatar fix
- `/app/src/pages/dashboard/Followers.tsx` — FollowerCard avatar fix
- DJ Card avatar fix
- Add moderator mix selector component
