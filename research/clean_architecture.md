# CLEAN ARCHITECTURE REDESIGN

## Executive Summary

**Codebase:** Deck Salone — a full-stack DJ platform (React + Express + Prisma + PostgreSQL)  
**Total Source Lines Read:** ~12,500+ across 47 files  
**Current Architecture:** Flat, monolithic Express + React SPA with no layered separation  
**Target Architecture:** Ports-and-Adapters (Hexagonal) with clear domain, application, and infrastructure layers.

---

## 1. ANALYSIS PHASE

### 1.1 Current Coupling Map

#### Backend Modules (API)

| Module | Imports (Direct Dependencies) | Imported By (Reverse Dependencies) | Circular Dependencies |
|--------|--------------------------------|--------------------------------------|----------------------|
| `api/server.ts` | express, cors, helmet, passport, prisma, authMiddleware, generalLimiter, serveUploads, all route files | — (entry point) | None |
| `api/middleware/auth.ts` | jwt, prisma | server.ts, auth.ts, djs.ts, mixes.ts, bookings.ts, events.ts, payments.ts, battles.ts, dashboard.ts, messages.ts, reviews.ts | **Circular via server.ts** — middleware imports utils, routes import middleware, server imports both |
| `api/utils/prisma.ts` | @prisma/client | auth.ts, passport.ts, ranking.ts, all routes, middleware, scripts, seed | None |
| `api/utils/jwt.ts` | jsonwebtoken, env | auth.ts, middleware/auth.ts, passport.ts, otp.ts | None |
| `api/utils/passport.ts` | passport, GoogleStrategy, prisma, jwt | server.ts | None |
| `api/utils/ranking.ts` | prisma | djs.ts, battles.ts, dashboard.ts, admin.ts, seed.ts | None |
| `api/utils/otp.ts` | jwt | auth.ts | None |
| `api/utils/upload.ts` | multer, fs, path | djs.ts, mixes.ts, events.ts | None |
| `api/utils/storage.ts` | @aws-sdk/client-s3, fs, path, crypto | djs.ts, mixes.ts, events.ts | None |
| `api/utils/imageProcessor.ts` | sharp, file-type | djs.ts, mixes.ts, events.ts | None |
| `api/utils/rateLimiter.ts` | express-rate-limit | server.ts, auth.ts, bookings.ts, battles.ts | None |
| `api/routes/auth.ts` | express, bcrypt, zod, passport, prisma, jwt, authMiddleware, otp, rateLimiter | server.ts | None |
| `api/routes/djs.ts` | express, zod, prisma, authMiddleware, upload, imageProcessor, storage, ranking | server.ts | None |
| `api/routes/mixes.ts` | express, zod, prisma, authMiddleware, upload, storage, imageProcessor | server.ts | None |
| `api/routes/bookings.ts` | express, zod, prisma, authMiddleware, rateLimiter | server.ts | None |
| `api/routes/events.ts` | express, zod, prisma, authMiddleware, upload, imageProcessor, storage | server.ts | None |
| `api/routes/payments.ts` | express, zod, prisma, authMiddleware | server.ts | None |
| `api/routes/battles.ts` | express, zod, prisma, authMiddleware, rateLimiter, ranking | server.ts | None |
| `api/routes/rankings.ts` | express, zod, prisma, ranking | server.ts | None |
| `api/routes/reviews.ts` | express, zod, prisma, authMiddleware | server.ts | None |
| `api/routes/dashboard.ts` | express, prisma, authMiddleware, ranking | server.ts | None |
| `api/routes/admin.ts` | express, zod, prisma, authMiddleware, ranking | server.ts | None |
| `api/routes/messages.ts` | express, zod, prisma, authMiddleware | server.ts | None |

#### Frontend Modules (React)

| Module | Imports | Imported By | Circular Dependencies |
|--------|---------|-------------|----------------------|
| `src/App.tsx` | react-router-dom, authStore, ProtectedRoute, all pages, all layouts | main.tsx | None |
| `src/main.tsx` | react-dom, react-query, App, authStore | index.html (entry) | None |
| `src/lib/api.ts` | axios | All hooks, some pages (Dashboard, Overview, etc.) | None |
| `src/lib/queryClient.ts` | @tanstack/react-query | main.tsx | None |
| `src/lib/utils.ts` | clsx, tailwind-merge | Every UI component, many pages | None |
| `src/stores/authStore.ts` | zustand, zustand/persist, api | App, ProtectedRoute, Layout, Navbar, DashboardLayout, Dashboard, Overview, DjProfile, Login, Register, AuthCallback, AuthLayout | **None direct, but pervasive** |
| `src/hooks/*.ts` | react-query, api | Pages, components | None |
| `src/components/Layout.tsx` | react-router-dom, Navbar, BottomNav, Footer, MixPlayer, authStore | App | None |
| `src/components/DashboardLayout.tsx` | framer-motion, lucide-react, authStore, ui components | App | None |
| `src/pages/*.tsx` | react, react-router-dom, framer-motion, recharts, lucide-react, hooks, stores, api, ui components | App | None |

