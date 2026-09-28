# Findings — Rankings, Play Counts, Battles, Discovery (RANK-1…18)

Scope: `app/api/utils/{ranking,rankingAlgorithm,mixDiscovery,monthlyListeners,campaignBoost}.ts`, `app/api/jobs/{recalculateDiscoveryScores,scheduler}.ts`, `app/api/routes/{rankings,hallOfFame,mixes,battles,campaigns}.ts`.

---

## RANK-1 — Play count endpoint: anonymous self-play inflation — **CRITICAL** (full detail in `01-FINDINGS-critical.md`)
- `mixes.ts` `POST /:id/play` (1172–1196) + `rateLimiter.ts` `playLimiter` (119–131). 20 plays/min/mix/IP anonymous → 28,800/day/mix; feeds ranking, discovery, battles, trending. **M · static: yes**

## RANK-2 — `monthlyListeners` counts rows, not distinct listeners (and counts self-plays)
- **File:** `app/api/utils/monthlyListeners.ts` `getMonthlyListeners` (37–50)
- **Code:** `return mixPlay.count({ where: { djId, createdAt: { gte: thirtyDaysAgo } } });`
- **Why:** Every play event creates a `MixPlay` row (no unique constraint); count is over **rows**, not distinct `userId`/`ipHash`. One fan replaying 100× = 100 "monthly listeners"; DJ's own self-plays (RANK-1) counted (no `userId == dj.userId` filter). `monthlyListeners` is public, feeds `calculateMixEngagementScore` (up to 10 pts → 2.5 composite at 25% weight), and dashboard analytics.
- **HIGH · S** — grouped query `groupBy: ['userId'/'ipHash']` or raw `COUNT(DISTINCT COALESCE("userId","ipHash"))`; exclude DJ's own plays. · **static: yes**

## RANK-3 — Per-play full-table recount of monthly listeners (O(N²) amplification + write race)
- **File:** `mixes.ts` `POST /:id/play` (1193) → `monthlyListeners.ts` `recalculateMonthlyListeners` (52–66): full COUNT over 30 days of `MixPlay` + `djProfile.update`, fired as `recalculateMonthlyListeners(mix.djId).catch(() => {})`.
- **Why:** Unbounded COUNT + profile write per play event — quadratic amplification, hot-row hotspot; concurrent plays race (last writer wins → counter transiently regresses).
- **MEDIUM · S** — move to cron (hourly for active DJs, like `recalculateStaleDiscoveryScores`) or maintain an atomic counter; never recount inline. · **static: no** (race part); yes (amplification)

## RANK-4 — Battle entry `mixId` has no ownership validation
- **File:** `app/api/routes/battles.ts` `POST /:id/enter` (191–239)
- **Code:**
  ```js
  const entry = await prisma.battleEntry.create({
    data: { battleId: req.params.id, djId: dj.id, mixId: parsed.data.mixId || null,
  ```
  No check that `mixId` exists or belongs to `dj.id` (contrast campaigns.ts:205-214 which validates).
- **Why:** A DJ enters a battle attached to **another DJ's mix ID** (or garbage) — score/identity fraud in a public competition.
- **HIGH · S** — `if (mixId) { const mix = await prisma.mix.findUnique(...); if (!mix || mix.djId !== dj.id) return fail(res, 400, ...) }`. · **static: yes**

## RANK-5 — Battle close is not transactional → double-close race awards badges twice
- **File:** `app/api/routes/battles.ts` `POST /:id/close` (344–406)
- **Code:**
  ```js
  if (battle.status !== 'ACTIVE') { return fail(res, 400, 'Battle is already closed'); }
  ...
  await prisma.djProfile.update({ ..., data: { badges: { push: badge }, rankingScore: { increment: ... } } });
  ...
  const updated = await prisma.battle.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
  ```
  Check and status flip are separate, non-locked statements; badge pushes happen *before* the status update.
- **Why:** Two concurrent closes (double-click, two moderators) both read `ACTIVE`, both push `Battle Champion` badges + increment `rankingScore`. Badges feed `calculateBattleScore` (up to 50 pts = 7.5 composite at 15% weight) → double championship credit.
- **HIGH · S** — wrap in `prisma.$transaction`, or atomic `updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'CLOSED' } })` and abort if count === 0. · **static: no** (race)

## RANK-6 — Self-voting allowed in battles
- **File:** `app/api/routes/battles.ts` `POST /:id/vote` (251–321)
- **Why:** Transaction checks status, entry membership, `ALREADY_VOTED_ENTRY`, `ALREADY_VOTED_BATTLE` — never checks whether `req.user.id` owns the entry's DJ profile. Votes are 40% of `finalScore`.
- **MEDIUM · S** — in the vote transaction, reject `req.user.id === entry.dj.userId`. · **static: yes**

