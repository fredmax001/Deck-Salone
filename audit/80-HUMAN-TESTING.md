# What Still Needs a Human — pentest, real devices, infra review

Everything below **cannot be closed by code review or automated tests**. Assign before public launch.

## 1. Penetration test (external, authorized)
1. **IDOR sweep** across ALL single-resource endpoints (bookings, campaigns, sets, playlists, opportunities, payouts, tickets) with an authorized fuzzer — code audit covered read paths, a pentest covers what was missed.
2. **Auth flows end-to-end:** OAuth state validation under attack, reset-token entropy, OTP windows, deeplink token injection on a real device (MOB-4 deferred mitigation means `decksalone://auth/callback?token=` still accepts planted tokens — backend rejects invalid ones, but verify).
3. **Ranking manipulation live:** confirm RANK-1 interim controls (24h dedup + auth-only ranking input + 20/min limit) hold against a motivated attacker with rotating IPs/accounts; verify Trending can't be chart-gamed.
4. **Upload abuse on the running hardened build:** polyglots through gallery/proof paths, content-sniffing behavior of deployed nginx, `?token=` cache poisoning attempts.
5. **SSRF chain validation** on `/api/proxy-image` (DNS-rebinding TOCTOU remains by design — assess accepted risk), redirect-to-internal probes.
6. **Replayed referral calls** once PAY-6 is implemented.
7. **Race-condition confirmation** for the money paths now guarded by updateMany claims (parallel-capture tooling): PAY-1, PAY-2/A7, PAY-5, RANK-5, battle-enter.
8. **Client-side stored-XSS audit of `app/src`** (React output encoding, `dangerouslySetInnerHTML` usage) — server-side escaping was audited; the client bundle was not.

## 2. Real-device / store
9. Android APK on real devices: hardened manifest behavior (cleartext blocked, backups off), deeplink flows, push notifications (post-SOC-14), media playback with tokenized URLs, Pro scanning flows.
10. Play Store pre-launch report + data-safety form (PII handling changed materially in this branch).
11. Google OAuth app verification (scopes/branding).

## 3. Infrastructure / ops review
12. **Pre-deploy drift check on prod DB** (mandatory): `\d users`, `\d event_tickets`, `\d ranking_history`, `\d payments`, `\d paypal_payments`, `\d payout_requests` — compare constraints/indexes against the four new migrations; reconcile any `db push` leftovers BEFORE `migrate deploy`.
13. **Deploy + smoke:** `chown -R 100:101 /opt/deck-salone` (non-root container), migrate deploy, health/readiness, exclusive-mix 403, static-gate bypass probes, rollback rehearsal with the `:previous` image tag.
14. **Credential rotations** (INFRA-1/MOB-5): DB password (both `deckuser`/`deck_salone` and legacy `soundit` if the old sounditdjs DB still runs), JWT_SECRET (logs all users out once), GOOGLE_CLIENT_SECRET, SMTP_PASS, TICKET_QR_SECRET — then purge git history (force-push decision) and re-key the deploy SSH key.
15. **Firewall review:** confirm nothing else on the host needs public ports; the new rules cover 5432/6379 only — INPUT policy is still ACCEPT by default (documented accepted risk; tighten with ufw default-deny in a maintenance window with console access).
16. **Offsite backup config** (`BACKUP_REMOTE`) + backup-failure alerting + quarterly restore drill.
17. **Load test on staging** replicating `51-LOAD-TEST.md` against the hardened build, including `/api/mixes/:id/audio` streaming behavior and audioLimiter under burst.
18. **nginx config review on the server** (repo copy may diverge): `proxy_set_header X-Real-IP $remote_addr` must be set or the header is spoofable; confirm `client_max_body_size` per location; add query-redaction to access logs if tokenized media URLs bother you (app logs are already redacted).

## Sign-off rule
Each item above closes only with PASS/FAIL evidence recorded here (or in a linked pentest report). Do not mark "secure" by assumption.
