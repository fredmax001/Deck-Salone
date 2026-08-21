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

# We need Prisma CLI in production to run migrations before startup
COPY --from=builder /app/app/node_modules /app/app/node_modules
COPY --from=builder /app/app/dist /app/app/dist
COPY --from=builder /app/app/api/dist /app/app/api/dist
COPY --from=builder /app/app/api/prisma /app/app/api/prisma
COPY --from=builder /app/app/package.json /app/app/package.json
COPY --from=builder /app/app/api/tsconfig.json /app/app/api/tsconfig.json

WORKDIR /app/app/api

EXPOSE 5000

# Run Prisma deploy and start the cluster
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/cluster.js"]
