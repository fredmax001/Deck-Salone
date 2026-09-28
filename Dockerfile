# syntax=docker/dockerfile:1

# ==========================================
# 1. Base stage: Set up Node environment
# ==========================================
FROM node:20-alpine AS base
# Install necessary tools
RUN apk add --no-cache openssl
WORKDIR /app

# ==========================================
# 2. Dependencies stage: Install all modules
# ==========================================
FROM base AS deps
# We only have package.json in the /app directory
COPY app/package.json ./app/
COPY app/package-lock.json ./app/

# Install dependencies (ignoring scripts to avoid premature builds)
RUN cd app && npm ci --include=dev --ignore-scripts --legacy-peer-deps

# ==========================================
# 3. Build stage: Compile TS and React
# ==========================================
FROM base AS builder
COPY --from=deps /app/app/node_modules ./app/node_modules
COPY . .

# Generate Prisma Client
RUN cd app/api && npx prisma generate

# Build Frontend (Vite)
RUN cd app && rm -rf dist && npm run build


# Build Backend (tsc)
RUN cd app && npm run api:build

# ==========================================
# 4. Production stage: Minimal runtime image
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Non-root runtime user (INFRA-2): any RCE in the container must not be root.
RUN addgroup -S app && adduser -S app -G app

# We need Prisma CLI in production to run migrations before startup
COPY --from=builder /app/app/node_modules /app/app/node_modules
COPY --from=builder /app/app/dist /app/app/dist
COPY --from=builder /app/app/api/dist /app/app/api/dist
COPY --from=builder /app/app/api/prisma /app/app/api/prisma
COPY --from=builder /app/app/package.json /app/app/package.json
COPY --from=builder /app/app/api/tsconfig.json /app/app/api/tsconfig.json

# Entrypoint (INFRA-4): runs migrations then `exec`s node so it becomes PID 1
# and receives SIGTERM directly (no signal-swallowing `sh -c` wrapper).
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Writable app dirs (uploads/, logs/) owned by the runtime user. Note: the
# compose bind mounts (/opt/deck-salone/uploads, /opt/deck-salone/logs) mask
# these paths at runtime — host-side dirs must also be writable by the
# container UID (e.g. `chown -R 100:101 /opt/deck-salone` on the host).
RUN mkdir -p /app/app/api/uploads /app/uploads /app/logs /opt/deck-salone/uploads /opt/deck-salone/logs \
  && chown -R app:app /app/app/api/uploads /app/uploads /app/logs /opt/deck-salone

WORKDIR /app/app/api

USER app

EXPOSE 5000

# Run Prisma deploy then start the cluster (entrypoint exec's node as PID 1)
ENTRYPOINT ["/app/docker-entrypoint.sh"]