## RANK-7 — Battle base score frozen at entry time → metric-timing exploit
- **File:** `battles.ts` `POST /:id/enter` (218–228); `rankingAlgorithm.ts` `calculateBattleBaseScore` (440–475)
- **Code:** `const baseScore = await calculateBattleBaseScore(dj.id, battle.metricType);` stored on entry, never refreshed.
- **Why:** (a) Inflate plays/followers/streams (RANK-1; streaming numbers are DJ-self-reported) *before* entering to lock in a maxed 60% base; (b) genuine late-week growth earns nothing.
- **MEDIUM · M** — recompute base scores for all entries at battle close (inside the close transaction); validate self-reported platform figures where feasible. · **static: yes**

## RANK-8 — Batch ranking recalc silently drops battle-entry points (two different scores)
- **File:** `rankingAlgorithm.ts` `recalculateAllRankingsV2` (227–235) vs `calculateBattleScore` (139–141), `computeDjScoreV2` (169)
- **Code:**
  ```js
  // Note: entry count not included in batch mode for performance; use badge approximation
  const battleScore = Math.min(50, wins * 10) + Math.min(25, runnerUps * 5) + Math.min(15, thirdPlaces * 3);
  ```
  Per-DJ path adds `Math.min(10, entryCount)`; weekly batch (the value persisted to `rankingScore`/`rankingPosition`) does not.
- **Why:** Leaderboard (stored `rankingScore`) disagrees with dashboard (`computeDjScore`); frequent entrants undercredited officially.
- **MEDIUM · S** — one grouped `groupBy: ['djId']` query for entry counts in the batch. · **static: yes**

## RANK-9 — `rankingScore` battle-win increment erased by weekly recalc
- **File:** `battles.ts` close (383): `rankingScore: { increment: i === 0 ? 2 : i === 1 ? 1 : 0.5 }`; `rankingAlgorithm.ts:289`: `rankingScore: dj.compositeScore` (absolute overwrite)
- **Why:** Two write paths, different semantics; the advertised "small ranking boost for winning" is silently discarded weekly.
- **MEDIUM · S** — fold battle wins into composite (already are, via badges) and drop the ad-hoc increment, or separate additive column. · **static: yes**

## RANK-10 — `RankingHistory.createMany({ skipDuplicates: true })` is a no-op → duplicate rows, corrupted trends
- **File:** `rankingAlgorithm.ts:301-312`; schema `RankingHistory` (1069–1079) — no `@@unique([djId, week])`
- **Code:** `await prisma.rankingHistory.createMany({ data: batch.map(... week: now ...), skipDuplicates: true });`
- **Why:** `skipDuplicates` only skips unique-constraint violations; with none, every rerun (retry, manual trigger) inserts a second same-week row. `getRisingDjs`/`/rankings` trend queries (`distinct: ['djId'], orderBy: { week: 'desc' }`) resolve "last week" to a same-day row → fake zero/negative trends; history grows unboundedly.
- **HIGH · S** — `@@unique([djId, week])` + keep `skipDuplicates`; add retention job. · **static: yes**

## RANK-11 — Rankings list: paginate by stored score, re-sort by live score → duplicates/gaps across pages
- **File:** `rankings.ts` `GET /` (129–179)
- **Code:**
  ```js
  // Phase 2: paginate by the pre-computed rankingScore ...
  orderBy: { rankingScore: 'desc' }, skip, take: limitNum, ...
  const computedDjs = djs.map(computeRealDjMetrics);
  computedDjs.sort((a, b) => b.rankingScore - a.rankingScore);
  ```
- **Why:** Page membership chosen by stored weekly score, page re-sorted by live recomputed score (also differs per RANK-8) → intra-page order conflicts with global order; `rankingPosition = skip + index + 1` disagrees with `djProfile.rankingPosition`; clients paging see duplicates/gaps.
- **MEDIUM · M** — one source of truth: paginate by stored score and return stored sub-scores, or persist exactly the route's computation. · **static: yes**

## RANK-12 — Homepage "trending mixes" ranks by raw, inflatable `plays`
- **File:** `campaigns.ts` `GET /home-board` (58–73)
- **Code:** `const mixes = await prisma.mix.findMany({ where: { isPublic: true }, orderBy: { plays: 'desc' }, ... take: 10 });`
- **Why:** Highest-visibility payoff for play farming (RANK-1).
- **MEDIUM · S** — order by `discoveryScore` or engagement-weighted metric. · **static: yes**

