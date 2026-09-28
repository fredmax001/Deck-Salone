#!/bin/bash
# ============================================================
# Deck Salone — Nightly Database Backup (INFRA-6)
#
# Runs pg_dump against the production Postgres, gzips the dump with a
# timestamp, prunes local retention, and OPTIONALLY copies the dump offsite.
#
# USAGE (run on the VPS, e.g. as root cron):
#   scripts/backup.sh
#
# SUGGESTED CRONTAB LINE (runs nightly at 02:30, logs to backups dir):
#   30 2 * * * /opt/deck-salone-v2/scripts/backup.sh >> /opt/deck-salone/backups/backup.log 2>&1
#
# CONVENTIONS: mirrors the pre-deploy backup step in deploy.sh (Step 3.5) —
# DATABASE_URL is read from the app .env, host.docker.internal is rewritten
# to localhost, and "?schema=public" is stripped before pg_dump.
#
# CONFIGURATION (environment variables):
#   DATABASE_URL        - full Postgres URL (default: parsed from
#                         /opt/deck-salone-v2/app/.env, same as deploy.sh)
#   BACKUP_DIR          - local dump destination
#                         (default: /opt/deck-salone/backups)
#   BACKUP_RETENTION    - number of nightly dumps to keep (default: 30)
#   BACKUP_REMOTE       - OPTIONAL offsite destination for rclone, e.g.
#                         "s3:deck-salone-backups" or "gdrive:deck-salone".
#                         Offsite copy is SKIPPED unless this is set.
#                         No credentials or destinations are hardcoded here —
#                         configure rclone remotes separately (`rclone config`).
# ============================================================

set -e

ENV_FILE="${BACKUP_ENV_FILE:-/opt/deck-salone-v2/app/.env}"
BACKUP_DIR="${BACKUP_DIR:-/opt/deck-salone/backups}"
RETENTION="${BACKUP_RETENTION:-30}"

echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) starting nightly backup..."

# Resolve DATABASE_URL: explicit env var wins, else parse from app .env.
if [ -z "${DATABASE_URL:-}" ]; then
  [ -f "$ENV_FILE" ] || { echo "[backup] ❌ DATABASE_URL unset and $ENV_FILE not found" >&2; exit 1; }
  DATABASE_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d "\"" | head -n 1)
fi
[ -n "$DATABASE_URL" ] || { echo "[backup] ❌ DATABASE_URL not found in $ENV_FILE" >&2; exit 1; }

# Same normalisation as deploy.sh: connect to localhost, drop schema param.
URL=$(echo "$DATABASE_URL" | sed "s/host.docker.internal/localhost/" | sed "s/?schema=public//")

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/nightly_$(date +%Y%m%d_%H%M%S).sql.gz"
TMP=$(mktemp)

pg_dump "$URL" > "$TMP"
gzip -c "$TMP" > "$OUT"
rm -f "$TMP"

[ -s "$OUT" ] || { echo "[backup] ❌ Backup file is empty — aborting" >&2; exit 1; }
echo "[backup] ✅ Database backed up to $OUT ($(du -h "$OUT" | cut -f1))"

# Local retention: keep the newest $RETENTION nightly dumps.
ls -t "$BACKUP_DIR"/nightly_*.sql.gz 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -f
echo "[backup] Local retention applied (keeping last $RETENTION)"

# OPTIONAL offsite upload — only when BACKUP_REMOTE is set (rclone remote name).
if [ -n "${BACKUP_REMOTE:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "[backup] Uploading offsite to rclone remote: $BACKUP_REMOTE"
    rclone copyto "$OUT" "$BACKUP_REMOTE/$(basename "$OUT")"
    echo "[backup] ✅ Offsite upload complete"
  else
    echo "[backup] ❌ BACKUP_REMOTE set but rclone is not installed — offsite copy SKIPPED" >&2
    exit 1
  fi
else
  echo "[backup] Offsite upload skipped (set BACKUP_REMOTE to enable rclone offsite copy)"
fi

echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) done."
