# Production Analysis Plan — Deck Salone

## Dimensions (parallel analysis agents)

### D1: Reverse-Engineering Agent
- Data flow: HTTP → Express → Prisma → PostgreSQL → JSON response
- Dependency graph: internal modules + external libs (axios, zod, prisma, react-query, zustand, framer-motion, etc.)
- Critical path: which 20% of code handles 80% of load

### D2: Architecture Audit Agent
- Architecture smells (coupling, layering violations, god files)
- Logic duplication (repeated patterns, copy-paste code)
- Performance bottlenecks (N+1 queries, unindexed lookups, large transfers)
- Scalability ceilings (connection limits, memory usage, file upload limits)

### D3: Performance & Optimization Agent
- Time/space complexity per operation
- Render hot paths (re-renders, expensive components)
- External dependency cost (DB queries, network calls, file I/O)
- Quick wins vs structural changes

### D4: Security Audit Agent
- Threat model (assets, attackers, entry points)
- Authentication gaps (session, token, MFA)
- Authorization paths (horizontal/vertical escalation)
- Input injection vectors (SQL, NoSQL, command, XSS, file upload)
- Data exposure (PII in logs, debug endpoints, stack traces)
- Infrastructure (secrets, dependencies, TLS)

### D5: Production Outage Investigation Agent
- Trace the exact auth failure path (Register.tsx → authStore → api.ts → backend)
- Root cause statement
- Edge case inventory
- Fix proposal with test + monitoring

### D6: Clean Architecture Redesign Agent
- Coupling map (circular dependencies, layer violations)
- Responsibility violations (business logic in UI)
- Testability score
- New module boundaries with interfaces
- Error handling strategy

## Output files
All research artifacts go to `/Users/djfredmax/Desktop/Deck Salone/research/`
