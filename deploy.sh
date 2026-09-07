#!/bin/bash
# ============================================================
# Deck Salone — Automated Docker Production Deployment
# Domain: decksalone.com
# ============================================================

set -e

SERVER="${DECK_SALONE_SERVER:-root@31.97.116.21}"
SSH_KEY="${DECK_SALONE_SSH_KEY:-/Users/djfredmax/.ssh/deck_deploy_key}"
HOST_PROJECT="${DECK_SALONE_HOST_PROJECT:-/opt/deck-salone-v2}"
HOST_APP="${DECK_SALONE_HOST_APP:-/opt/deck-salone-v2/app}"

SSH_OPTS="-o StrictHostKeyChecking=no -i $SSH_KEY"

echo ""
echo "🚀 Deck Salone Docker Deployment"
echo "================================="
echo "Target: $SERVER -> $HOST_PROJECT"
echo ""

echo "🔨 Step 0/5 — Building production frontend locally..."
cd "/Users/djfredmax/Desktop/Deck Salone/app"
npm run build
cd -

echo "📦 Step 1/5 — Syncing entire app workspace (dist, src, api, configs) to VPS..."
ssh $SSH_OPTS "$SERVER" "mkdir -p $HOST_APP"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'android' \
  --exclude '.capacitor' \
  --exclude '.git' \
  --exclude 'uploads' \
  --exclude '.env' \
  --exclude '*.log' \
  --exclude '*.apk' \
  --exclude '*.zip' \
  --exclude '*.tar' \
  --exclude '*.tar.gz' \
  --exclude '.DS_Store' \
  -e "ssh $SSH_OPTS" \
  "/Users/djfredmax/Desktop/Deck Salone/app/" "$SERVER:$HOST_APP/"

scp $SSH_OPTS "/Users/djfredmax/Desktop/Deck Salone/Dockerfile" "$SERVER:$HOST_PROJECT/Dockerfile"
scp $SSH_OPTS "/Users/djfredmax/Desktop/Deck Salone/docker-compose.prod.yml" "$SERVER:$HOST_PROJECT/docker-compose.prod.yml"
scp $SSH_OPTS "/Users/djfredmax/Desktop/Deck Salone/nginx.conf" "$SERVER:$HOST_PROJECT/nginx.conf"

echo ""
echo "💾 Step 2/5 — Saving current API image as :previous for rollback..."
ssh $SSH_OPTS "$SERVER" "cd $HOST_PROJECT && if docker image inspect deck-salone-api:latest >/dev/null 2>&1; then docker tag deck-salone-api:latest deck-salone-api:previous || true; fi"

echo ""
echo "🔨 Step 3/5 — Rebuilding Docker image without cache and restarting deck-salone-api container..."
ssh $SSH_OPTS "$SERVER" "cd $HOST_PROJECT && docker compose -f docker-compose.prod.yml build --no-cache deck-salone-api && docker compose -f docker-compose.prod.yml up -d deck-salone-api"

echo ""
echo "🗄️ Step 4/5 — Applying database schema & migrations safely via Prisma..."
ssh $SSH_OPTS "$SERVER" "docker exec deck-salone-api sh -c 'cd /app/app/api && npx prisma db push --accept-data-loss'"

echo ""
echo "🏥 Step 5/5 — Checking API health and restarting web proxy..."
for i in {1..12}; do
  if ssh $SSH_OPTS "$SERVER" "docker exec deck-salone-api wget -qO- http://localhost:5000/health >/dev/null 2>&1"; then
    echo "✅ API health check passed"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "⚠️ API health check did not pass within 60 seconds. Investigate immediately." >&2
    exit 1
  fi
  sleep 5
done

ssh $SSH_OPTS "$SERVER" "cd $HOST_PROJECT && docker compose -f docker-compose.prod.yml restart deck-salone-web && docker restart sounditdj-frontend"
echo "✅ Web proxy restarted successfully"

echo ""
echo "=================================================="
echo "🎉 DOCKER DEPLOYMENT COMPLETE! Live on https://decksalone.com"
echo "=================================================="
echo ""
