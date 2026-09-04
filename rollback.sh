#!/bin/bash
# ============================================================
# Deck Salone — Production Rollback Script
# ============================================================
#
# Usage:
#   DECK_SALONE_SERVER="root@31.97.116.21" \
#   DECK_SALONE_SSH_KEY="$HOME/.ssh/deck-salone-prod" \
#   [PREVIOUS_IMAGE="deck-salone-api:previous"] \
#   ./rollback.sh
#
# This script reverts the API container to the previously built
# Docker image. It assumes you tag the previous image before each
# deploy (see deploy.sh notes).
# ============================================================

set -e

SERVER="${DECK_SALONE_SERVER:-root@31.97.116.21}"
SSH_KEY="${DECK_SALONE_SSH_KEY:-}"
SSH_PASS="${DECK_SALONE_SSH_PASS:-}"
HOST_PROJECT="${DECK_SALONE_HOST_PROJECT:-/opt/deck-salone-v2}"
PREVIOUS_IMAGE="${DECK_SALONE_PREVIOUS_IMAGE:-deck-salone-api:previous}"

SSH_OPTS="-o StrictHostKeyChecking=no"
if [ -n "$SSH_PASS" ]; then
  SSH_OPTS="$SSH_OPTS -o BatchMode=no"
else
  SSH_OPTS="$SSH_OPTS -o BatchMode=yes"
fi
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

REMOTE_BASE=""
if [ -n "$SSH_PASS" ]; then
  export SSHPASS="$SSH_PASS"
  REMOTE_BASE="sshpass -e ssh $SSH_OPTS"
elif [ -n "$SSH_KEY" ]; then
  REMOTE_BASE="ssh $SSH_OPTS"
else
  echo "❌ Error: Set DECK_SALONE_SSH_KEY or DECK_SALONE_SSH_PASS" >&2
  exit 1
fi

echo ""
echo "🔄 Deck Salone Production Rollback"
echo "==================================="
echo ""

# Verify previous image exists
if ! $REMOTE_BASE "$SERVER" "docker image inspect $PREVIOUS_IMAGE >/dev/null 2>&1"; then
  echo "❌ Previous image '$PREVIOUS_IMAGE' not found on server." >&2
  echo "   Make sure deploy.sh tags the current image as :previous before each deploy." >&2
  exit 1
fi

echo "⏪ Reverting deck-salone-api to $PREVIOUS_IMAGE..."
$REMOTE_BASE "$SERVER" "cd $HOST_PROJECT && docker compose -f docker-compose.prod.yml stop deck-salone-api && docker compose -f docker-compose.prod.yml rm -f deck-salone-api && docker tag $PREVIOUS_IMAGE deck-salone-api:latest && docker compose -f docker-compose.prod.yml up -d deck-salone-api"

echo ""
echo "🏥 Waiting for API health check..."
for i in {1..12}; do
  if $REMOTE_BASE "$SERVER" "docker exec deck-salone-api wget -qO- http://localhost:5000/health >/dev/null 2>&1"; then
    echo "✅ API health check passed"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "⚠️ API health check did not pass within 60 seconds." >&2
    exit 1
  fi
  sleep 5
done

echo ""
echo "=================================================="
echo "🎉 ROLLBACK COMPLETE! API reverted to $PREVIOUS_IMAGE"
echo "=================================================="
echo ""
