# Architecture Documentation

## High-Level Topology

The Deck Salone application utilizes a highly scalable monolithic architecture designed for eventual migration to microservices. 

1. **Nginx Reverse Proxy**: Sits at the edge. Terminates SSL, caches static assets heavily, and applies aggressive rate-limiting (`limit_req`).
2. **Node.js Cluster**: The Express backend runs in Cluster mode, spawning one worker process per CPU core. This guarantees that synchronous CPU tasks (like parsing large JSON objects or bcrypt hashing) do not block the event loop for concurrent requests.
3. **Redis Cache**: Offloads expensive database queries (e.g., fetching Top DJs). Implements graceful degradation — if Redis fails, the API immediately falls back to PostgreSQL without crashing.
4. **PostgreSQL**: The primary datastore, interacted with via Prisma ORM.

## Service-Oriented Refactor

We are actively migrating from "Fat Routes" (where validation, DB logic, and HTTP parsing live in the same file) to a **Controller-Service-Repository** pattern.

- **Controllers** (e.g., Express Route Handlers): Solely responsible for extracting data from `req.body` / `req.params`, calling a Service, and returning `res.json()`.
- **Services** (e.g., `DjService`): Pure JavaScript classes containing business logic. They interact with Redis and Prisma, and have zero knowledge of HTTP Request/Response objects. This makes them highly testable.

## Data Persistence & Optimization

To support millions of users, the database relies heavily on compound indexes for common query access patterns:
- `@@index([isPublic, createdAt])`
- `@@index([djId, isPublic])`
- `@@index([djId, status])`

Furthermore, Prisma is configured with connection pooling optimized for multi-core deployments, and slow-query event logging is active to identify missing indexes in production.

## Observability

- **Structured Logging**: Winston is used to emit structured JSON logs. This format is easily parseable by ELK, Datadog, or CloudWatch.
- **Request Tracing**: A unique `X-Request-Id` is generated at the middleware layer. This UUID follows the request through all logs, allowing developers to trace the exact lifecycle of a bug across the cluster.
- **Prometheus Metrics**: The `/metrics` endpoint exposes Node.js internals (GC stats, memory, event loop lag) and custom HTTP request histograms to provide full visibility into latency degradation.