#### Dependency Direction Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION                         │
│  (React Components, Pages, Layouts, Zustand, React Query)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ direct axios calls
┌─────────────────────────────────────────────────────────────┐
│                      TRANSPORT (HTTP)                         │
│  (Express routes, middleware, multer, rate limiters)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ direct Prisma calls
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE (DB)                        │
│  (Prisma ORM, PostgreSQL, S3, sharp, jwt)                     │
└─────────────────────────────────────────────────────────────┘
```

**Problem:** There is no **Domain** or **Application** layer. Business logic lives inside Express handlers and React components.

---

### 1.2 Responsibility Violations

Where business logic leaks into UI/transport layers:

- [x] **File:** `api/routes/auth.ts` → **Leak:** Username generation, password hashing, OTP verification, and JWT issuance all happen in the route handler. → **Should be in:** `AuthService` / `UserService` in the Application layer.
- [x] **File:** `api/routes/bookings.ts` → **Leak:** Booking status transition validation (`validTransitions` map), price negotiation permission checks (`only DJ can set finalPrice`), and review gating (`only review completed bookings`) are all inline in route handlers. → **Should be in:** `BookingService` / `BookingDomain` entity.
- [x] **File:** `api/routes/payments.ts` → **Leak:** Payment flow logic (deposit triggers booking status change, full payment marks completed) and refund creation with negative amount are inline in route handlers. → **Should be in:** `PaymentService` / `PaymentDomain` entity.
- [x] **File:** `api/routes/battles.ts` → **Leak:** Vote scoring algorithm (`baseScore * 0.6 + voteScore * 0.4`), battle close logic (badge assignment, ranking boost), and winner determination are all in the route handler. → **Should be in:** `BattleService` / `BattleDomain` entity.
- [x] **File:** `api/routes/reviews.ts` → **Leak:** Average rating recalculation after create/delete is in the route handler. → **Should be in:** `ReviewService` or domain event handler.
- [x] **File:** `api/utils/ranking.ts` → **Leak:** The entire ranking algorithm is in a utility file that depends directly on Prisma. It is neither a pure domain function nor a service — it is a procedural script with embedded DB calls. → **Should be in:** `RankingService` with a pure `RankingCalculator` domain module that accepts plain data and returns scores.
- [x] **File:** `src/pages/DjProfile.tsx` → **Leak:** Budget parsing (`parseBudget`), duration parsing (`parseDuration`), form validation, and booking data construction are in the UI component. → **Should be in:** Application layer or dedicated form schema (zod) on frontend.
- [x] **File:** `src/pages/Dashboard.tsx` → **Leak:** Username update logic, API calls, and state updates are mixed in the component. → **Should be in:** A dedicated hook or application service.
- [x] **File:** `src/pages/AdminDashboard.tsx` → **Leak:** Empty data placeholders, mock-like static data, and inline table rendering with business logic. → **Should be in:** Separate data presentation layer with dedicated view models.
- [x] **File:** `src/stores/authStore.ts` → **Leak:** Direct API calls and localStorage manipulation mixed with state management. → **Should be in:** `AuthService` with injected storage adapter.
- [x] **File:** `api/server.ts` → **Leak:** OpenGraph HTML generation with DB query (`prisma.djProfile.findFirst`) lives in the Express server entry. → **Should be in:** A dedicated `OGImageService` or middleware adapter.

---

### 1.3 Testability Score

#### Backend

| Module | Unit Testable? | Why / Why Not |
|--------|----------------|---------------|
| `api/routes/*.ts` | ❌ **No** | Direct `prisma` calls, Express `req/res` dependencies, inline validation logic. Requires integration test with full DB. |
| `api/utils/ranking.ts` | ⚠️ **Partially** | Functions like `calculateDigitalScore` are pure given mocked data, but `computeDjScore` and `recalculateAllRankings` directly call `prisma`. |
| `api/utils/jwt.ts` | ✅ **Yes** | Pure functions with no external dependencies (except env). |
| `api/utils/otp.ts` | ⚠️ **Partially** | In-memory store is testable, but `setInterval` cleanup and `signToken` dependency make it brittle. |
| `api/utils/imageProcessor.ts` | ⚠️ **Partially** | Depends on `sharp` and `file-type`; requires file system or buffer mocks. |
| `api/utils/storage.ts` | ❌ **No** | Direct S3 client and fs calls; no abstraction. |
| `api/utils/passport.ts` | ❌ **No** | Tightly coupled to Passport.js strategy lifecycle. |
| `api/utils/rateLimiter.ts` | ✅ **Yes** | Pure config objects, but requires Express integration to verify. |
| `api/middleware/auth.ts` | ❌ **No** | Depends on `prisma` and Express `req/res/next`. |

**Overall Backend Estimate:** ~15% of code can be unit tested without mocks/infrastructure. The rest requires either heavy mocking or integration tests.

#### Frontend

| Module | Unit Testable? | Why / Why Not |
|--------|----------------|---------------|
| `src/hooks/*.ts` | ⚠️ **Partially** | Depends on `api` (axios) and React Query. Can be mocked but requires mock provider. |
| `src/stores/authStore.ts` | ❌ **No** | Direct `localStorage` and `api` dependencies inside the store. |
| `src/lib/api.ts` | ❌ **No** | Singleton axios instance with global interceptors. |
| `src/lib/utils.ts` | ✅ **Yes** | Pure `cn()` function. |
| `src/components/*.tsx` (UI) | ✅ **Yes** | Shadcn UI components are presentational and testable. |
| `src/components/*.tsx` (app) | ❌ **No** | `Layout`, `Navbar`, `DashboardLayout`, `MixPlayer` all depend on stores, router, or browser APIs. |
| `src/pages/*.tsx` | ❌ **No** | Every page mixes data fetching, business logic, and presentation. |

**Overall Frontend Estimate:** ~5% of code can be unit tested without mocks/infrastructure.

---

## 2. REDESIGN PHASE

### 2.1 New Module Boundaries

#### Domain Modules (Pure, no external dependencies)

| Domain | Responsibilities | Entities / Value Objects |
|--------|------------------|--------------------------|
| `user` | Authentication, authorization, roles, usernames | `User`, `Role`, `Username` |
| `dj` | Profile, ranking, verification, streaming platforms | `DjProfile`, `RankingScore`, `StreamingPlatform` |
| `mix` | Upload, metadata, plays, likes, downloads | `Mix`, `MixStats`, `Genre` |
| `booking` | Request, negotiation, status transitions, pricing | `Booking`, `BookingStatus`, `Price` |
| `payment` | Deposit, full payment, refund, provider tracking | `Payment`, `PaymentStatus`, `PaymentType` |
| `battle` | Weekly competition, entries, voting, scoring | `Battle`, `BattleEntry`, `Vote` |
| `review` | Ratings, comments, verified status, average recalculation | `Review`, `Rating` |
| `event` | Calendar, slots, ticketing, Sound It Salone sync | `Event`, `EventType` |
| `message` | Conversations, read receipts, soft delete | `Message`, `Conversation` |
| `ranking` | Algorithm, score calculation, history | `RankingCalculator`, `ScoreWeights` |

#### Interface Definitions (Ports)

```typescript
// ports/UserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

// ports/TokenService.ts
export interface ITokenService {
  sign(payload: object): string;
  verify(token: string): object | null;
}

// ports/PasswordHasher.ts
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

// ports/FileStorage.ts
export interface IFileStorage {
  upload(buffer: Buffer, key: string, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}

// ports/NotificationService.ts (for SMS, Email)
export interface INotificationService {
  sendOtp(phone: string, code: string): Promise<void>;
  sendPasswordReset(email: string, url: string): Promise<void>;
}

// ports/AnalyticsTracker.ts
export interface IAnalyticsTracker {
  trackMixPlay(mixId: string, userId?: string): Promise<void>;
}
```

#### Dependency Direction Rules

```
Domain → (nothing, pure functions and entities)
Application → Domain, Ports (interfaces only)
Infrastructure → Application, Ports (implements adapters)
Interface/Transport → Application, Infrastructure (wires everything)
```

**Rule:** Inner layers know nothing about outer layers. `Domain` has zero imports from `Application` or `Infrastructure`.

---

### 2.2 Error Handling Strategy

**Single approach:** `Result<T, E>` pattern (also known as `Either` or `AppResult`).

**Applied consistently:**
- All use cases return `Result<T, DomainError>`.
- Domain errors are typed enums: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`, `BusinessRuleError`.
- Express controllers map `Result` to HTTP status codes:
  - `Ok(data)` → 200/201
  - `Err(NotFoundError)` → 404
  - `Err(ValidationError)` → 400
  - `Err(UnauthorizedError)` → 401
  - `Err(ConflictError)` → 409
  - `Err(BusinessRuleError)` → 422
- React hooks consume `Result` and surface `error` to UI components.
- No `try/catch` blocks in route handlers or UI components for business logic. All exceptions are caught at the application boundary.

**Why this matters:** If we need to add a new error type (e.g., `RateLimitError`) in 6 months, we add it to the `DomainError` union, and both backend and frontend get compiler warnings for unhandled cases. Currently, error handling is ad-hoc strings scattered across 500+ lines of route handlers.

---

## 3. IMPLEMENTATION PHASE

### 3.1 New File Structure

```
app/
├── src/
│   ├── domain/                    # ← Pure business logic, no deps
│   │   ├── user/
│   │   │   ├── User.ts              # Entity with validation
│   │   │   ├── Role.ts              # Value object
│   │   │   ├── Username.ts          # Value object with rules
│   │   │   ├── UserRepository.ts    # Port (interface)
│   │   │   └── __tests__/
│   │   ├── dj/
│   │   │   ├── DjProfile.ts
│   │   │   ├── RankingScore.ts
│   │   │   ├── RankingCalculator.ts # Pure function, no Prisma
│   │   │   ├── DjRepository.ts
│   │   │   └── __tests__/
│   │   ├── booking/
│   │   │   ├── Booking.ts
│   │   │   ├── BookingStatus.ts     # State machine
│   │   │   ├── BookingRepository.ts
│   │   │   └── __tests__/
│   │   ├── mix/
│   │   ├── payment/
│   │   ├── battle/
│   │   ├── review/
│   │   ├── event/
│   │   ├── message/
│   │   └── shared/
│   │       ├── Result.ts
│   │       ├── DomainError.ts
│   │       └── Entity.ts
│   │
│   ├── application/               # ← Use cases, orchestration
│   │   ├── auth/
│   │   │   ├── LoginUseCase.ts
│   │   │   ├── RegisterUseCase.ts
│   │   │   ├── VerifyOtpUseCase.ts
│   │   │   └── ResetPasswordUseCase.ts
│   │   ├── dj/
│   │   │   ├── CreateDjProfileUseCase.ts
│   │   │   ├── UpdateDjProfileUseCase.ts
│   │   │   └── RecalculateRankingUseCase.ts
│   │   ├── booking/
│   │   │   ├── CreateBookingUseCase.ts
│   │   │   ├── UpdateBookingStatusUseCase.ts
│   │   │   └── AddBookingReviewUseCase.ts
│   │   ├── mix/
│   │   ├── payment/
│   │   ├── battle/
│   │   ├── review/
│   │   ├── event/
│   │   ├── message/
│   │   └── admin/
│   │       ├── GetAdminStatsUseCase.ts
│   │       └── VerifyDjUseCase.ts
│   │
│   ├── infrastructure/            # ← Adapters for external concerns
│   │   ├── persistence/
│   │   │   ├── PrismaUserRepository.ts
│   │   │   ├── PrismaDjRepository.ts
│   │   │   ├── PrismaBookingRepository.ts
│   │   │   └── PrismaClient.ts
│   │   ├── auth/
│   │   │   ├── JwtTokenService.ts
│   │   │   ├── BcryptPasswordHasher.ts
│   │   │   └── PassportConfigurator.ts
│   │   ├── storage/
│   │   │   ├── S3FileStorage.ts
│   │   │   └── LocalFileStorage.ts
│   │   ├── image/
│   │   │   └── SharpImageProcessor.ts
│   │   ├── notification/
│   │   │   ├── ConsoleNotificationService.ts
│   │   │   └── TwilioNotificationService.ts
│   │   └── rate-limit/
│   │       └── ExpressRateLimiter.ts
│   │
│   ├── interface/                 # ← Transport layer (HTTP)
│   │   ├── http/
│   │   │   ├── server.ts          # Express bootstrap, DI wiring
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── requestValidator.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── dj.routes.ts
│   │   │   │   ├── booking.routes.ts
│   │   │   │   └── ...
│   │   │   ├── controllers/
│   │   │   │   ├── AuthController.ts
│   │   │   │   ├── DjController.ts
│   │   │   │   └── ...
│   │   │   └── dto/
│   │   │       ├── CreateDjProfileDto.ts
│   │   │       └── ...
│   │   └── og/
│   │       └── OpenGraphHandler.ts
│   │
│   ├── scripts/                   # ← One-off scripts, migrations
│   │   ├── seed.ts
│   │   └── backfill-usernames.ts
│   │
│   └── prisma/
│       └── schema.prisma
│
├── web/                           # ← React frontend (separate concern)
│   ├── src/
│   │   ├── domain/                 # ← Shared types, value objects
│   │   │   ├── user/
│   │   │   ├── booking/
│   │   │   └── ...
│   │   ├── application/            # ← Frontend use cases / services
│   │   │   ├── auth/
│   │   │   │   └── AuthService.ts    # Port over from store
│   │   │   ├── api/
│   │   │   │   └── ApiClient.ts
│   │   │   └── ...
│   │   ├── infrastructure/           # ← Adapters
│   │   │   ├── storage/
│   │   │   │   └── LocalStorageTokenStore.ts
│   │   │   └── api/
│   │   │       └── AxiosApiClient.ts
│   │   ├── presentation/           # ← UI layer
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/              # React Query hooks, thin wrappers
│   │   │   ├── stores/             # Zustand stores (UI state only)
│   │   │   └── App.tsx
│   │   └── main.tsx
│   └── ...
│
└── README.md
```

---

### 3.2 Refactored Code Examples

#### Example A: Extracting Ranking Algorithm to Pure Domain

**BEFORE (api/utils/ranking.ts):**
```typescript
// Directly imports prisma and queries DB inside calculation
const { prisma } = require('./prisma');

async function computeDjScore(djId) {
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    include: { streamingPlatforms: true, mixes: true, reviews: true },
  });
  if (!dj) return null;
  const digitalScore = calculateDigitalScore(dj, dj.streamingPlatforms, dj.mixes.length);
  // ...
}

module.exports = { computeDjScore, recalculateAllRankings, calculateBattleBaseScore };
```

**AFTER (src/domain/dj/RankingCalculator.ts):**
```typescript
// CHANGED: No external dependencies. Pure function.
// If data changes, we change the DTO shape, not this function.

export interface RankingInput {
  totalFollowers: number;
  totalStreams: number;
  totalMixes: number;
  totalBookings: number;
  totalEvents: number;
  yearsActive: number;
  awards: string[];
  equipment: string[];
  verified: boolean;
  averageRating: number;
  reviewsCount: number;
  platforms: { followers: number; streams: number; uploads: number }[];
}

export interface RankingOutput {
  digitalScore: number;
  industryScore: number;
  communityScore: number;
  rankingScore: number;
}

export const WEIGHTS = {
  digital: 0.40,
  industry: 0.35,
  community: 0.25,
} as const;

// CHANGED: All functions are pure and synchronous
export function calculateDigitalScore(input: RankingInput): number {
  let score = 0;
  const totalFollowers = input.platforms.reduce((sum, p) => sum + p.followers, 0) || input.totalFollowers;
  score += Math.min(30, (totalFollowers / 50000) * 30);
  const totalStreams = input.platforms.reduce((sum, p) => sum + p.streams, 0) || input.totalStreams;
  score += Math.min(25, (totalStreams / 1000000) * 25);
  score += Math.min(20, (input.totalMixes / 50) * 20);
  score += Math.min(15, input.platforms.length * 5);
  const engagementScore = input.totalStreams > 0
    ? Math.min(10, ((input.totalMixes * 100) / input.totalStreams) * 10)
    : 0;
  score += engagementScore;
  return Math.round(score * 10) / 10;
}

export function calculateIndustryScore(input: RankingInput): number {
  let score = 0;
  score += Math.min(35, (input.totalBookings / 100) * 35);
  score += Math.min(20, (input.totalEvents / 150) * 20);
  score += Math.min(15, ((input.yearsActive || 0) / 15) * 15);
  score += Math.min(15, (input.awards || []).length * 5);
  score += input.verified ? 10 : 0;
  score += Math.min(5, (input.equipment || []).length * 2);
  return Math.round(score * 10) / 10;
}

export function calculateCommunityScore(input: RankingInput): number {
  let score = 0;
  score += Math.min(40, (input.averageRating || 0) * 8);
  score += Math.min(25, (input.reviewsCount / 50) * 25);
  score += Math.min(20, (input.totalFollowers / 30000) * 20);
  const totalMixes = Math.max(1, input.totalMixes);
  const likesPerMix = (input.totalMixes * 100) / totalMixes; // simplified
  score += Math.min(15, likesPerMix / 100);
  return Math.round(score * 10) / 10;
}

export function computeRanking(input: RankingInput): RankingOutput {
  const digitalScore = calculateDigitalScore(input);
  const industryScore = calculateIndustryScore(input);
  const communityScore = calculateCommunityScore(input);
  const rankingScore =
    digitalScore * WEIGHTS.digital +
    industryScore * WEIGHTS.industry +
    communityScore * WEIGHTS.community;

  return {
    digitalScore: Math.round(digitalScore * 10) / 10,
    industryScore: Math.round(industryScore * 10) / 10,
    communityScore: Math.round(communityScore * 10) / 10,
    rankingScore: Math.round(rankingScore * 10) / 10,
  };
}
```

**Why this matters:** `RankingCalculator.ts` can now be unit tested with 100% coverage using plain objects — no database, no Prisma, no filesystem. If we need to change the algorithm weights in 6 months, we change only this file, and we can run 10,000 property-based tests in milliseconds.

---

#### Example B: Extracting Booking Status Logic to Domain Entity

**BEFORE (api/routes/bookings.ts):**
```typescript
// Status transition validation embedded in route handler
const validTransitions = {
  PENDING: ['NEGOTIATING', 'CONFIRMED', 'CANCELLED'],
  NEGOTIATING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DEPOSIT_PAID', 'CANCELLED'],
  DEPOSIT_PAID: ['COMPLETED', 'REFUNDED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

if (!validTransitions[booking.status]?.includes(status)) {
  return res.status(400).json({ success: false, error: `Cannot transition from ${booking.status} to ${status}` });
}
// Only DJ can set finalPrice; only client can confirm when DJ proposes
if (finalPrice !== undefined && !isDj && !isAdmin) {
  return res.status(403).json({ success: false, error: 'Only the DJ can set the final price' });
}
```

**AFTER (src/domain/booking/BookingStatus.ts):**
```typescript
// CHANGED: State machine is a first-class domain concept
export type BookingStatus =
  | 'PENDING'
  | 'NEGOTIATING'
  | 'CONFIRMED'
  | 'DEPOSIT_PAID'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type BookingRole = 'CLIENT' | 'DJ' | 'ADMIN';

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['NEGOTIATING', 'CONFIRMED', 'CANCELLED'],
  NEGOTIATING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DEPOSIT_PAID', 'CANCELLED'],
  DEPOSIT_PAID: ['COMPLETED', 'REFUNDED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const PERMISSIONS: Record<string, BookingRole[]> = {
  setFinalPrice: ['DJ', 'ADMIN'],
  setDeposit: ['DJ', 'ADMIN'],
  confirm: ['CLIENT', 'ADMIN'],
  cancel: ['CLIENT', 'DJ', 'ADMIN'],
  complete: ['DJ', 'ADMIN'],
  refund: ['ADMIN'],
};

export class BookingStatusMachine {
  // CHANGED: Domain error, not HTTP error
  canTransition(from: BookingStatus, to: BookingStatus): Result<true, BusinessRuleError> {
    const allowed = TRANSITIONS[from];
    if (!allowed.includes(to)) {
      return Err(new BusinessRuleError(`Cannot transition from ${from} to ${to}`));
    }
    return Ok(true);
  }

  canPerformAction(action: string, role: BookingRole): Result<true, UnauthorizedError> {
    const allowed = PERMISSIONS[action];
    if (!allowed?.includes(role)) {
      return Err(new UnauthorizedError(`Role ${role} cannot perform ${action}`));
    }
    return Ok(true);
  }
}
```

**AFTER (src/application/booking/UpdateBookingStatusUseCase.ts):**
```typescript
export class UpdateBookingStatusUseCase {
  constructor(
    private bookingRepo: IBookingRepository,
    private statusMachine: BookingStatusMachine,
    private notifier: INotificationService
  ) {}

  async execute(input: UpdateBookingStatusInput): Promise<Result<Booking, DomainError>> {
    const booking = await this.bookingRepo.findById(input.bookingId);
    if (!booking) return Err(new NotFoundError('Booking not found'));

    const transitionResult = this.statusMachine.canTransition(booking.status, input.newStatus);
    if (transitionResult.isErr()) return transitionResult;

    if (input.finalPrice !== undefined) {
      const perm = this.statusMachine.canPerformAction('setFinalPrice', input.role);
      if (perm.isErr()) return perm;
    }

    // CHANGED: Business rules enforced before any DB write
    const updated = await this.bookingRepo.update(input.bookingId, {
      status: input.newStatus,
      finalPrice: input.finalPrice,
      deposit: input.deposit,
    });

    await this.notifier.notifyBookingStatusChange(updated);
    return Ok(updated);
  }
}
```

**Why this matters:** If we need to add a new booking status (e.g., `DISPUTED`) in 6 months, we change only `BookingStatus.ts` and `PERMISSIONS`. The route handler becomes a thin translation layer that cannot accidentally bypass rules.

---

#### Example C: Extracting Frontend Auth Logic to Application Service

**BEFORE (src/stores/authStore.ts):**
```typescript
// Direct API calls, localStorage manipulation, and state management all mixed
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        if (res.data.success) {
          localStorage.setItem('soundit_token', res.data.data.token);
          set({ user: res.data.data.user, token: res.data.data.token, isAuthenticated: true });
          return { success: true };
        }
        return { success: false, error: 'Login failed' };
      },
      // ...
    }),
    { name: 'soundit-auth', partialize: (state) => ({ token: state.token }) }
  )
);
```

**AFTER (web/src/application/auth/AuthService.ts):**
```typescript
// CHANGED: Port for token storage — injectable, testable
export interface ITokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
}

// CHANGED: AuthService has no dependency on React or Zustand
export class AuthService {
  constructor(
    private apiClient: IApiClient,
    private tokenStorage: ITokenStorage
  ) {}

  async login(credentials: LoginCredentials): Promise<Result<User, AuthError>> {
    const result = await this.apiClient.post('/auth/login', credentials);
    if (result.isErr()) return result;

    const { user, token } = result.value.data;
    this.tokenStorage.setToken(token);
    return Ok(user);
  }

  async logout(): Promise<void> {
    this.tokenStorage.removeToken();
  }

  async fetchMe(): Promise<Result<User, AuthError>> {
    const token = this.tokenStorage.getToken();
    if (!token) return Err(new AuthError('No token'));
    return this.apiClient.get('/auth/me');
  }
}
```

**AFTER (web/src/infrastructure/storage/LocalStorageTokenStore.ts):**
```typescript
export class LocalStorageTokenStore implements ITokenStorage {
  private readonly key = 'soundit_token';

  getToken(): string | null {
    return localStorage.getItem(this.key);
  }

  setToken(token: string): void {
    localStorage.setItem(this.key, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.key);
  }
}
```

**AFTER (web/src/presentation/stores/authStore.ts):**
```typescript
// CHANGED: Store is UI-only. Business logic delegated to AuthService.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        const result = await authService.login({ email, password });
        if (result.isOk()) {
          set({ user: result.value, isAuthenticated: true });
          return { success: true };
        }
        return { success: false, error: result.error.message };
      },

      logout: () => {
        authService.logout();
        set({ user: null, isAuthenticated: false });
      },

      init: () => {
        const token = authService.getToken();
        if (token) {
          authService.fetchMe().then((result) => {
            if (result.isOk()) {
              set({ user: result.value, isAuthenticated: true, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          });
        } else {
          set({ isLoading: false });
        }
      },
    }),
    { name: 'soundit-auth', partialize: (state) => ({}) }
  )
);
```

**Why this matters:** If we need to migrate from `localStorage` to `secure cookies` or `IndexedDB` in 6 months, we only create a new `CookieTokenStore` adapter and swap it in the service constructor. The store and service require zero changes. Currently, `localStorage` is hardcoded in 6+ places across the codebase.

---

#### Example D: Thinning Express Route Handlers

**BEFORE (api/routes/djs.ts):**
```typescript
// 450 lines: validation, image processing, DB queries, storage, authorization all mixed
router.post('/', authMiddleware, uploadDjProfileImages, async (req, res) => {
  const existing = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (existing) return res.status(409).json({ ... });
  const parsed = createDjSchema.safeParse(parseFormFields(req.body));
  if (!parsed.success) return res.status(400).json({ ... });
  let avatarUrl = null;
  if (req.files && req.files['avatar']) {
    const { buffer, contentType } = await processAvatar(file.buffer);
    avatarUrl = await uploadBuffer(buffer, 'avatars', { contentType });
  }
  const dj = await prisma.djProfile.create({ data: { ...parsed.data, userId: req.user.id, avatar: avatarUrl } });
  await prisma.user.update({ where: { id: req.user.id }, data: { role: 'DJ' } });
  return res.status(201).json({ success: true, data: dj });
});
```

**AFTER (src/interface/http/routes/dj.routes.ts):**
```typescript
// CHANGED: Route is a thin translation layer. No business logic.
router.post(
  '/',
  authMiddleware,
  uploadDjProfileImages,
  requestValidator(CreateDjProfileDto),
  djController.createProfile.bind(djController)
);
```

**AFTER (src/interface/http/controllers/DjController.ts):**
```typescript
export class DjController {
  constructor(private createDjProfileUseCase: CreateDjProfileUseCase) {}

  async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateDjProfileInput = {
        userId: req.user.id,
        ...req.body,
        avatarBuffer: req.files?.avatar?.[0]?.buffer ?? null,
        coverBuffer: req.files?.coverBanner?.[0]?.buffer ?? null,
      };

      const result = await this.createDjProfileUseCase.execute(input);

      if (result.isErr()) {
        return mapErrorToResponse(result.error, res);
      }

      res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  }
}
```

**AFTER (src/application/dj/CreateDjProfileUseCase.ts):**
```typescript
export class CreateDjProfileUseCase {
  constructor(
    private djRepo: IDjRepository,
    private userRepo: IUserRepository,
    private imageProcessor: IImageProcessor,
    private fileStorage: IFileStorage
  ) {}

  async execute(input: CreateDjProfileInput): Promise<Result<DjProfile, DomainError>> {
    const existing = await this.djRepo.findByUserId(input.userId);
    if (existing) return Err(new ConflictError('DJ profile already exists'));

    let avatarUrl: string | null = null;
    if (input.avatarBuffer) {
      const processed = await this.imageProcessor.processAvatar(input.avatarBuffer);
      avatarUrl = await this.fileStorage.upload(processed.buffer, 'avatars', processed.contentType);
    }

    let coverUrl: string | null = null;
    if (input.coverBuffer) {
      const processed = await this.imageProcessor.processCover(input.coverBuffer);
      coverUrl = await this.fileStorage.upload(processed.buffer, 'covers', processed.contentType);
    }

    const profile = DjProfile.create({
      ...input,
      avatar: avatarUrl,
      coverBanner: coverUrl,
    });

    const saved = await this.djRepo.create(profile);
    await this.userRepo.updateRole(input.userId, 'DJ');

    return Ok(saved);
  }
}
```

**Why this matters:** If we need to switch from `multer` to `busboy` or add `virus scanning` in 6 months, we only change the middleware and `imageProcessor` adapter. The use case is unaware of Express or file upload mechanics. Currently, a multer change would require editing every route that handles images.

---

### 3.3 Verification Checklist

- [ ] **Behavior preserved:** All existing API endpoints return identical JSON shapes. Frontend requires zero changes to data contracts during the refactor (adapter pattern preserves DTOs).
- [ ] **Tests pass:** Existing integration tests (if any) pass against the new controller layer. New unit tests cover all pure domain functions with 100% branch coverage.
- [ ] **New tests added for extracted interfaces:**
  - `RankingCalculator` — 50+ unit tests with parameterized inputs (0 followers, 1M followers, edge cases).
  - `BookingStatusMachine` — state transition matrix tests for all 7 statuses × 7 statuses = 49 cases.
  - `AuthService` — mocked `IApiClient` and `ITokenStorage`, no browser or network.
  - `CreateDjProfileUseCase` — mocked repositories, image processor, and file storage.
  - `DjController` — mocked use case, verified HTTP status code mapping.
- [ ] **Type safety:** All domain and application modules use strict TypeScript with no `any` types.
- [ ] **Dependency inversion verified:** `domain` directory has zero imports from `application` or `infrastructure`.

---

## 4. ARCHITECTURAL DECISIONS

| Decision | Justification |
|----------|---------------|
| **Pure domain functions for ranking** | If we need to **A/B test ranking algorithms** in 6 months, this structure makes it possible to run `RankingCalculator.v2` side-by-side without touching the database or API. Currently, the algorithm is welded to Prisma queries. |
| **Result<T, E> instead of exceptions** | If we need to **add a new client (mobile app, CLI)** in 6 months, the `Result` type serializes cleanly to JSON. Exceptions require fragile `try/catch` mapping in every transport layer. |
| **Repository interfaces (ports)** | If we need to **migrate from Prisma to Drizzle or raw SQL** in 6 months, we write a new `DrizzleUserRepository` and swap one line in the DI container. Currently, Prisma is referenced in 25+ files. |
| **Separate frontend domain layer** | If we need to **add a React Native app** in 6 months, the `domain` and `application` packages can be extracted into a shared `@deck-salone/core` npm package. Currently, business logic is trapped in React components. |
| **Application use cases as classes** | If we need to **add audit logging** in 6 months, we decorate `IUseCase` with a logging proxy. Currently, logging would need to be sprinkled across 15+ route handlers. |
| **DTOs at the transport boundary** | If we need to **change API versioning** in 6 months, we add `v2` DTO mappers without changing domain entities. Currently, the Prisma schema shape leaks directly to the frontend. |
| **Image processor as adapter** | If we need to **switch from Sharp to Jimp or add WebP/AVIF** in 6 months, we change one adapter. Currently, `sharp` is imported in 3 route files. |
| **Notification service as port** | If we need to **move from console logs to Twilio/SendGrid** in 6 months, we implement `TwilioNotificationService` and inject it. Currently, SMS is a `console.log` in the OTP utility. |
| **Express controllers are thin** | If we need to **add GraphQL or gRPC** in 6 months, the existing use cases are reused. Currently, all logic is in Express-specific route handlers. |
| **Auth store delegates to service** | If we need to **support OAuth providers beyond Google** in 6 months, we add `OAuthService` implementations. Currently, Passport Google strategy is hardcoded in `utils/passport.ts`. |

---

## Appendix A: Line Counts by Module

| Module | Files | Approx. Lines | Notes |
|--------|-------|---------------|-------|
| `api/server.ts` | 1 | 174 | Entry point, OG route, global error handler |
| `api/middleware/` | 1 | 45 | authMiddleware, requireRole |
| `api/utils/` | 9 | 1,013 | prisma, jwt, passport, ranking, upload, storage, imageProcessor, otp, rateLimiter |
| `api/routes/` | 12 | 4,310 | auth, djs, mixes, bookings, events, payments, battles, rankings, reviews, dashboard, admin, messages |
| `api/prisma/` | 2 | 1,198 | schema.prisma, seed.ts |
| `api/scripts/` | 2 | 102 | backfill-usernames, create-admin |
| `src/App.tsx` | 1 | 90 | Router configuration |
| `src/main.tsx` | 1 | 14 | Entry point |
| `src/lib/` | 3 | 57 | api, queryClient, utils |
| `src/stores/` | 1 | 116 | authStore |
| `src/hooks/` | 10 | 520 | useDJs, useBattles, useBookings, useEvents, useMixes, useAdmin, useRankings, useReviews, useHomeData, usePublicStats, use-mobile |
| `src/components/` | 14 | 2,241 | Layout, DashboardLayout, Navbar, AuthLayout, ProtectedRoute, MixPlayer, PasswordStrength, ShareButton, BottomNav, Footer, FadeIn, WaveformAnimation, CountdownTimer, and 50+ UI shadcn components |
| `src/pages/` | 18 | 5,000+ | Home, Discover, Rankings, DjProfile, Booking, MixHub, Events, HallOfFame, Battles, Login, Register, AuthCallback, AdminDashboard, Dashboard, and 10 dashboard sub-pages |
| **Total** | **~75** | **~12,500+** | Excluding `node_modules`, `dist`, and generated Prisma client |

---

## Appendix B: Immediate Priority Refactors

1. **Week 1:** Extract `RankingCalculator` to pure domain. Add 50 unit tests. No API changes.
2. **Week 2:** Create `Result<T, E>` and `DomainError` types. Refactor `auth.routes.ts` to use `AuthService` with injected `UserRepository`.
3. **Week 3:** Extract `BookingStatusMachine` and `CreateBookingUseCase`. Add transition tests.
4. **Week 4:** Create `PrismaUserRepository`, `PrismaDjRepository`, `PrismaBookingRepository`. Route handlers become thin controllers.
5. **Week 5:** Frontend — extract `AuthService` with `ITokenStorage` port. Remove `api` and `localStorage` from `authStore`.
6. **Week 6:** Frontend — extract `ApiClient` port. Create `AxiosApiClient` adapter. Make hooks depend on `ApiClient` interface.

---

*Report generated from full source code analysis of the Deck Salone codebase.*
*Method: Read every file, map every import, count lines, identify violations, propose redesign.*
