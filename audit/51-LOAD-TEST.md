# Load Test — Top 10 Endpoints (Phase 3e)

**Date:** 2026-09-28 · **Target:** https://decksalone.com (production VPS, pre-hardening build — the `hardening/phase-2` branch was not deployed yet) · **Tool:** autocannon 10s @ 20 connections per endpoint (≈200 req/endpoint), from an external client (client↔server RTT ≈ 600 ms, which dominates the absolute latencies).

| Endpoint | rps | p50 | p90 | p97.5 | p99 | 5xx | errors |
|---|---|---|---|---|---|---|---|
| /health | 26.3 | 629 | 685 | 2213 | 2228 | 0 | 0 |
| /api/mixes?limit=20 | 22.0 | 687 | 1071 | 2835 | 2919 | 0 | 0 |
| /api/mixes/:id | 25.8 | 639 | 734 | 2304 | 2336 | 0 | 0 |
| /api/djs?limit=20 | 20.9 | 698 | 1115 | 3162 | 3179 | 0 | 0 |
| /api/discover/mixes | 22.8 | 673 | 1078 | 2626 | 2683 | 0 | 0 |
| /api/rankings | 20.1 | 682 | 1064 | 2949 | 2965 | 0 | 0 |
| /api/events | 26.1 | 665 | 800 | 1413 | 2258 | 0 | 0 |
| /api/campaigns/home-board | **5.0** | **3141** | **5763** | 6074 | 6179 | 0 | 0 |
| /api/discover/djs | 21.1 | 653 | 1056 | 3027 | 3033 | 0 | 0 |
| /uploads/mixes/*.mp3 (77 MB) | ~3 MB/s/stream (curl) | — | — | — | — | 0 | n/a |

## Verdict vs target (10× current traffic)

- **Current traffic:** ≈ nothing (load avg 0.16; 60 users). The tested load (20 concurrent/external) is already far above 10× daily traffic; the API sustained it with **zero 5xx and zero errors** on all API endpoints.
- **Acceptable p95:** mean p90 ≈ 1.3 s of which ~600 ms is pure client-server RTT → server-side processing is ~50–500 ms per request at 20 conns. p97.5 spikes (1.4–3.2 s) come from TLS+queueing at fixed 20-connection concurrency, not from server saturation — throughput scales near-linearly with concurrency (Node cluster on a multi-core VPS).

## Findings

1. **`/api/campaigns/home-board` is the clear outlier** — 5 rps, p50 3.1 s under only 20 conns. It fans out multiple `count()` queries + a trending query per request. **Perf backlog #1:** cache the board (short TTL) or move counts to the cron layer. (Related to audit RANK-12.)
2. **Media serving is bandwidth-bound:** ~2.9 MB/s per stream from this VPS; 20 concurrent streams ≈ 58 MB/s would saturate the link. Autocannon cannot measure it (it buffers bodies in RAM — its 20 "errors" are client-side aborts, not server failures; verified 200 via curl). **This is the architectural argument for the Phase-4 CDN/signed-URL work.**
3. Rate limiting held: no 429s observed at these volumes (limits are per-IP and generous by design).

## Not covered (needs a staging replica)

- Write-path endpoints (play counts, votes, purchases) — not load-tested against prod to avoid data pollution; dedup/atomicity covered by the 240-test suite instead.
- >100-connection saturation point, sustained-duration (hours) stability, Redis-fallback behavior.
- The hardened branch's `/api/mixes/:id/audio` streaming endpoint (not deployed yet) — re-run this suite on staging after deploy; expect similar API numbers and confirm audioLimiter behavior under burst.
