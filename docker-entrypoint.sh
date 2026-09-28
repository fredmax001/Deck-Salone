#!/bin/sh
# Deck Salone container entrypoint (INFRA-4).
#
# Runs pending Prisma migrations, then `exec`s the Node cluster so the node
# process replaces this shell as PID 1. That makes `docker stop` SIGTERM
# reach Node directly (server.ts drains in-flight requests on SIGTERM), instead
# of being swallowed by an `sh -c` wrapper that never forwards signals.
set -e

cd /app/app/api

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Starting API cluster..."
exec node dist/cluster.js
