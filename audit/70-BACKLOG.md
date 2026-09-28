# Remaining Backlog — Prioritized (MEDIUM / LOW + new adversarial items)

## P0 — money & ledger integrity (do first)
1. **PAY-6 implement referrals properly** — accept validated `ref` at register, transactional count, idempotent reward at 5; anti-fraud (self-refusal, IP/device caps). Currently dead code admins believe works.
2. **PAY-7 trial farming** — trial registry keyed on hashed phone across accounts.
3. **ADM-4 audit-log gaps** — log ranking rewrites, hall-of-fame, visibility, recalculate, campaign edits (pattern exists).
4. **ETK-5/6/7 walk-in amount, guest-list capacity, undo-checkin** — server-computed prices, atomic sold increments, distinct scan-log status + reason.
5. **UPL-9 open redirect** — platform-allowlist external audioUrls before `res.redirect` (both `/audio` and `/download-file`).
6. **Grant endpoints idempotency** (`/admin/grant-plan`, `/promo/:djId/activate`) — same double-fire-stacks-months class as PAY-1 (Redis claim lock).
7. **PAY-8 follow-up** — orphaned storage cleanup job for pre-fix uploads.

## P1 — access control & privacy
8. **SOC-12 `isPro` self-assign** — strip from DJ-writable schema.
9. **SOC-11 sets IDOR** — mix ownership on add; filter `/mine`; `isPublic` on `GET /:id`.
10. **SOC-14 push-token hijack** — create-only or verify prior ownership.
11. **SOC-15 profilePublic/status enforcement** on public profile endpoints.
12. **EVT-1/2/3** — RSVP enumeration, gallery delete IDOR, enum-validate status/publishStatus.
13. **AUTH-4/6/8/10** — status checks at all token issuances; unify password endpoints; phone uniqueness + re-verification; Google `verified` flag.
14. **ADM-6** — split verification docs into dedicated endpoint (VERIFICATION_ADMIN/ADMIN).
15. **Cross-user avatar delete residual** (UPL-3 review) — only auto-delete keys the user uploaded.
16. **AUTH-11** — short-lived onsite staff tokens + revocation on password rotation.
17. **BKG-1** client self-confirm — require agreed finalPrice before client accept.
18. **MOD-2 RESTRICT/WARNING no-op** — validate action enum.

## P2 — ranking/gamification integrity
19. **RANK-6 self-vote**, **RANK-7 frozen base score** (recompute at close), **RANK-8/9 score-path parity**, **RANK-11 pagination/re-sort single-source**, **RANK-15 boot-backfill gating**.
20. **RANK-12 + perf:** home-board caching (load-test outlier: p50 3.1s) and trending by discovery score.
21. **RANK-3** — monthly-listener recount to cron (inline recount remains).
22. **Battle-enter TOCTOU** — unique `(battleId, djId)`.
23. **403/404 oracle** on exclusive mixes (cosmetic).
24. **SOC-19 review integrity** — block self-review, decrement communityScore on delete.
25. **Trial/referral abuse spot-checks** after implementation.

## P3 — platform hygiene & perf
26. **DB-10 status enums**, **DB-7 slug uniqueness**, **DB-9 dangling FKs**, **DB-19 booking-delete ledger**, **DB-12 duplicate indexes**, **DB-13 table renames**, **DB-14 dead OTP columns**, **DB-16 timestamptz decision**.
27. **DB-18 retention jobs** for SiteVisit/MixPlay/SystemErrorLog/EventScanLog/Notification.
28. **INFRA-13 log rotation**, **INFRA-14 WEB_CONCURRENCY cap**, **INFRA-10 CI test gate** (add `test` script), **INFRA-22/23 legacy scripts + port standardization**, **INFRA-8 homelab nginx**, **INFRA-12 CI deploy**.
29. **UPL-5 memory→disk upload storage**, **UPL-6 gallery fileFilter**, **UPL-7 magic-byte validation**, **UPL-11 orphaned-file cleanup**, **UPL-14 pixel caps**.
30. **SOC-16 notification unification**, **SOC-18 conversation N+1**, **SOC-23 groupBy stats**.
31. **DB-2 float money → integer minor units** (Month-2, with reconciliation) · **PAY-3 PayPal webhooks** (Month-2).
32. **Mobile:** MOB-2 secure token storage, MOB-4 one-time-code deeplinks, MOB-8 APK hash pinning.
33. **INFRA-21** bugReport email HTML escaping (the one SOC-8 variant not yet closed).
34. Ops: offsite backups (`BACKUP_REMOTE`), backup-failure alerting, X-Real-IP check in deployed nginx, S3-mode proof ACL (drop `public-read`), staging environment.
