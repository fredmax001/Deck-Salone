# Deck Salone — One-Page Runbook (deploy · rollback · restore)

**Prod:** VPS `31.97.116.21` (root, key `~/.ssh/deck_deploy_key`) — **hardening/phase-2 DEPLOYED 2026-09-28** (build from that branch; migrations applied; secrets rotated: JWT/DB-password/Google; prices set Pro=150/Pro+=250 SLE) · containers: `deck-salone-api` (healthy = good), `deck-salone-web`, `deck-salone-redis` · Postgres **native on host** (`deck_salone` / `deckuser`) · media `/opt/deck-salone/uploads` · backups `/opt/deck-salone/backups` (nightly 02:30 cron).

## Deploy (hardening/phase-2 first time)
```bash
# 0. PRE-DEPLOY DRIFT CHECK (mandatory — prod was db-push'd)
ssh -i ~/.ssh/deck_deploy_key root@31.97.116.21 '
  DB_URL=$(docker exec deck-salone-api printenv DATABASE_URL)   # parse user/db
  psql -h localhost -U deckuser -d deck_salone -c "\d users" -c "\d event_tickets" \
    -c "\d ranking_history" -c "\d payments" -c "\d paypal_payments" -c "\d payout_requests"'
# reconcile any missing columns/indexes/FKs with the four new migrations BEFORE step 3

# 1. Local: ship the branch
cd "~/Desktop/Deck Salone" && git push origin hardening/phase-2   # or merge to main first

# 2. Server prep (non-root container needs writable host dirs)
ssh -i ~/.ssh/deck_deploy_key root@31.97.116.21 \
  'chown -R 100:101 /opt/deck-salone/uploads /opt/deck-salone/logs'

# 3. Build + up (from repo — deploy.sh now runs migrate deploy via entrypoint, no db push)
./deploy.sh            # backs up DB first (predeploy_*.sql.gz), builds, migrates, restarts

# 4. Smoke (2 min)
curl -s https://decksalone.com/health && echo
ssh -i ~/.ssh/deck_deploy_key root@31.97.116.21 \
  'docker ps --format "{{.Names}} {{.Status}}" | grep deck-salone; \
   curl -s -o /dev/null -w "exclusive-audio-anon:%{http_code}\n" https://decksalone.com/api/mixes/<EXCLUSIVE_ID>/audio; \
   curl -s -o /dev/null -w "static-gate:%{http_code}\n" --path-as-is https://decksalone.com/uploads/./mixes/x.mp3'
# expect: healthy / 403 / 400-or-404 · then check error-free logs: docker logs deck-salone-api --since 5m | grep -i error
```
**Pricing note after deploy:** set `subscription.proPriceAnnual`/`legendPriceAnnual` config overrides to your real annual prices (admin config), update `src/pages/Pricing.tsx` copy before the next app release.

## Rollback
```bash
ssh -i ~/.ssh/deck_deploy_key root@31.97.116.21 '
  cd /opt/deck-salone
  docker compose down
  docker tag deck-salone-api:previous deck-salone-api:latest   # rollback tag (applied manually at deploy; deploy.sh's own tag step uses the wrong name — fixed in runbook, fix deploy.sh next edit)
  docker compose up -d
  curl -s http://localhost/health   # via nginx: https://decksalone.com/health'
```
DB rollback = restore (below). Migrations are backward-tolerated by old code EXCEPT `tokenVersion` (old code ignores the column — safe) and the SetNull FK changes (old code unaffected). The ranking-history unique index blocks duplicate weekly inserts — old code wrote dupes only on re-runs; acceptable.

## Restore from backup
Full procedure with verification steps: **`audit/50-RESTORE-PROCEDURE.md`** (tested 2026-09-28 — counts identical).
TL;DR: stop api → `gunzip -c backups/nightly_<ts>.sql.gz | psql -h localhost -U deckuser -d <fresh db>` → verify counts → start api. Media: `tar -xzf backups/uploads_<ts>.tar.gz -C /opt/deck-salone`. RPO ≤ 24 h (nightly) · no PITR.

## Daily ops
| Check | Command |
|---|---|
| Health | `curl -s https://decksalone.com/health` + `docker ps` (api = healthy) |
| Backups ran | `ls -t /opt/deck-salone/backups/nightly_*.sql.gz | head -1` should be < 25 h old; `tail backups/backup.log` |
| Errors | `docker logs deck-salone-api --since 24h \| grep -iE "error\\|fatal" \| tail -20` |
| Disk | `df -h /` (uploads tars + docker logs grow) |

## Break-glass contacts
- VPS console: hosting provider panel (out-of-band if SSH dies).
- Secrets: `/opt/deck-salone-v2/app/.env` on host (rotate per `80-HUMAN-TESTING.md` §14).
- This runbook + full evidence: `audit/` in the repo (FIX-LOG, restore procedure, load test, human-testing list).
