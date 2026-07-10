# Deck Salone — Production-Grade Software Architecture Audit

**Auditor:** Senior Software Architect  
**Date:** 2026-07-09  
**Project:** Deck Salone — Full-Stack DJ Platform  
**Frontend:** React 19 + Vite + TypeScript + Tailwind CSS  
**Backend:** Express 5 + Prisma + PostgreSQL  
**Source Files Audited:** ~186 application files (excluding node_modules, .git, dist)  

---

## Executive Summary

Deck Salone is a feature-rich DJ platform with a well-structured monorepo-style codebase. The architecture demonstrates solid separation of concerns, comprehensive feature coverage (DJ profiles, mix uploads, battles, bookings, events, rankings, campaigns, ads, subscriptions, admin dashboard), and thoughtful attention to the Sierra Leone market context (Orange Money payments, local genre taxonomy, multi-language support).

**Overall Grade: B+ (Production-Ready with Significant Improvements Needed)**

The codebase shows mature engineering practices in many areas (algorithmic ranking, discovery engine, tiered subscriptions, audit logging) but has critical gaps in security hardening, TypeScript strictness, test coverage, and production deployment readiness that must be addressed before scaling.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Strengths](#2-strengths)
3. [Critical Issues (P0 — Must Fix Before Production)](#3-critical-issues-p0--must-fix-before-production)
4. [High-Priority Issues (P1 — Fix Within 2 Sprints)](#4-high-priority-issues-p1--fix-within-2-sprints)
5. [Medium-Priority Issues (P2 — Fix Within 1 Quarter)](#5-medium-priority-issues-p2--fix-within-1-quarter)
6. [Low-Priority Improvements (P3 — Nice to Have)](#6-low-priority-improvements-p3--nice-to-have)
7. [Database Schema Analysis](#7-database-schema-analysis)
8. [Security Audit](#8-security-audit)
9. [Performance Analysis](#9-performance-analysis)
10. [Scalability Assessment](#10-scalability-assessment)
11. [Recommendations Roadmap](#11-recommendations-roadmap)

---

## 1. Architecture Overview

### 1.1 Project Structure

```
Deck Salone/
├── app/
│   ├── src/                          # React 19 Frontend
│   │   ├── components/               # Reusable UI components
│   │   ├── pages/                    # Route-level pages
│   │   ├── hooks/                    # Custom React Query hooks
│   │   ├── stores/                   # Zustand state management
│   │   ├── lib/                      # API client, utilities
│   │   └── index.css                 # Tailwind + custom theme
│   ├── api/                          # Express 5 Backend
│   │   ├── routes/                   # API route handlers (18 modules)
│   │   ├── middleware/               # Auth, permissions
│   │   ├── utils/                    # Business logic utilities
│   │   ├── prisma/                   # Schema + seed + scripts
│   │   └── server.ts                 # Entry point
│   ├── package.json                  # Unified deps (frontend + backend)
│   └── vite.config.ts                # Build + dev proxy
├── uploads/                          # Local file storage fallback
└── research/                         # Documentation
```

### 1.2 Technology Stack

| Layer | Technology | Version | Assessment |
|-------|-----------|---------|------------|
| Frontend Framework | React | 19.2.0 | ✅ Latest, good |
| Build Tool | Vite | 7.2.4 | ✅ Fast, modern |
| Styling | Tailwind CSS | 3.4.19 | ✅ Mature, well-configured |
| UI Components | Radix UI + shadcn | Latest | ✅ Accessible, composable |
| State Management | Zustand | 5.0.14 | ✅ Lightweight, persisted |
| Data Fetching | TanStack Query | 5.101.0 | ✅ Excellent caching |
| Backend Framework | Express | 5.2.1 | ✅ Stable |
| ORM | Prisma | 5.22.0 | ✅ Type-safe, performant |
| Database | PostgreSQL | — | ✅ Production-grade |
| Auth | JWT + Passport | jsonwebtoken 9.0.3 | ⚠️ Needs hardening |
| File Storage | S3-compatible / Local | AWS SDK v3 | ✅ Flexible fallback |
| Image Processing | Sharp | 0.35.2 | ✅ Fast, WebP output |

### 1.3 API Route Inventory (18 Modules)

| Route | File | Auth | Purpose |
|-------|------|------|---------|
| `/api/auth` | `routes/auth.ts` | Mixed | Registration, login, OAuth, OTP, password reset |
| `/api/djs` | `routes/djs.ts` | Mixed | DJ CRUD, follow/unfollow, verification |
| `/api/mixes` | `routes/mixes.ts` | Mixed | Mix CRUD, likes, plays, HearThis import |
| `/api/rankings` | `routes/rankings.ts` | Public | Real-time computed rankings |
| `/api/bookings` | `routes/bookings.ts` | Required | Booking lifecycle, reviews |
| `/api/events` | `routes/events.ts` | Mixed | Event CRUD, Salone sync |
| `/api/battles` | `routes/battles.ts` | Mixed | Weekly battles, voting |
| `/api/dashboard` | `routes/dashboard.ts` | Required | DJ analytics, stats |
| `/api/admin` | `routes/admin.ts` | Admin | Platform management |
| `/api/payments` | `routes/payments.ts` | Required | Orange Money subscriptions |
| `/api/messages` | `routes/messages.ts` | Required | DM conversations |
| `/api/campaigns` | `routes/campaigns.ts` | Required | Ad campaign management |
| `/api/opportunities` | `routes/opportunities.ts` | Mixed | Gig opportunities |
| `/api/discover` | `routes/discover.ts` | Mixed | Algorithmic discovery |
| `/api/users` | `routes/users.ts` | Required | User management |
| `/api/gigs` | `routes/gigs.ts` | Mixed | Gig postings |
| `/api/photos` | `routes/photos.ts` | Mixed | DJ photo galleries |
| `/og` | `routes/og.ts` | Public | Open Graph meta tags |

---

## 2. Strengths

### 2.1 Algorithmic Ranking System (Excellent)

The platform features a sophisticated **dual-version ranking algorithm**:

- **V1** (`utils/ranking.ts`): Composite score based on Digital (40%), Industry (35%), Community (25%)
- **V2** (`utils/rankingAlgorithm.ts`): Enhanced 5-dimension scoring — Followers (20%), Ratings (20%), Mix Engagement (25%), Bookings (20%), Battles (15%)

Key strengths:
- **Real-time computation**: Rankings are computed from actual database records, never trusting stored aggregates (`rankings.ts:26-100`)
- **Cursor-based batching**: Memory-safe processing in batches of 100 (`ranking.ts:169-261`)
- **History tracking**: Weekly snapshots stored in `RankingHistory` for trend analysis
- **Battle integration**: Battle wins directly contribute to ranking scores

### 2.2 Discovery Engine (Excellent)

The `mixDiscovery.ts` module implements a weighted scoring algorithm:
- Metadata Quality (30%), Audio Quality (20%), Engagement (35%), DJ Reputation (15%)
- Personalized recommendations based on follows and liked genres
- Campaign boost integration for promoted content
- Hall of Fame candidate detection (score ≥ 70)

### 2.3 Subscription Tier System (Good)

Three-tier model with clear feature gating:
- **Free**: 5 mix uploads, basic profile
- **Pro** (SLE 250): Unlimited uploads, HearThis sync, analytics, verification eligibility
- **Legend** (SLE 750): Featured homepage, account manager, API access

Implementation via `permissions.ts` with both middleware and frontend hook (`useFeatureAccess.ts`).

### 2.4 Audio Resolution Pipeline (Good)

`audioResolver.ts` supports multiple platforms:
- **HearThis.at**: Full API v2 integration with set/playlist support
- **Audiomack**: Embed URL generation + RapidAPI enrichment
- **Direct audio files**: MP3, WAV, OGG, M4A, AAC, FLAC
- **Redirect following**: Handles signed URL chains up to 5 hops

### 2.5 Image Processing Pipeline (Good)

`imageProcessor.ts` uses Sharp for:
- Avatar: 400×400 WebP @ 80% quality
- Cover: 1920×1080 WebP @ 85% quality
- Event: 1200×800 WebP @ 85% quality
- File type validation via `file-type` library

### 2.6 Database Schema Design (Good)

- **39 models/entities** with proper relations and cascading deletes
- **Indexes** on all query-heavy columns (email, username, role, status, city, genre, etc.)
- **Enums** for type safety (Role, BookingStatus, PaymentStatus, PaymentType)
- **JSON fields** for flexible social links and streaming platforms
- **Audit logging** with actor/target tracking

### 2.7 Code Organization (Good)

- Clear separation: routes → middleware → utils → prisma
- Zod validation schemas on all route inputs
- Consistent error handling pattern (`{ success, data/error }`)
- React Query hooks co-located with TypeScript interfaces

---

## 3. Critical Issues (P0 — Must Fix Before Production)

### 3.1 🔴 TypeScript Strict Mode Disabled

**Location:** `app/api/tsconfig.json:9`  
**Issue:** `"strict": false` — The entire backend compiles with loose type checking.

**Impact:**
- `any` types propagate silently
- Null/undefined errors not caught at compile time
- Refactoring is dangerous — no type safety guarantees

**Evidence:**
```json
// api/tsconfig.json
"strict": false,  // ❌ CRITICAL
"noEmitOnError": false,  // ❌ Compiles despite errors
```

**Fix:**
```json
"strict": true,
"noEmitOnError": true,
"noImplicitAny": true,
"strictNullChecks": true,
```

**Effort:** High (2-3 sprints to fix all resulting errors)

---

### 3.2 🔴 No Input Sanitization on User-Generated Content

**Location:** Multiple routes  
**Issue:** User-provided strings (bios, descriptions, comments, messages) are stored and served without HTML sanitization.

**Evidence:**
```typescript
// routes/djs.ts — bio stored raw
const dj = await prisma.djProfile.create({
  data: { bio: data.bio, ... }  // ❌ No sanitization
});

// routes/messages.ts — content stored raw
data: { content, senderId, receiverId }  // ❌ No sanitization
```

**Impact:** XSS vulnerability — malicious users can inject `<script>` tags that execute in other users' browsers.

**Fix:** Implement DOMPurify or similar on all text inputs:
```typescript
import DOMPurify from 'isomorphic-dompurify';
const cleanBio = DOMPurify.sanitize(data.bio);
```

---

### 3.3 🔴 Duplicate Route Definitions in mixes.ts

**Location:** `app/api/routes/mixes.ts:47-205`  
**Issue:** The `GET /` and `GET /trending` routes are defined **twice** each.

**Evidence:**
```typescript
// Lines 47-134: First GET / definition
router.get('/', async (req, res) => { ... });

// Lines 135-205: SECOND identical GET / definition
router.get('/', async (req, res) => { ... });

// Lines 274-304: First GET /trending
router.get('/trending', async (req, res) => { ... });

// Lines 305-331: SECOND identical GET /trending
router.get('/trending', async (req, res) => { ... });
```

**Impact:** Express will execute the first handler only, but the second definition creates maintenance confusion and potential bugs during future edits.

**Fix:** Remove duplicate definitions (lines 135-205 and 305-331).

---

### 3.4 🔴 In-Memory OTP Store (No Redis)

**Location:** `app/api/utils/otp.ts:11`  
**Issue:** OTPs stored in a Node.js `Map` — lost on server restart, not shared across instances.

**Evidence:**
```typescript
const otpStore = new Map();  // ❌ In-memory only
```

**Impact:**
- OTPs lost on deploy/restart
- Cannot horizontally scale (multiple server instances = separate OTP stores)
- No persistence across PM2 cluster mode

**Fix:** Replace with Redis or PostgreSQL-backed store:
```typescript
// Use Redis
await redis.setex(`otp:${phone}`, 600, code);
```

---

### 3.5 🔴 No Test Suite

**Location:** Entire project  
**Issue:** Zero test files found. No unit tests, integration tests, or E2E tests.

**Impact:**
- No regression safety net
- Cannot safely refactor
- Production bugs only caught in production
- Ranking algorithm changes cannot be validated

**Fix:** Minimum viable test coverage:
- Jest + Supertest for API routes
- React Testing Library for components
- 80% coverage on auth, payments, and ranking utilities

---

### 3.6 🔴 Missing `hallOfFame` Field in Prisma Schema

**Location:** `app/api/prisma/schema.prisma`  
**Issue:** The admin routes reference `hallOfFame` on `DjProfile` and `Mix`, but the field is **not defined** in the schema.

**Evidence:**
```typescript
// admin.ts:393 — references hallOfFame
data: { hallOfFame: !dj.hallOfFame },

// But schema.prisma DjProfile model has NO hallOfFame field
```

**Impact:** This will cause a Prisma runtime error when any admin tries to toggle Hall of Fame status.

**Fix:** Add to schema:
```prisma
model DjProfile {
  // ... existing fields
  hallOfFame Boolean @default(false)
}

model Mix {
  // ... existing fields
  hallOfFame Boolean @default(false)
}
```

---

## 4. High-Priority Issues (P1 — Fix Within 2 Sprints)

### 4.1 🟠 CORS is Overly Permissive

**Location:** `app/api/server.ts:49-54`  
**Issue:** `origin: true` allows ANY origin in production.

**Evidence:**
```typescript
app.use(cors({
  origin: true,  // ❌ Allows any origin
  credentials: true,
}));
```

**Fix:**
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### 4.2 🟠 No Request Logging

**Location:** Entire backend  
**Issue:** No structured request logging (no Morgan, Pino, or Winston).

**Impact:** Cannot debug production issues, trace requests, or monitor API health.

**Fix:** Add Pino logger:
```typescript
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip });
  next();
});
```

---

### 4.3 🟠 No API Rate Limiting on Public Routes

**Location:** `app/api/server.ts`  
**Issue:** Only `/api/auth/*` has rate limiting. Public routes like `/api/djs`, `/api/mixes`, `/api/rankings` are unprotected.

**Impact:** Vulnerable to scraping, DDoS, and brute-force enumeration.

**Fix:** Apply `generalLimiter` to all public routes or add per-route limits.

---

### 4.4 🟠 Password Reset Token Not Hashed in Comparison

**Location:** `app/api/routes/auth.ts:310-317`  
**Issue:** The raw token from the URL is hashed and compared, but the comparison logic is actually correct. However, the token is sent in plaintext via email with no additional verification step.

**Assessment:** The implementation is actually secure (SHA-256 hash, 15-min expiry, single-use). Marking as lower priority.

---

### 4.5 🟠 No Database Connection Pooling Configuration

**Location:** `app/api/utils/prisma.ts`  
**Issue:** Default Prisma connection pool settings — no custom `connection_limit` or `pool_timeout`.

**Fix:**
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pooling for production
});
```

---

### 4.6 🟠 File Upload Size Limits Too Generous

**Location:** `app/api/utils/upload.ts`  
**Issue:** 500MB audio upload limit, 10MB images. No streaming/chunking for large files.

**Impact:** Memory exhaustion on concurrent uploads (all files buffered in memory via `multer.memoryStorage`).

**Fix:**
- Use `multer.diskStorage` for large files
- Implement chunked upload endpoint for audio
- Add virus scanning (ClamAV or cloud-based)

---

### 4.7 🟠 No Health Check for Database

**Location:** `app/api/server.ts:71-73`  
**Issue:** Health check only returns static JSON — does not verify database connectivity.

**Fix:**
```typescript
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected' });
  }
});
```

---

### 4.8 🟠 Missing Environment Variable Validation

**Location:** `app/api/server.ts`, multiple utils  
**Issue:** No centralized validation of required environment variables at startup.

**Evidence:**
```typescript
// jwt.ts:3-5 — throws if missing, but no graceful handling
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**Fix:** Use `envalid` or `zod` for structured env validation:
```typescript
import { cleanEnv, str, port, url } from 'envalid';
export const env = cleanEnv(process.env, {
  PORT: port({ default: 5000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  FRONTEND_URL: url(),
});
```

---

## 5. Medium-Priority Issues (P2 — Fix Within 1 Quarter)

### 5.1 🟡 No API Documentation

**Issue:** No OpenAPI/Swagger documentation. Frontend developers must read source code to understand APIs.

**Fix:** Add `swagger-ui-express` with JSDoc annotations or use `zod-to-openapi`.

---

### 5.2 🟡 No Pagination on Messages

**Location:** `app/api/routes/messages.ts:106-114`  
**Issue:** Messages endpoint fetches ALL messages between two users with no pagination.

**Fix:** Add cursor-based pagination:
```typescript
const messages = await prisma.message.findMany({
  where: { /* ... */ },
  orderBy: { createdAt: 'desc' },
  take: 50,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
});
```

---

### 5.3 🟡 Ranking Recalculation is Synchronous

**Location:** `app/api/utils/ranking.ts:169-261`  
**Issue:** Full ranking recalculation blocks the event loop. For 1000+ DJs, this could take seconds.

**Fix:**
- Move to background job (BullMQ + Redis)
- Add progress tracking
- Implement incremental updates (only changed DJs)

---

### 5.4 🟡 No CDN for Static Assets

**Location:** `app/api/utils/storage.ts`  
**Issue:** S3 URLs served directly without CloudFront/Cloudflare CDN.

**Fix:** Configure `CDN_URL` to point to a CDN distribution.

---

### 5.5 🟡 No Backup Strategy Documented

**Issue:** No evidence of database backup, disaster recovery, or data retention policies.

**Fix:**
- Automated daily PostgreSQL backups (pg_dump)
- Point-in-time recovery setup
- Documented RTO/RPO targets

---

### 5.6 🟡 Frontend Bundle Size Concerns

**Issue:** Dependencies include heavy libraries: `recharts`, `framer-motion`, `gsap`, `wavesurfer.js`, `cmdk`.

**Fix:**
- Analyze bundle with `vite-bundle-analyzer`
- Lazy-load heavy components
- Tree-shake unused Recharts components

---

### 5.7 🟡 No Error Tracking Integration

**Issue:** No Sentry, Rollbar, or similar error tracking. Production errors go unnoticed.

**Fix:** Add Sentry for both frontend and backend.

---

## 6. Low-Priority Improvements (P3 — Nice to Have)

### 6.1 🟢 Add API Versioning

Current: `/api/djs`, `/api/mixes`  
Recommended: `/api/v1/djs`, `/api/v1/mixes` for future compatibility.

---

### 6.2 🟢 Implement GraphQL or tRPC

REST is fine for now, but as the API grows, consider tRPC for end-to-end type safety.

---

### 6.3 🟢 Add Storybook for Component Documentation

Given the extensive Radix UI + Tailwind component library, Storybook would help with design system maintenance.

---

### 6.4 🟢 Implement Feature Flags

Use LaunchDarkly or Unleash for gradual rollouts of new features (battles, campaigns).

---

### 6.5 🟢 Add WebSocket Support for Real-Time Features

Messages, battle voting, and notifications would benefit from Socket.io or native WebSockets.

---

## 7. Database Schema Analysis

### 7.1 Schema Strengths

- **Comprehensive coverage**: 39 entities covering all platform features
- **Proper indexing**: Strategic indexes on query-heavy columns
- **Cascading deletes**: Prevents orphaned records
- **Audit trail**: `AuditLog` model tracks all admin actions
- **Flexible JSON fields**: `socialLinks`, `streamingLinks`, `services`

### 7.2 Schema Concerns

| Concern | Location | Impact |
|---------|----------|--------|
| Missing `hallOfFame` field | DjProfile, Mix | Runtime errors |
| `phoneOtp` stored plaintext | User model | Security risk |
| No composite index on `Mix.genre + isPublic` | Mix model | Slow genre queries |
| `Event.status` is String, not Enum | Event model | Type safety loss |
| No soft deletes | All models | Data loss on accidental delete |

### 7.3 Recommended Schema Changes

```prisma
// Add missing fields
model DjProfile {
  hallOfFame Boolean @default(false)
  deletedAt DateTime?  // Soft delete
}

model Mix {
  hallOfFame Boolean @default(false)
  deletedAt DateTime?
}

// Convert to enum
enum EventStatus {
  UPCOMING
  ONGOING
  COMPLETED
  CANCELLED
}

model Event {
  status EventStatus @default(UPCOMING)
}

// Add composite index
model Mix {
  @@index([genre, isPublic, createdAt])
}
```

---

## 8. Security Audit

### 8.1 Authentication & Authorization

| Aspect | Status | Notes |
|--------|--------|-------|
| JWT signing | ✅ | HS256 with env secret |
| JWT expiry | ✅ | 7 days |
| Password hashing | ✅ | bcrypt, 10 rounds |
| Role-based access | ✅ | Multiple role levels |
| Password reset | ✅ | SHA-256 hashed tokens, 15-min expiry |
| Google OAuth | ✅ | Passport.js with account linking |
| Phone OTP | ⚠️ | In-memory store, no SMS provider |
| Session management | ❌ | No server-side session invalidation |
| Token refresh | ❌ | No refresh token mechanism |
| 2FA | ❌ | Not implemented |

### 8.2 Data Protection

| Aspect | Status | Notes |
|--------|--------|-------|
| Input validation | ✅ | Zod schemas on all routes |
| SQL injection | ✅ | Prisma prevents raw SQL injection |
| XSS prevention | ❌ | No output sanitization |
| CSRF protection | ⚠️ | CORS + JWT only, no CSRF tokens |
| Rate limiting | ⚠️ | Only auth routes limited |
| File upload validation | ✅ | MIME type + size checks |
| Image processing | ✅ | Sharp resizes + WebP conversion |
| HTTPS enforcement | ❌ | No HSTS or redirect |

### 8.3 Infrastructure Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Helmet.js | ✅ | Basic security headers |
| CSP | ❌ | Disabled (`contentSecurityPolicy: false`) |
| Secret management | ⚠️ | .env files only |
| Dependency scanning | ❌ | No `npm audit` automation |

---

## 9. Performance Analysis

### 9.1 Database Query Patterns

**Good:**
- `Promise.all()` for parallel queries (`dashboard.ts:33-87`)
- Cursor-based pagination for rankings (`ranking.ts:180-219`)
- Raw SQL for complex aggregations (`dashboard.ts:183-203`)
- `distinct` with `UNNEST` for genre extraction (`djs.ts:278-283`)

**Needs Improvement:**
- N+1 queries in `rankings.ts` (follower count per DJ in loop)
- No query result caching (Redis)
- Full table scans possible on unindexed text searches

### 9.2 Frontend Performance

**Good:**
- Lazy loading of pages (`App.tsx:11-59`)
- React Query caching with 5-minute stale time
- Code splitting via Vite

**Needs Improvement:**
- No service worker for offline support
- No image lazy loading (native `loading="lazy"` missing)
- No prefetching of likely routes

---

## 10. Scalability Assessment

### 10.1 Current Limits

| Resource | Current | Bottleneck |
|----------|---------|------------|
| Concurrent users | ~100 | In-memory OTP, no connection pooling |
| DJs | ~1,000 | Ranking recalculation O(n) |
| Mixes | ~10,000 | Discovery algorithm loads all mixes |
| File uploads | 500MB | Memory storage, no streaming |

### 10.2 Scaling Path

1. **Immediate (0-1k users)**: Current architecture is fine
2. **Short-term (1k-10k users)**: Add Redis, connection pooling, CDN
3. **Medium-term (10k-100k users)**: Microservices split, read replicas
4. **Long-term (100k+ users)**: Event sourcing, CQRS, separate analytics DB

---

## 11. Recommendations Roadmap

### Sprint 1 (Weeks 1-2): Critical Fixes

- [ ] Fix duplicate route definitions in `mixes.ts`
- [ ] Add `hallOfFame` fields to Prisma schema + migrate
- [ ] Enable TypeScript strict mode (incremental — fix top 20 errors)
- [ ] Add DOMPurify sanitization to all text inputs
- [ ] Replace in-memory OTP with Redis

### Sprint 2 (Weeks 3-4): Security Hardening

- [ ] Lock down CORS for production
- [ ] Add structured logging (Pino)
- [ ] Implement API rate limiting on all public routes
- [ ] Add database health check
- [ ] Add environment variable validation

### Sprint 3 (Weeks 5-6): Testing & Quality

- [ ] Set up Jest + Supertest
- [ ] Write tests for auth flow
- [ ] Write tests for ranking algorithm
- [ ] Write tests for payment flow
- [ ] Add CI/CD pipeline with automated testing

### Sprint 4 (Weeks 7-8): Performance

- [ ] Add Redis for session/cache storage
- [ ] Implement query result caching
- [ ] Add connection pooling
- [ ] Optimize ranking recalculation (background jobs)
- [ ] Add CDN for static assets

### Sprint 5 (Weeks 9-10): Monitoring & Observability

- [ ] Add Sentry error tracking
- [ ] Add application metrics (Prometheus/Grafana)
- [ ] Add API response time monitoring
- [ ] Set up log aggregation
- [ ] Create runbooks for common incidents

### Sprint 6 (Weeks 11-12): Feature Polish

- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Implement WebSocket support for real-time features
- [ ] Add soft deletes across all models
- [ ] Implement proper backup strategy
- [ ] Security audit penetration testing

---

## Appendix A: File Inventory

### Backend Routes (18 files)
| File | Lines | Complexity |
|------|-------|------------|
| `routes/admin.ts` | 1,163 | High |
| `routes/djs.ts` | 638 | Medium |
| `routes/mixes.ts` | 728 | Medium |
| `routes/auth.ts` | 477 | Medium |
| `routes/bookings.ts` | 411 | Medium |
| `routes/battles.ts` | 392 | Medium |
| `routes/payments.ts` | 411 | Medium |
| `routes/dashboard.ts` | 264 | Low |
| `routes/events.ts` | 295 | Low |
| `routes/messages.ts` | 216 | Low |
| `routes/discover.ts` | 280 | Medium |
| `routes/rankings.ts` | 278 | Medium |
| `routes/campaigns.ts` | 236 | Low |
| `routes/opportunities.ts` | 226 | Low |
| `routes/og.ts` | 82 | Low |
| `routes/users.ts` | — | Low |
| `routes/gigs.ts` | — | Low |
| `routes/photos.ts` | — | Low |

### Backend Utilities (10 files)
| File | Lines | Purpose |
|------|-------|---------|
| `utils/ranking.ts` | 312 | V1 ranking algorithm |
| `utils/rankingAlgorithm.ts` | 371 | V2 ranking algorithm |
| `utils/mixDiscovery.ts` | 463 | Discovery engine |
| `utils/campaignBoost.ts` | 106 | Ad campaign boosting |
| `utils/audioResolver.ts` | 348 | Audio URL resolution |
| `utils/imageProcessor.ts` | 54 | Image processing |
| `utils/storage.ts` | 107 | S3/local file storage |
| `utils/upload.ts` | 119 | Multer configurations |
| `utils/otp.ts` | 89 | OTP service |
| `utils/email.ts` | 67 | SMTP email |

### Frontend Core (8 files)
| File | Lines | Purpose |
|------|-------|---------|
| `src/App.tsx` | 150 | Router configuration |
| `src/main.tsx` | 14 | Entry point |
| `src/stores/authStore.ts` | 117 | Auth state |
| `src/stores/playerStore.ts` | 129 | Audio player state |
| `src/lib/api.ts` | 48 | Axios client |
| `src/lib/queryClient.ts` | 11 | React Query config |
| `src/index.css` | 449 | Tailwind + theme |
| `tailwind.config.js` | 168 | Tailwind customization |

---

## Appendix B: Dependency Audit

### Known Vulnerabilities to Check

Run `npm audit` and address:
- `bcryptjs` — consider migrating to `bcrypt` (native binding, faster)
- `jsonwebtoken` — ensure latest version (CVE-2022-23529 patched)
- `express` — v5 is pre-release; consider v4 LTS for stability
- `multer` — v2 is beta; monitor for stable release

### Dependencies to Consider Adding

| Package | Purpose |
|---------|---------|
| `dompurify` | XSS sanitization |
| `ioredis` | Redis client for OTP/sessions |
| `pino` | Structured logging |
| `helmet` | Already present — enable CSP |
| `express-rate-limit` | Already present — expand usage |
| `zod` | Already present — add to env validation |
| `swagger-ui-express` | API documentation |
| `bullmq` | Background job queue |
| `sentry` | Error tracking |
| `envalid` | Environment validation |

---

*End of Audit Report*
