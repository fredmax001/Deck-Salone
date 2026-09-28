# DB Backup & Restore Procedure (verified 2026-09-28)

## What exists now (installed and verified on the VPS `31.97.116.21`)

- **Backup script:** `/opt/deck-salone/scripts/backup.sh` (root-only, mode 700)
  - Dumps the `deck_salone` Postgres DB (credentials read at runtime from the running API container's `DATABASE_URL` env — never stored on disk) to `/opt/deck-salone/backups/nightly_<ts>.sql.gz`
  - Tars `/opt/deck-salone/uploads` (321 MB) to `uploads_<ts>.tar.gz`
  - Retention: 30 dumps, 7 upload tars
- **Schedule:** crontab (root): `30 2 * * * /opt/deck-salone/scripts/backup.sh >> /opt/deck-salone/backups/backup.log 2>&1`
- **Restore test:** PASSED 2026-09-28 — dump restored into scratch DB, row counts verified identical (users 60, dj_profiles 42, mixes 112, event_tickets 2, payments 0), scratch DB dropped.
- **Firewall:** Postgres (5432) and Redis (6379) now DROP all non-local traffic (`pg-firewall` systemd unit, `/usr/local/sbin/pg-firewall.sh`) — allows loopback + docker subnets only. Verified: external connection refused; app container stays healthy.

## Full restore (disaster recovery)

Run on the VPS as root:

```bash
# 1. Pick the dump
DUMP=$(ls -t /opt/deck-salone/backups/nightly_*.sql.gz | head -1)

# 2. Stop the app (avoid writes mid-restore)
cd /opt/deck-salone && docker compose stop api   # container name per compose: deck-salone-api

# 3. Get credentials from the running/exited container env
DB_URL=$(docker exec deck-salone-api printenv DATABASE_URL 2>/dev/null || \
         docker inspect deck-salone-api --format '{{range .Config.Env}}{{println .}}{{end}}' | grep ^DATABASE_URL | cut -d= -f2-)
DB_USER=<parsed username>   # see backup.sh lines 20-22 for the python parse one-liners
DB_PASS=<parsed password>
DB_NAME=deck_salone

# 4. Drop and recreate the database
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid<>pg_backend_pid();"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d postgres \
  -c "DROP DATABASE $DB_NAME;" -c "CREATE DATABASE $DB_NAME;"

# 5. Restore
gunzip -c "$DUMP" | PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q

# 6. Verify (counts should match the pre-stop state)
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM mixes) AS mixes;"

# 7. Restart the app
cd /opt/deck-salone && docker compose start api
curl -s https://decksalone.com/health   # or: docker ps → deck-salone-api (healthy)
```

## Partial restore (single table / point-in-time forensics)

```bash
gunzip -c "$DUMP" | PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d deck_salone_restoretest
# ... query, then: DROP DATABASE deck_salone_restoretest;
```

## Media restore (uploads)

```bash
cd /opt/deck-salone
tar -xzf backups/uploads_<ts>.tar.gz        # restores ./uploads/... (overwrite)
docker compose restart api                  # if anything was cached
```

## Known gaps / follow-ups

- **No offsite copy** — dumps live on the same VPS. Set `BACKUP_REMOTE` (rclone) or replicate to S3/backblaze (script logs a skip line until configured).
- **No backup-failure alerting** — check `/opt/deck-salone/backups/backup.log` or add a dead-man's-switch ping (e.g. healthchecks.io) as a cron line after the backup.
- **PITR** not available (no WAL archiving) — nightly dumps are the RPO floor (≤24 h).
- The repo script `scripts/backup.sh` targets the containerized-Postgres layout; the VPS runs Postgres natively on the host, so the production script lives at `/opt/deck-salone/scripts/backup.sh` (host mode). Reconcile the repo copy on next deploy.