## RANK-13 — Scheduler restart guard bug + no distributed lock
- **File:** `jobs/scheduler.ts` `startScheduledJobs`/`stopScheduledJobs` (18–26, 133–137)
- **Code:**
  ```js
  export function stopScheduledJobs() {
    // node-cron tasks are stopped automatically when the process exits.
    jobsStarted = false;
  }
  ```
  Flag reset but tasks never destroyed; subsequent `startScheduledJobs()` registers every cron a second time.
- **Why:** Any future graceful-shutdown/restart path causes double-fired weekly recalcs and duplicate top-3 emails. Multi-replica: every instance runs the full recalc concurrently → racing writes + duplicate history (compounds RANK-10).
- **MEDIUM · S** — keep task handles, `task.stop()` them; Redis lock (SET NX) around cron bodies. · **static: yes** (guard bug); no (multi-instance race)

## RANK-14 — Discovery recalc uses `$executeRawUnsafe` with string-interpolated IDs
- **File:** `jobs/recalculateDiscoveryScores.ts` (56–66, 132–143)
- **Code:**
  ```js
  const cases = values.map((m) => `WHEN '${m.id}' THEN ${m.discoveryScore}`).join(' ');
  await prisma.$executeRawUnsafe(`UPDATE "mixes" SET "discoveryScore" = CASE "id" ${cases} END, ...`);
  ```
- **Why:** Safe today only because IDs are server-generated cuids and scores pass `Number.isFinite`. Latent SQL-injection footgun for any future user-influenced ID; bypasses Prisma query logging.
- **LOW · S** — parameterized `$queryRaw`/`$executeRaw`, or validate `/^[a-z0-9]+$/i` on IDs. · **static: yes**

## RANK-15 — Unbounded initial backfill on every boot; no overlap guard
- **File:** `jobs/scheduler.ts:116-128`
- **Code:** `setTimeout(() => { recalculateAllRankingsV2({ sendNotifications: false }).then(() => recalculateAllDiscoveryScores()) ...` — full (not stale-only) backfill 30 s after **every** process start.
- **Why:** Docker restarts/deploys re-fire; collides with hourly stale pass and weekly job with no mutex; loads all mixes into memory with 100-wide `Promise.all` write bursts.
- **MEDIUM · S** — gate on "empty rankings / null discoveryScore count > 0"; add run-lock; reuse `recalculateStaleDiscoveryScores` on warm starts. · **static: yes**

## RANK-16 — Limiter bypass in non-production + key spoofability caveats
- **File:** `rateLimiter.ts` `playLimiter.skip` (122–126); `getClientIp` (15–25); `mixes.ts:1189`
- **Code:**
  ```js
  skip: (req) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ... || ip.startsWith('192.168.') || ip.startsWith('10.');
  }
  ```
  and `recordMixPlay` hashes `req.ip`, not `getClientIp(req)`.
- **Why:** If `NODE_ENV` is ever unset in the container, play/search limiting silently disables for all private-IP clients behind the proxy. `req.ip` without correct `trust proxy` makes every play share one `ipHash` → listener analytics useless.
- **LOW · S** — remove env-based skip (explicit `DISABLE_RATE_LIMITS` flag instead); pass `getClientIp(req)` to `recordMixPlay`; align `trust proxy` with nginx topology. · **static: yes**

## RANK-17 — Discovery search injects non-matching promoted mixes into search results
- **File:** `mixDiscovery.ts` `discoverMixes` (234–236, 267–278, 301–305)
- **Why:** `promotedIds` merged into `scored` **after** the search filter, hoisted above matching results; `total` computed pre-boost → pagination metadata inconsistent. Paid-ranking integrity issue.
- **LOW · S** — only merge promoted mixes satisfying the same `where`, or render a separated "Sponsored" block. · **static: yes**

## RANK-18 — `scoreEngagement` recency boost unbounded for future-dated `createdAt`
- **File:** `mixDiscovery.ts` `scoreEngagement` (109–111)
- **Code:** `const recencyBoost = Math.max(0, 10 - ageDays * (10 / 30));`
- **Why:** `Math.max(0, ...)` guards negative age from going below zero but lets it **exceed** the intended max of 10 → future-dated mixes get higher-than-max engagement.
- **LOW · S** — `Math.min(10, Math.max(0, ...))`. · **static: yes**

## Checked, NOT issues
- No division-by-zero (`Math.max(1, mixes.length)`; `totalVotes > 0` guard); sub-scores capped, weights sum to 1.0; scores recomputed from counters (no float accumulation).
- Battle vote dedup via `@@unique([entryId, userId])` + transaction + one-vote-per-battle.
- `rankings.ts` inputs via Zod; page/limit clamped.
- `hallOfFame.ts` write endpoints role-gated, idempotent seeding.
- `recalculateAllRankingsV2` cursor pagination, no per-DJ N+1 (except battle-entry count, covered by RANK-8); badge rewrite strips old `#N DJ of the Week` before re-award.
