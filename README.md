# Deck Salone

Deck Salone is an enterprise-grade platform built for discovering, booking, and connecting with DJs across Sierra Leone.

## Architecture

This project is built using a modern, scalable stack:
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Framer Motion, React Query, Zustand.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM.
- **Database**: PostgreSQL (Primary Datastore), Redis (Caching layer).
- **DevOps**: Docker, Nginx, GitHub Actions.

For an in-depth breakdown of the system architecture, caching strategies, and service boundaries, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick Start (Docker)

To run the entire stack locally in production mode:

```bash
docker-compose up --build
```
This will spin up:
- The Node.js application (Cluster Mode) on port 5000
- PostgreSQL Database on port 5432
- Redis on port 6379
- Nginx Reverse Proxy on port 80

## Quick Start (Development)

Ensure you have Node.js 20+ and Postgres installed.

```bash
# 1. Install dependencies
cd app
npm install

# 2. Setup Environment
cp .env.example .env
# Fill in database credentials

# 3. Generate Prisma
cd api
npx prisma generate
npx prisma db push

# 4. Start Development Servers
cd ../
npm run dev
```

## Testing

The project uses Jest and Supertest for unit and integration testing.

```bash
cd app
npm run test
```

## Observability

The API exposes Prometheus metrics at `http://localhost:5000/metrics`. This endpoint provides insights into:
- Event loop lag
- Memory consumption
- HTTP Request duration and histograms

## Security

The application is hardened against OWASP top 10 vulnerabilities:
- **Zod Validation**: All inbound HTTP payloads are strictly validated against declarative schemas.
- **Helmet Headers**: Enforced HSTS, anti-clickjacking, and XSS protection.
- **Rate Limiting**: Nginx and Express both provide layered rate-limiting.
- **File Uploads**: Files are strictly type-checked and sanitized before being processed.

## License
Proprietary - Deck Salone © 2026
