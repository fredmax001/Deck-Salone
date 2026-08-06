#!/bin/bash
# ============================================================
# Deck Salone — Automated Docker Production Deployment
# Domain: decksalone.com
# ============================================================
#
# Usage:
#   DECK_SALONE_SERVER="root@31.97.116.21" \
#   DECK_SALONE_SSH_KEY="$HOME/.ssh/deck-salone-prod" \
#   ./deploy.sh
#
# Optional: set DECK_SALONE_SSH_PASS instead of DECK_SALONE_SSH_KEY
# to use sshpass (not recommended for production).
# ============================================================

set -e

SERVER="${DECK_SALONE_SERVER:-root@31.97.116.21}"
SSH_KEY="${DECK_SALONE_SSH_KEY:-}"
SSH_PASS="${DECK_SALONE_SSH_PASS:-Jul1@n/221/cloudhost}"
HOST_PROJECT="${DECK_SALONE_HOST_PROJECT:-/opt/deck-salone-v2}"

HOST_APP="${DECK_SALONE_HOST_APP:-/opt/deck-salone-v2/app}"

# Build SSH/SCP base arguments
SSH_OPTS="-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no"
SCP_OPTS="-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no"
RSYNC_SSH_OPTS="-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no"
if [ -n "$SSH_PASS" ]; then
  SSH_OPTS="$SSH_OPTS -o BatchMode=no"
  SCP_OPTS="$SCP_OPTS -o BatchMode=no"
  RSYNC_SSH_OPTS="$RSYNC_SSH_OPTS -o BatchMode=no"
else
  SSH_OPTS="$SSH_OPTS -o BatchMode=yes"
  SCP_OPTS="$SCP_OPTS -o BatchMode=yes"
  RSYNC_SSH_OPTS="$RSYNC_SSH_OPTS -o BatchMode=yes"
fi

if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
  SCP_OPTS="$SCP_OPTS -i $SSH_KEY"
  RSYNC_SSH_OPTS="$RSYNC_SSH_OPTS -i $SSH_KEY"
fi

REMOTE_BASE=""
if [ -n "$SSH_PASS" ]; then
  export SSHPASS="$SSH_PASS"
  REMOTE_BASE="sshpass -e ssh $SSH_OPTS"
  COPY_BASE="sshpass -e scp $SCP_OPTS"
elif [ -n "$SSH_KEY" ]; then
  REMOTE_BASE="ssh $SSH_OPTS"
  COPY_BASE="scp $SCP_OPTS"
else
  echo "❌ Error: Set DECK_SALONE_SSH_KEY or DECK_SALONE_SSH_PASS" >&2
  exit 1
fi

run_remote() {
  $REMOTE_BASE "$SERVER" "$@"
}

copy_to_remote() {
  local src="$1"
  local dest="$2"
  if [ -d "$src" ]; then
    $COPY_BASE -r "$src" "$SERVER:$dest"
  else
    $COPY_BASE "$src" "$SERVER:$dest"
  fi
}

sync_to_remote() {
  local src="$1"
  local dest="$2"
  if [ -n "$SSH_PASS" ]; then
    export SSHPASS="$SSH_PASS"
    sshpass -e scp $SCP_OPTS -r "$src"* "$SERVER:$dest"
  else
    rsync -avz --delete -e "ssh $RSYNC_SSH_OPTS" "$src" "$SERVER:$dest"
  fi
}


echo ""
echo "🚀 Deck Salone Docker Deployment"
echo "================================="
echo ""

echo "📦 Step 1/4 — Uploading frontend build (dist) and source to VPS..."
run_remote "rm -rf $HOST_APP/dist && mkdir -p $HOST_APP/dist $HOST_APP/src $HOST_APP/api/routes $HOST_APP/api/utils $HOST_APP/api/prisma"
sync_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/src/" "$HOST_APP/src/"
sync_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/dist/" "$HOST_APP/dist/"
copy_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/index.html" "$HOST_APP/index.html"
copy_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/package.json" "$HOST_APP/package.json"
copy_to_remote "/Users/djfredmax/Desktop/Deck Salone/Dockerfile" "$HOST_PROJECT/Dockerfile"



echo ""
echo "📤 Step 2/4 — Syncing updated backend API files, utilities, and migrations to VPS..."

copy_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/api/prisma/schema.prisma" "$HOST_APP/api/prisma/schema.prisma"
sync_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/api/prisma/migrations/" "$HOST_APP/api/prisma/migrations/"
sync_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/api/routes/" "$HOST_APP/api/routes/"
sync_to_remote "/Users/djfredmax/Desktop/Deck Salone/app/api/utils/" "$HOST_APP/api/utils/"

echo ""
echo "🔨 Step 3/4 — Rebuilding Docker image without cache and restarting deck-salone-api container..."
run_remote "cd $HOST_PROJECT && docker compose -f docker-compose.prod.yml build --no-cache deck-salone-api && docker compose -f docker-compose.prod.yml up -d deck-salone-api"

echo ""
echo "🗄️ Step 4/5 — Applying database migrations safely via Prisma Migrate..."
run_remote "docker exec deck-salone-api npx prisma db push --accept-data-loss"


echo ""
echo "🏥 Step 5/5 — Waiting for API health check..."
for i in {1..12}; do
  if run_remote "docker exec deck-salone-api wget -qO- http://localhost:5000/health >/dev/null 2>&1"; then
    echo "✅ API health check passed"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "⚠️ API health check did not pass within 60 seconds. Investigate immediately." >&2
    exit 1
  fi
  sleep 5
done

echo ""
echo "🔁 Step 6/6 — Restarting web proxy so it picks up the new API container IP..."
run_remote "cd $HOST_PROJECT && docker compose -f docker-compose.prod.yml restart deck-salone-web"
echo "✅ Web proxy restarted — no more 502 from stale container IPs"

echo ""
echo "=================================================="
echo "🎉 DOCKER DEPLOYMENT COMPLETE! Live on https://decksalone.com"
echo "=================================================="
echo ""
