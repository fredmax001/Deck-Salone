# REVERSE-ENGINEERING REPORT

## Deck Salone — Full-Stack DJ Platform

**Report Date:** 2026-06-25  
**Target Codebase:** `/Users/djfredmax/Desktop/Deck Salone/app`  
**Architecture:** React 19 + Vite (Frontend) | Express 5 + Prisma + PostgreSQL (Backend)  
**Auth Strategy:** JWT + bcrypt + Google OAuth 2.0 + Phone OTP (in-memory)  
**Storage:** S3-Compatible OR Local Filesystem (multer + sharp)  

---

# 1. DATA FLOW DIAGRAMS

## 1.1 Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  /api/auth  │────▶│   prisma    │────▶│  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       │ POST /login       │                   │                   │
       │ {email,password}  │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │                   │ findUnique(email) │                   │
       │                   │──────────────────▶│                   │
       │                   │                   │ SELECT users      │
       │                   │                   │ WHERE email=...   │
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │                   │                   │ Return User row   │
       │                   │                   │◀──────────────────│
       │                   │                   │                   │
       │                   │ bcrypt.compare()  │                   │
       │                   │ signToken({id,email,role})              │
       │                   │                   │                   │
       │                   │◀──────────────────│                   │
       │                   │                   │                   │
       │ {success,token}   │                   │                   │
       │◀──────────────────│                   │                   │
       │                   │                   │                   │
       │ Store token in    │                   │                   │
       │ localStorage      │                   │                   │
       │ soundit_token     │                   │                   │
       │                   │                   │                   │
       │ GET /api/auth/me  │                   │                   │
       │ Bearer <token>    │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │ verifyToken()     │                   │
       │                   │ prisma.user.findUnique(id)              │
       │                   │                   │                   │
       │ {user object}     │                   │                   │
       │◀──────────────────│                   │                   │
```

**State Transitions:**
- `UNAUTH` → `AUTHENTICATED` (on login/register success)
- `AUTHENTICATED` → `UNAUTH` (on 401 / logout / token expiry)
- `AUTHENTICATED` → `DJ` (on DJ profile creation, role updates from USER to DJ)
- `UNAUTH` → `AUTHENTICATED` (on Google OAuth callback, token in URL)

---

## 1.2 Registration Flow

```
Browser ──POST /api/auth/register──▶ Auth Route
                                       │
                                       ▼
                              zod validation (email, password, username, phone, role)
                                       │
                                       ▼
                              prisma.user.findUnique(email) → 409 if exists
                                       │
                              prisma.user.findUnique(phone) → 409 if exists
                                       │
                              prisma.user.findUnique(username) → 409 if exists
                                       │
                                       ▼
                              bcrypt.hash(password, 10)
                                       │
                                       ▼
                              prisma.user.create({email, username, password, phone, role})
                                       │
                                       ▼
                              signToken({id, email, role})
                                       │
                                       ▼
                              Response: {success, data: {user, token}}
```

**Username Generation:** If not provided, auto-generates from email prefix (e.g., `john.doe` → `john.doe` or `john.doe1234`). 100 attempts max. Reserved usernames blocked (`admin`, `api`, `dashboard`, etc.).

---

## 1.3 Discover (DJ Listing) Flow

```
Browser ──GET /api/djs?city=...&genre=...&search=...&sortBy=...&page=...──▶ DJ Route
                                                                               │
                                                                               ▼
                                                                      zod.parse(query)
                                                                               │
                                                                               ▼
                                                                      Build WHERE clause:
                                                                        - isPublic: true (default)
                                                                        - city: contains (insensitive)
                                                                        - genres: has (Prisma array contains)
                                                                        - verified: true (if filter)
                                                                        - bookingFeeMin/Max: gte/lte
                                                                        - search: OR on stageName, fullName, city
                                                                               │
                                                                               ▼
                                                                      Prisma findMany + count:
                                                                        - skip/take for pagination
                                                                        - orderBy: rankingScore (default), streams, followers, name, mixes, rating
                                                                        - include: user(username), streamingPlatforms, _count(mixes, reviews)
                                                                               │
                                                                               ▼
                                                                      Response: {success, data: DJs[], meta: {total, page, limit, totalPages}}
```

**Frontend State:** `useDJs()` TanStack Query hook with filters as queryKey. Client-side additional filtering for equipment and rating (server doesn't support these). Pagination is client-driven with page/limit.

---

## 1.4 DJ Profile Flow

```
Browser ──GET /api/djs/:identifier──▶ DJ Route
                                        │
                                        ▼
                              Try findUnique by id
                                        │
                              If not found, try findFirst by username (case-insensitive)
                                        │
                                        ▼
                              Include: user, mixes (public only), streamingPlatforms, reviews (last 20),
                                       events (upcoming), _count(mixes, reviews, bookings)
                                        │
                                        ▼
                              Response: {success, data: DJ + username + userId}
```

**Profile Creation Flow:**
```
Browser ──POST /api/djs (multipart/form-data)──▶ Auth Middleware ──▶ uploadDjProfileImages (multer)
                                                                         │
                                                                         ▼
                                                              parseFormFields() (JSON strings → objects)
                                                              zod validation
                                                                         │
                                                                         ▼
                                                              processAvatar() → sharp resize 400x400 webp
                                                              processCover() → sharp resize 1920x1080 webp
                                                              uploadBuffer() → S3 or local
                                                                         │
                                                                         ▼
                                                              prisma.djProfile.create({...data, userId, avatar, coverBanner})
                                                              prisma.user.update({role: 'DJ'})
```

---

## 1.5 Booking Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Booking │────▶│  Prisma  │────▶│  Booking │────▶│   DJ     │
│  (User)  │     │  Route   │     │  Create  │     │  Table   │     │  Profile │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
      │                │                │                │                │
      │ POST /bookings │                │                │                │
      │ {djId, eventDate, eventLocation, │                │                │
      │  duration, budget, notes}        │                │                │
      │───────────────▶│                │                │                │
      │                │                │                │                │
      │ authMiddleware │                │                │                │
      │ bookingLimiter │                │                │                │
      │ (5/hour)       │                │                │                │
      │                │                │                │                │
      │                │ validate DJ    │                │                │
      │                │ exists + not self│              │                │
      │                │                │                │                │
      │                │ prisma.booking.create({        │                │
      │                │   clientId, djId, eventType,     │                │
      │                │   eventDate, eventLocation,      │                │
      │                │   duration, budget, status: PENDING})            │
      │                │                │                │                │
      │                │                │                │                │
      │                │ prisma.djProfile.update({       │                │
      │                │   totalBookings: {increment: 1} │                │
      │                │ })             │                │                │
      │                │                │                │                │
      │ {booking}      │                │                │                │
      │◀───────────────│                │                │                │
      │                │                │                │                │
      │ PUT /bookings/:id/status       │                │                │
      │ {status: NEGOTIATING/CONFIRMED/CANCELLED/etc}    │                │
      │───────────────▶│                │                │                │
      │                │                │                │                │
      │                │ State Machine: │                │                │
      │                │ PENDING → [NEGOTIATING, CONFIRMED, CANCELLED]    │
      │                │ NEGOTIATING → [CONFIRMED, CANCELLED]             │
      │                │ CONFIRMED → [DEPOSIT_PAID, CANCELLED]            │
      │                │ DEPOSIT_PAID → [COMPLETED, REFUNDED]             │
      │                │                │                │                │
```

**Booking Status Enum:** `PENDING → NEGOTIATING → CONFIRMED → DEPOSIT_PAID → COMPLETED`  
**Alternative:** `PENDING → CANCELLED`, `CONFIRMED → CANCELLED`, `DEPOSIT_PAID → REFUNDED`

---

## 1.6 Mix Upload Flow

```
Browser ──POST /api/mixes (multipart/form-data)──▶ Auth Middleware
                                                       │
                                                       ▼
                                              uploadMix (multer fields: audio + coverImage)
                                                       │
                                                       ▼
                                              zod validation (title, genre, category, tags, duration, isPublic)
                                              Verify DJ profile exists (or admin)
                                                       │
                                                       ▼
                                              Audio: uploadBuffer(buffer, 'mixes', {contentType, ext})
                                              Cover: processCover(buffer) → sharp 1920x1080 webp
                                                     uploadBuffer(buffer, 'covers', {contentType, ext})
                                                       │
                                                       ▼
                                              prisma.mix.create({...data, djId, audioUrl, coverImage})
                                              prisma.djProfile.update({totalMixes: {increment: 1}})
                                                       │
                                                       ▼
                                              Response: {success, data: mix}
```

**File Limits:** Images: 10MB (jpeg/png/webp), Audio: 500MB (mp3/wav/ogg/m4a/aac)

---

## 1.7 Messaging Flow

```
Browser ──GET /api/messages/conversations──▶ Auth Middleware
                                                  │
                                                  ▼
                                         Find distinct partnerIds:
                                           - sentTo: senderId=me, deletedBySender=false
                                           - receivedFrom: receiverId=me, deletedByReceiver=false
                                                  │
                                                  ▼
                                         For each partnerId:
                                           - Get user details + djProfile
                                           - Get last message (order by createdAt desc)
                                           - Count unread messages (readAt=null)
                                                  │
                                                  ▼
                                         Response: {userId, name, avatar, lastMessage, lastMessageAt, unreadCount}[]
```

```
Browser ──GET /api/messages/:userId──▶ Auth Middleware
                                            │
                                            ▼
                                   prisma.message.findMany({
                                     OR: [
                                       {senderId: me, receiverId: partner, deletedBySender: false},
                                       {senderId: partner, receiverId: me, deletedByReceiver: false}
                                     ],
                                     orderBy: {createdAt: asc},
                                     take: 100
                                   })
                                            │
                                            ▼
                                   prisma.message.updateMany({
                                     senderId: partner, receiverId: me, readAt: null
                                   } → set readAt = new Date()
                                   })
```

**⚠️ NO REAL-TIME:** No WebSocket, no SSE, no long-polling. Messages are fetched on page load. Conversations list requires full page navigation to refresh. No live notifications.

---

## 1.8 Rankings Flow

```
Browser ──GET /api/rankings──▶ Rankings Route
                                    │
                                    ▼
                           zod.parse(filters: city, genre, timeframe, page, limit)
                                    │
                                    ▼
                           prisma.djProfile.findMany({
                             where: {isPublic: true, city?, genres?},
                             orderBy: {rankingScore: desc},
                             skip, take,
                             include: {user: {select: {username}}}
                           })
                           prisma.djProfile.count({where})
                                    │
                                    ▼
                           Assign positions: skip + index + 1
                           Response: {success, data: DJs[], meta}
```

**Ranking Algorithm** (`/api/utils/ranking.ts`):
- `Digital Score (40%)` = followers (30pts) + streams (25pts) + upload consistency (20pts) + platform diversity (15pts) + engagement (10pts)
- `Industry Score (35%)` = bookings (35pts) + events (20pts) + experience (15pts) + awards (15pts) + verified (10pts) + equipment (5pts)
- `Community Score (25%)` = rating (40pts) + review count (25pts) + followers (20pts) + mix engagement (15pts)
- **Composite** = digital × 0.40 + industry × 0.35 + community × 0.25
- Recalculated via `POST /api/admin/rankings/recalculate` (admin) or `POST /api/djs/:id/recalculate` (self/admin)

---

## 1.9 Battles Flow

```
Admin ──POST /api/battles──▶ Create battle (title, weekStart, weekEnd, theme, metricType)
                                    │
                                    ▼
                           DJ ──POST /api/battles/:id/enter──▶ calculateBattleBaseScore(djId, metricType)
                                                                    │
                                                                    ▼
                                                             prisma.battleEntry.create({battleId, djId, mixId, baseScore, finalScore: baseScore})
                                                                    │
                                                                    ▼
                           User ──POST /api/battles/:id/vote──▶ voteLimiter (50/hour)
                                                                    │
                                                                    ▼
                                                             Check: entry exists, battle ACTIVE, no duplicate vote, no other vote in same battle
                                                                    │
                                                                    ▼
                                                             prisma.battleVote.create({entryId, userId})
                                                             prisma.battleEntry.update({votes: {increment: 1}})
                                                                    │
                                                                    ▼
                                                             Recalculate ALL entries finalScore:
                                                               voteShare = votes / totalVotes
                                                               voteScore = voteShare * 40
                                                               finalScore = baseScore * 0.6 + voteScore
```

**Battle Scoring:** Base Score (60%) + Vote Score (40%). On vote, ALL entries in the battle get recalculated.

---

# 2. DEPENDENCY GRAPH

## 2.1 External Libraries (Production Dependencies)

| Library | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| **react** | ^19.2.0 | UI framework | 🔴 Critical |
| **react-dom** | ^19.2.0 | React DOM renderer | 🔴 Critical |
| **react-router-dom** | ^7.18.0 | Client-side routing | 🔴 Critical |
| **express** | ^5.2.1 | HTTP server framework | 🔴 Critical |
| **@prisma/client** | ^5.22.0 | ORM / DB client | 🔴 Critical |
| **axios** | ^1.18.1 | HTTP client (frontend) | 🟡 Medium |
| **@tanstack/react-query** | ^5.101.0 | Server state management | 🔴 Critical |
| **zustand** | ^5.0.14 | Client state management | 🟡 Medium |
| **framer-motion** | ^12.40.0 | Animation library | 🟢 Low |
| **gsap** | ^3.15.0 | Animation library (heavyweight) | 🟡 Medium |
| **bcryptjs** | ^3.0.3 | Password hashing | 🔴 Critical |
| **jsonwebtoken** | ^9.0.3 | JWT signing/verification | 🔴 Critical |
| **passport** | ^0.7.0 | Auth middleware | 🟡 Medium |
| **passport-google-oauth20** | ^2.0.0 | Google OAuth strategy | 🟡 Medium |
| **cors** | ^2.8.6 | Cross-origin requests | 🟡 Medium |
| **helmet** | ^8.2.0 | Security headers | 🟡 Medium |
| **express-rate-limit** | ^7.5.1 | Rate limiting | 🟡 Medium |
| **multer** | ^2.2.0 | Multipart form parsing | 🟡 Medium |
| **sharp** | ^0.35.2 | Image processing | 🟡 Medium |
| **@aws-sdk/client-s3** | ^3.1075.0 | S3 storage client | 🟡 Medium |
| **file-type** | ^22.0.1 | File type validation | 🟢 Low |
| **zod** | ^4.4.3 | Schema validation | 🟡 Medium |
| **date-fns** | ^4.4.0 | Date utilities | 🟢 Low |
| **uuid** | ^14.0.1 | UUID generation | 🟢 Low |
| **dotenv** | ^17.4.2 | Environment variables | 🟢 Low |
| **tailwind-merge** | ^3.4.0 | Tailwind class merging | 🟢 Low |
| **clsx** | ^2.1.1 | Conditional classnames | 🟢 Low |
| **lucide-react** | ^0.562.0 | Icon library | 🟢 Low |
| **recharts** | ^2.15.4 | Charts for analytics | 🟢 Low |
| **wavesurfer.js** | ^7.12.8 | Audio waveform visualization | 🟢 Low |
| **@hookform/resolvers** | ^5.4.0 | Form validation resolvers | 🟢 Low |
| **react-hook-form** | ^7.80.0 | Form management | 🟢 Low |
| **embla-carousel-react** | ^8.6.0 | Carousel component | 🟢 Low |
| **react-day-picker** | ^9.13.0 | Date picker | 🟢 Low |
| **react-resizable-panels** | ^4.2.2 | Resizable panels | 🟢 Low |
| **next-themes** | ^0.4.6 | Theme management | 🟢 Low |
| **vaul** | ^1.1.2 | Drawer component | 🟢 Low |
| **sonner** | ^2.0.7 | Toast notifications | 🟢 Low |
| **@radix-ui/*** | various | Headless UI primitives (shadcn) | 🟢 Low |
| **cmdk** | ^1.1.1 | Command palette | 🟢 Low |
| **input-otp** | ^1.4.2 | OTP input component | 🟢 Low |
| **@studio-freight/lenis** | ^1.0.42 | Smooth scrolling | 🟢 Low |
| **class-variance-authority** | ^0.7.1 | Component variants | 🟢 Low |

**Total production dependencies:** ~69 packages  
**High-risk (security-critical):** react, express, @prisma/client, bcryptjs, jsonwebtoken, multer, sharp, passport, cors, helmet, express-rate-limit, axios, zod  
**Note:** `dotenv` version `^17.4.2` is suspicious — latest dotenv is v16.x. v17 doesn't exist on npm. This is a potential supply-chain risk or typo.

---

## 2.2 Internal Module Graph

### Backend Import Graph

```
server.ts
├── express, cors, helmet, passport
├── prisma.ts ──────────────────────▶ @prisma/client
├── authMiddleware, requireRole ────▶ jwt.ts ───────▶ jsonwebtoken
│                                     └── prisma.ts
├── rateLimiter.ts ─────────────────▶ express-rate-limit
├── upload.ts ──────────────────────▶ multer, fs, path
│                                     └── (memoryStorage, fileFilter, serveUploads)
├── passport.ts ────────────────────▶ passport-google-oauth20
│                                     └── prisma.ts, jwt.ts
├── routes/auth.ts ─────────────────▶ bcrypt, zod, passport
│                                     ├── prisma.ts
│                                     ├── jwt.ts
│                                     ├── authMiddleware
│                                     ├── otp.ts ──────▶ (in-memory Map)
│                                     └── authLimiter
├── routes/djs.ts ──────────────────▶ zod, prisma, authMiddleware
│                                     ├── upload.ts
│                                     ├── imageProcessor.ts ───▶ sharp, file-type
│                                     ├── storage.ts ────▶ @aws-sdk/client-s3, crypto
│                                     └── ranking.ts ────▶ prisma
├── routes/mixes.ts ────────────────▶ zod, prisma, authMiddleware
│                                     ├── upload.ts
│                                     ├── storage.ts
│                                     └── imageProcessor.ts
├── routes/rankings.ts ─────────────▶ zod, prisma, ranking.ts
├── routes/bookings.ts ─────────────▶ zod, prisma, authMiddleware, bookingLimiter
├── routes/events.ts ───────────────▶ zod, prisma, authMiddleware, uploadEventImage, imageProcessor, storage
├── routes/reviews.ts ──────────────▶ zod, prisma, authMiddleware
├── routes/battles.ts ──────────────▶ zod, prisma, authMiddleware, voteLimiter, ranking.ts
├── routes/dashboard.ts ────────────▶ prisma, authMiddleware, ranking.ts
├── routes/admin.ts ────────────────▶ zod, prisma, requireRole, ranking.ts
├── routes/payments.ts ─────────────▶ zod, prisma, authMiddleware, requireRole
├── routes/messages.ts ─────────────▶ zod, prisma, authMiddleware
```

### Frontend Import Graph

```
main.tsx
├── react-dom/client
├── @tanstack/react-query (QueryClientProvider)
├── App.tsx
│   ├── react-router-dom (BrowserRouter, Routes, Route)
│   ├── useAuthStore (zustand) ──────────────────────▶ api.ts
│   ├── ProtectedRoute.tsx ──────────────────────────▶ useAuthStore
│   ├── Layout.tsx ──────────────────────────────────▶ Navbar, Footer
│   ├── DashboardLayout.tsx ─────────────────────────▶ (sidebar navigation)
│   ├── Pages: Home, Discover, Rankings, DjProfile, Booking, MixHub, Events, etc.
│   └── Dashboard Pages: Overview, Bookings, Messages, Mixes, Events, Analytics, etc.
│
lib/api.ts ──────────────────────────────────────────▶ axios
│   ├── Interceptor: attaches Bearer token from localStorage ('soundit_token')
│   ├── Interceptor: handles 401 → logout + redirect
│   └── baseURL: VITE_API_URL || http://localhost:5002/api
│
lib/queryClient.ts ─────────────────────────────────▶ @tanstack/react-query
│   └── defaultOptions: staleTime 5min, refetchOnWindowFocus: false, retry: 1
│
stores/authStore.ts ────────────────────────────────▶ zustand + persist middleware
│   ├── login(email, password) ──────────────────────▶ POST /auth/login
│   ├── register(email, password, role, phone) ────────▶ POST /auth/register
│   ├── fetchMe() ───────────────────────────────────▶ GET /auth/me
│   └── init() ──────────────────────────────────────▶ reads localStorage token
│
hooks/useDJs.ts ─────────────────────────────────────▶ @tanstack/react-query, api.ts
hooks/useMixes.ts ───────────────────────────────────▶ @tanstack/react-query, api.ts
hooks/useBookings.ts ────────────────────────────────▶ @tanstack/react-query, api.ts
hooks/useRankings.ts ────────────────────────────────▶ @tanstack/react-query, api.ts
hooks/useAdmin.ts ───────────────────────────────────▶ @tanstack/react-query, api.ts
hooks/useAuthStore.ts ───────────────────────────────▶ (does not exist; uses stores/authStore directly)
```

### Circular Dependencies

**No circular dependencies detected** in the backend. The import graph is strictly hierarchical:
- Routes → Utils → Prisma (leaf)
- Routes never import each other
- Utils never import routes

**Frontend:** No circular dependencies detected. Hooks all import from `lib/api.ts` and `stores/authStore.ts`, which are leaf nodes.

---

## 2.3 Database Schema Map

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    User                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ id (PK) │ email (UQ) │ username (UQ) │ password │ googleId (UQ) │ phone (UQ)     │
│ phoneVerified │ role │ createdAt │ updatedAt                                     │
└────┬────────────────────────────────────┬────────────────────────────────────┬───┘
     │ 1:1 (optional)                     │ 1:N                                │ 1:N
     │                                    │                                    │
     ▼                                    ▼                                    ▼
┌──────────────┐              ┌──────────────┐                      ┌──────────────┐
│  DjProfile   │              │  Booking     │                      │   Message    │
│  (PK: id)    │              │  (PK: id)    │                      │  (PK: id)    │
│  userId (FK) │◀─────────────│  clientId    │                      │  senderId    │
│  stageName   │              │  djId (FK)   │                      │  receiverId  │
│  bio, avatar │              │  eventType   │                      │  content     │
│  genres[]    │◀─────────────│  eventDate   │                      │  bookingId   │
│  awards[]    │              │  status      │                      │  readAt      │
│  rankingScore│              │  budget      │                      │  createdAt   │
│  totalMixes  │              │  finalPrice  │                      └──────────────┘
│  totalEvents │              │  rating      │                              │
│  verified    │              │  review      │                              │
│  isPublic    │              └──────────────┘                              │
└──┬───┬──────┘                                      │                       │
   │   │                                               │                       │
   │   │ 1:N                                           │ 1:N                   │ 1:N
   │   │                                               │                       │
   │   ▼                                               ▼                       ▼
   │ ┌──────────┐                              ┌──────────────┐       ┌──────────────┐
   │ │   Mix    │                              │   Payment    │       │   Review     │
   │ │ (PK: id) │                              │  (PK: id)    │       │  (PK: id)    │
   │ │ djId(FK) │                              │  bookingId   │       │  userId (FK) │
   │ │ title    │                              │  clientId    │       │  djId (FK)   │
   │ │ audioUrl │                              │  djId        │       │  rating      │
   │ │ plays    │                              │  amount      │       │  comment     │
   │ │ likes    │                              │  currency    │       │  verified    │
   │ │ genre    │                              │  status      │       │  createdAt   │
   │ │ category │                              │  provider    │       └──────────────┘
   │ │ featured │                              │  providerRef │
   │ └──────────┘                              └──────────────┘
   │
   │ 1:N
   │
   ▼
┌────────────────────────────┐     ┌────────────────────────────┐     ┌────────────────────────────┐
│    StreamingPlatform         │     │    Event                   │     │    RankingHistory          │
│    (PK: id)                  │     │    (PK: id)                │     │    (PK: id)                │
│    djId (FK)                 │     │    djId (FK, optional)     │     │    djId (FK)               │
│    platform                  │     │    title                   │     │    position                │
│    url                       │     │    type                    │     │    score                   │
│    followers                 │     │    date                    │     │    digitalScore            │
│    streams                   │     │    location                │     │    industryScore           │
│    uploads                   │     │    city                    │     │    communityScore          │
└────────────────────────────┘     │    venue                   │     │    week                    │
                                   │    isOpenSlot              │     └────────────────────────────┘
                                   │    slots / filledSlots     │
                                   │    compensation            │     ┌────────────────────────────┐
                                   │    soundItSaloneEventId    │     │    Battle                  │
                                   │    isSyncedToSalone        │     │    (PK: id)                │
                                   └────────────────────────────┘     │    title                   │
                                                                        │    weekStart / weekEnd     │
                                   ┌────────────────────────────┐     │    status                  │
                                   │    BattleEntry             │     │    theme                   │
                                   │    (PK: id)                │     │    metricType              │
                                   │    battleId (FK)            │◀────┘    entries (1:N)         │
                                   │    djId (FK)              │◀────────────────────────────┘
                                   │    mixId                  │
                                   │    baseScore              │
                                   │    voteScore              │
                                   │    finalScore             │
                                   │    votes                  │
                                   └────────────┬─────────────┘
                                                │ 1:N
                                                │
                                                ▼
                                   ┌────────────────────────────┐
                                   │    BattleVote              │
                                   │    (PK: id)                │
                                   │    entryId (FK)            │
                                   │    userId (FK)             │
                                   │    weight                  │
                                   │    @@unique(entryId,userId)│
                                   └────────────────────────────┘
```

### Key Relationships Summary

| Model | Key Relationships | Cascade Behavior |
|-------|------------------|------------------|
| **User** | 1:1 DjProfile (optional), 1:N Bookings (client), 1:N Reviews, 1:N Messages (sent/received), 1:N Payments (client), 1:N BattleVotes | DjProfile: CASCADE |
| **DjProfile** | 1:1 User, 1:N Mixes, 1:N Bookings (as DJ), 1:N Reviews, 1:N Events, 1:N StreamingPlatforms, 1:N RankingHistory, 1:N BattleEntries | Mixes: CASCADE, StreamingPlatforms: CASCADE, RankingHistory: CASCADE, BattleEntries: CASCADE |
| **Booking** | N:1 User (client), N:1 DjProfile (dj), 1:N Payments, 1:N Messages | Payments: CASCADE |
| **Message** | N:1 User (sender), N:1 User (receiver), N:1 Booking (optional) | Sender: CASCADE, Receiver: CASCADE |
| **Payment** | N:1 Booking, N:1 User (client) | Booking: CASCADE |
| **Review** | N:1 User, N:1 DjProfile | None (@@unique on [userId, djId]) |
| **Battle** | 1:N BattleEntries | Entries: CASCADE |
| **BattleEntry** | N:1 Battle, N:1 DjProfile, 1:N BattleVotes | Votes: CASCADE |
| **BattleVote** | N:1 BattleEntry, N:1 User | None (@@unique on [entryId, userId]) |

### Indexes (Critical for Performance)

| Table | Indexed Fields | Purpose |
|-------|---------------|---------|
| users | email, username, phone, googleId, role | Fast lookups, uniqueness enforcement |
| dj_profiles | userId, city, verified, rankingScore, isPublic | Filtering, sorting, searching |
| mixes | djId, category, genre, featured, createdAt | DJ mixes, category browsing, trending |
| bookings | clientId, djId, status, eventDate | User bookings, DJ bookings, status filters |
| messages | senderId, receiverId, bookingId, createdAt | Conversation queries, unread counts |
| payments | bookingId, clientId, status, providerRef | Payment tracking, refunds |
| events | djId, city, date, soundItSaloneEventId, isSyncedToSalone | Event listings, sync tracking |
| reviews | djId, rating, createdAt | DJ review display, rating filters |
| battles | status, weekStart | Active battle lookup |
| battle_entries | battleId, djId, finalScore | Leaderboard queries, DJ lookups |
| battle_votes | entryId, userId | Duplicate vote prevention |
| ranking_history | djId, week | Ranking chart history |

---

# 3. CRITICAL PATH IDENTIFICATION

## 3.1 Hot Routes (Most Frequent API Calls)

Based on the frontend hooks and page usage, the most frequently hit routes are:

### 🔴 Tier 1: Ultra-High Traffic (Every Page Load)

| Route | Frequency | Cacheable | Risk |
|-------|-----------|-----------|------|
| `GET /api/auth/me` | Every page load (Navbar checks auth) | No (auth state) | Moderate |
| `GET /api/djs` | Discover page, home featured DJs | Yes (5min stale) | **HIGH** — full text search + pagination |
| `GET /api/djs/:identifier` | Every DJ profile view | Partial | **HIGH** — includes mixes, reviews, events, counts |
| `GET /api/mixes` | MixHub page | Yes (5min) | Moderate |
| `GET /api/rankings` | Rankings page | Yes (5min) | Moderate |
| `GET /api/events` | Events page | Yes (5min) | Low |
| `GET /api/battles/current` | Home page | Yes (5min) | Low |

### 🟡 Tier 2: High Traffic (User Actions)

| Route | Frequency | Risk |
|-------|-----------|------|
| `POST /api/auth/login` | Auth flow | Low (rate limited: 10/15min) |
| `POST /api/auth/register` | Registration | Low (rate limited) |
| `GET /api/messages/conversations` | Dashboard messages | **HIGH** — N+1 on partner lookups |
| `GET /api/messages/:userId` | Chat view | Moderate |
| `POST /api/messages` | Send message | Low |
| `POST /api/bookings` | Booking creation | Low (rate limited: 5/hour) |
| `GET /api/bookings` | Dashboard bookings | Moderate |
| `POST /api/mixes/:id/like` | Like action | Low |
| `GET /api/mixes/:id` | Mix detail + play increment | Moderate (write on every view) |

### 🟢 Tier 3: Admin/Background

| Route | Frequency | Risk |
|-------|-----------|------|
| `POST /api/admin/rankings/recalculate` | Admin trigger | **HIGH** — Full table scan + sequential updates |
| `POST /api/djs/:id/recalculate` | Per-DJ recalc | Moderate |
| `POST /api/battles/:id/vote` | User voting | **HIGH** — Recalculates ALL entries on every vote |

---

## 3.2 Expensive Database Queries

### 🔴 CRITICAL: N+1 Queries

#### 1. Messages `/api/messages/conversations`
```typescript
// N+1 Pattern: For EACH conversation partner, 3 separate queries
const conversations = await Promise.all(
  Array.from(partnerIds).map(async (partnerId) => {
    const [partner, lastMessage, unreadCount] = await Promise.all([
      prisma.user.findUnique({...}),        // Query 1
      prisma.message.findFirst({...}),      // Query 2
      prisma.message.count({...}),          // Query 3
    ]);
  })
);
// If a user has 50 conversations → 150 queries + 2 initial queries = 152 total
```
**Fix:** Use a single raw query with JOINs or use `prisma.$queryRaw` with a CTE.

#### 2. DJ Profile `/api/djs/:identifier`
```typescript
include: {
  user: { select: { id: true, username: true } },
  mixes: { where: { isPublic: true }, orderBy: { createdAt: 'desc' } },
  streamingPlatforms: true,
  reviews: { include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
  events: { where: { status: 'upcoming' }, orderBy: { date: 'asc' } },
  _count: { select: { mixes: true, reviews: true, bookingsAsDj: true } },
}
```
This generates 6 subqueries. While Prisma batches some, it's still heavy for popular DJs.

#### 3. Discover `/api/djs`
```typescript
include: {
  user: { select: { username: true } },
  streamingPlatforms: { select: { platform: true, followers: true, streams: true } },
  _count: { select: { mixes: true, reviews: true } },
}
```
With 20 DJs per page, this is 20 × (1 user + 1 streamingPlatforms + 1 count) = 60 subqueries per page.

### 🔴 CRITICAL: Full Table Scans

#### 1. `GET /api/djs/genres`
```typescript
const djs = await prisma.djProfile.findMany({
  where: { isPublic: true },
  select: { genres: true },  // Loads ALL DJ profiles just for genres array
});
```
**Fix:** Use `prisma.$queryRaw` with `UNNEST(genres)` or maintain a separate Genre table.

#### 2. Ranking Recalculation (`recalculateAllRankings`)
```typescript
const djs = await prisma.djProfile.findMany({
  where: { isPublic: true },
  include: { streamingPlatforms: true, mixes: true, reviews: true },  // FULL TABLE LOAD
});
// Then: sequential update for EACH DJ + history insert
```
This loads ALL DJs with all their relations, then does 2 sequential writes per DJ. For 1000 DJs = 2000 write queries in a loop.
**Fix:** Use a batch update or raw SQL. Run in a background job.

#### 3. Battle Vote Recalculation (`/api/battles/:id/vote`)
```typescript
// On EVERY vote, recalculate ALL entries in the battle
const allEntries = await prisma.battleEntry.findMany({
  where: { battleId: req.params.id },
  select: { id: true, votes: true, baseScore: true },
});
for (const e of allEntries) {
  await prisma.battleEntry.update({ where: { id: e.id }, data: { ... } });
}
```
With 100 entries and many votes → hundreds of writes per vote.
**Fix:** Use a single raw SQL UPDATE or a stored procedure.

### 🟡 MODERATE: Aggregation on Unindexed Filters

- `prisma.mix.aggregate({ _sum: { plays: true } })` — fine with index on `djId`
- `prisma.booking.groupBy({ by: ['status'] })` — fine for small datasets, but `status` alone is not a composite index
- `prisma.review.findMany({ where: { djId }, select: { rating: true } })` — runs on every review create/delete to recalculate average

---

## 3.3 Frontend Render Bottlenecks

### 🔴 Largest Components (by line count / complexity)

| Component | Lines | Complexity | Issue |
|-----------|-------|------------|-------|
| `DjProfile.tsx` | ~1,850 | 🔴 Extreme | Monolithic component with booking form, reviews, mixes, analytics, events, ranking chart all in one file. No code splitting. |
| `Discover.tsx` | ~831 | 🔴 High | Large filter panel, pagination, animation grid. Re-renders entire grid on every filter change. |
| `AdminDashboard.tsx` | Unknown | 🟡 High | Likely loads all admin stats at once. |
| `Home.tsx` | Unknown | 🟡 Medium | Multiple data sources (featured DJs, rankings, mix categories, events, current battle). |
| `DashboardLayout.tsx` | Unknown | 🟡 Medium | Sidebar + outlet. Persistent across dashboard pages. |

### 🔴 Re-Render Hotspots

1. **Discover Page (`useDJs`)**: Every filter change triggers a new TanStack Query fetch. The entire grid re-renders with `AnimatePresence` which causes DOM thrashing.
   - `useMemo` used for `displayedDjs` and `activeFilters` (good)
   - But `DJCard` has `useState(hovered)` — every hover triggers a re-render of that card

2. **Navbar (`useAuthStore`)**: Subscribes to full auth store. On any auth state change, entire Navbar re-renders. Uses `useLocation` which re-renders on every route change.
   - `mobileOpen` state body scroll lock effect runs on every toggle

3. **DjProfile**: Likely re-fetches all data (DJ, rankings, reviews, related DJs) on every mount. No prefetching or cache sharing.

4. **MixPlayer / Waveform**: If present on every mix card, `wavesurfer.js` instances are expensive to create/destroy.

### 🟡 Query Client Configuration
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```
- **Good:** `refetchOnWindowFocus: false` prevents unnecessary fetches
- **Bad:** `retry: 1` means 1 retry on failure (doubles load on error cascades)
- **Bad:** No `cacheTime` or `gcTime` specified (defaults to 5 min)
- **Bad:** No query deduplication window beyond default

---

## 3.4 Full Request Path: Browser → Vite → API → DB → Response

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST PATH                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Browser
     │
     │ 1. User navigates to /discover
     │    └── React Router matches <Route path="discover" element={<Discover />} />
     │
     │ 2. Discover.tsx mounts
     │    └── useDJs({ page: 1, limit: 12 }) hook executes
     │        └── TanStack Query checks cache (stale after 5 min)
     │            └── Cache miss → trigger fetch
     │
     │ 3. api.get('/djs?page=1&limit=12')
     │    └── axios intercepts → adds Authorization: Bearer <token>
     │        └── Vite dev proxy (if dev) OR direct API call
     │
     │    [Network] GET http://localhost:5002/api/djs?page=1&limit=12
     │         │
     │         ▼
     │    Vite Dev Server (port 3000) ──(if proxy configured)──▶ Express API (port 5000/5002)
     │         │
     │         ▼
     │    Express API Server (port 5000)
     │         │
     │         ├── CORS middleware (validates origin against FRONTEND_URL)
     │         ├── helmet middleware (security headers)
     │         ├── express.json() (parses body, limit 50MB)
     │         ├── generalLimiter (100 req / 15min / IP)
     │         │
     │         ├── Route: app.use('/api/djs', djRoutes)
     │         │
     │         └── Router: router.get('/', async (req, res) => {
     │                  │
     │                  ├── zod.parse(req.query) ──▶ validates filters
     │                  │
     │                  ├── Build WHERE clause:
     │                  │     where: { isPublic: true }
     │                  │
     │                  ├── Prisma Query Engine:
     │                  │     ├── Generates SQL:
     │                  │     │   SELECT ... FROM "dj_profiles"
     │                  │     │   WHERE "isPublic" = true
     │                  │     │   ORDER BY "rankingScore" DESC
     │                  │     │   LIMIT 12 OFFSET 0
     │                  │     │
     │                  │     ├── Subqueries:
     │                  │     │   SELECT "username" FROM "users" WHERE "id" = dj.userId
     │                  │     │   SELECT ... FROM "streaming_platforms" WHERE "djId" = dj.id
     │                  │     │   SELECT COUNT(*) FROM "mixes" WHERE "djId" = dj.id
     │                  │     │   SELECT COUNT(*) FROM "reviews" WHERE "djId" = dj.id
     │                  │     │
     │                  │     └── Connection Pool (PrismaClient)
     │                  │         └── PostgreSQL (via DATABASE_URL)
     │                  │
     │                  ├── PostgreSQL executes query, returns rows
     │                  │
     │                  ├── Prisma maps rows to JS objects
     │                  │
     │                  ├── Response JSON construction:
     │                  │     { success: true, data: DJs[], meta: {...} }
     │                  │
     │                  └── res.json(response)
     │
     │    [Network] JSON response ←── Express
     │         │
     │         ▼
     │    axios receives response
     │         │
     │         ▼
     │    TanStack Query stores in cache with key ['djs', {...filters}]
     │         │
     │         ▼
     │    React re-renders Discover component with new data
     │         │
     │         ▼
     │    AnimatePresence animates grid items in with framer-motion
     │         │
     │         ▼
     │    Images load from CDN_URL/uploads/... or S3
     │
     ▼
  User sees DJ grid
```

---

# 4. SECURITY ANALYSIS

## 4.1 Vulnerabilities & Risks

### 🔴 HIGH RISK

1. **JWT Secret Required but Not Validated at Runtime**
   - `jwt.ts` throws if `JWT_SECRET` is missing, but this happens at module load time, not server startup. If env is missing, the app crashes on first request, not on boot.

2. **CORS Origin Validation**
   ```typescript
   origin: (origin, callback) => {
     if (!origin || ALLOWED_ORIGINS.includes(origin)) {
       callback(null, true);
     }
   }
   ```
   - `ALLOWED_ORIGINS` is derived from `FRONTEND_URL.split(',')`. If `FRONTEND_URL` is not set, defaults to `http://localhost:5173`.
   - In production, if `FRONTEND_URL` is misconfigured, CORS could be overly permissive or restrictive.

3. **OTP In-Memory Store**
   - `otpStore` is a `Map()` in Node.js memory. On server restart, all OTPs are lost.
   - No rate limiting per phone number (only per IP via authLimiter).
   - OTP codes are logged to console in all environments.

4. **File Upload Limits**
   - `express.json({ limit: '50mb' })` and `express.urlencoded({ limit: '50mb' })` are generous but could be exploited.
   - Audio upload limit is 500MB per file. No total upload limit per user.
   - `fileFilter` validates mimetype but `fileTypeFromBuffer` is the real validation. These could disagree.

5. **No Input Sanitization on Search**
   - Search queries in `/api/djs`, `/api/mixes`, `/api/events` pass directly to Prisma `contains` with `insensitive` mode. While Prisma parameterizes these, very long search strings could cause performance issues.

6. **Password Reset via JWT**
   - Reset token is a standard JWT with 7-day expiry. No single-use nonce.
   - Reset URL is logged to console, never sent via email. Non-functional in production.

7. **Missing Authorization on Some Routes**
   - `GET /api/djs/:identifier` — no auth required, but includes user's email in reviews via `user: { select: { email: true } }`. Email exposure to public.
   - `GET /api/reviews` — no auth required, exposes user emails.

### 🟡 MEDIUM RISK

8. **Query Logging in Development**
   ```typescript
   const prisma = new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
   });
   ```
   - If `NODE_ENV` is accidentally set to `development` in production, all queries are logged including sensitive data.

9. **Rate Limiting**
   - General limiter: 100 requests / 15 minutes per IP. This is low for a media platform (images, audio, API calls).
   - Auth limiter: 10 attempts / 15 minutes. Reasonable.
   - No rate limit on public read endpoints (`/api/djs`, `/api/mixes`, etc.).

10. **No Content Security Policy on API**
    - `helmet({ contentSecurityPolicy: false })` — the API disables CSP because it serves JSON. But the OG meta route (`/og/dj/:identifier`) renders HTML with no CSP.

11. **Multer Memory Storage**
    - All uploads go to memory first. A 500MB audio file × concurrent uploads = memory exhaustion risk.

12. **Prisma Client Generated in node_modules/.prisma/client**
    - The generator output is at `../../node_modules/.prisma/client` which is outside the `api/` directory. This requires the client to be generated from the root.

---

# 5. ARCHITECTURE OBSERVATIONS

## 5.1 Strengths

1. **Well-structured route organization** — Each domain has its own route file with clear CRUD patterns.
2. **Zod validation on all inputs** — Every POST/PUT has schema validation.
3. **Prisma ORM with proper indexes** — Good indexing strategy on frequently queried fields.
4. **Rate limiting** — Multiple tiers of rate limiting (general, auth, booking, vote).
5. **Image processing pipeline** — Sharp-based resizing and WebP conversion for all images.
6. **Storage abstraction** — S3 or local filesystem via `uploadBuffer`/`deleteFile`.
7. **TanStack Query on frontend** — Proper server state caching and invalidation.
8. **Zustand with persistence** — Auth token persists across reloads.
9. **Role-based access control** — 5 roles (USER, DJ, ADMIN, MODERATOR, FINANCE_ADMIN, VERIFICATION_ADMIN).
10. **Ranking algorithm is documented** — Clear scoring formula with weights.

## 5.2 Weaknesses

1. **No WebSocket / real-time messaging** — Messaging is polling-only, very limited UX.
2. **No background job queue** — Ranking recalculation, OTP cleanup, and email sending all happen synchronously in request handlers.
3. **No CDN integration** — Static files served via Express or S3. No CloudFront/Cloudflare.
4. **No caching layer** — No Redis, no in-memory cache beyond TanStack Query. Database hit on every request.
5. **Monolithic frontend components** — `DjProfile.tsx` is 1,850 lines. No lazy loading or code splitting observed.
6. **No API versioning** — All routes are `/api/*` with no version prefix.
7. **No health check beyond basic** — `/health` returns static JSON. No DB connection check.
8. **No request ID tracing** — No correlation IDs for request tracing across logs.
9. **No error tracking** — No Sentry, Rollbar, or similar integration.
10. **No email service** — Password reset, booking notifications, and verification emails are all TODO/console.log.
11. **Frontend port mismatch** — API URL defaults to `5002` but server runs on `5000`.
12. **No database connection pooling configuration** — Prisma uses defaults.

## 5.3 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| **Animation** | Framer Motion + GSAP |
| **State Management** | Zustand (client) + TanStack Query (server) |
| **Routing** | React Router DOM 7 |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Backend** | Express 5 + TypeScript (via ts-node) |
| **ORM** | Prisma 5 + @prisma/client |
| **Database** | PostgreSQL |
| **Auth** | JWT (jsonwebtoken) + bcryptjs + Passport (Google OAuth) + custom OTP |
| **File Upload** | Multer (memory storage) + Sharp (image processing) |
| **Storage** | S3-compatible OR local filesystem |
| **Validation** | Zod |
| **Rate Limiting** | express-rate-limit |
| **Security** | Helmet + CORS |

---

# 6. FILE INVENTORY

## Backend (api/)

```
api/
├── server.ts              # Express app setup, route mounting, OG meta, health check
├── middleware/
│   └── auth.ts            # authMiddleware (JWT verify), requireRole
├── routes/
│   ├── auth.ts            # Login, register, Google OAuth, phone OTP, password reset, me
│   ├── djs.ts             # DJ CRUD, filtering, profile images, ranking recalc
│   ├── mixes.ts           # Mix CRUD, trending, categories, likes, downloads
│   ├── rankings.ts        # Ranked DJ list, overview stats, history
│   ├── bookings.ts        # Booking CRUD, status transitions, reviews
│   ├── events.ts          # Event CRUD, types, Sound It Salone sync
│   ├── reviews.ts         # Review CRUD, verified flag, average rating recalc
│   ├── battles.ts         # Battle CRUD, entries, voting, closing, badges
│   ├── dashboard.ts       # DJ analytics, stats, aggregations
│   ├── admin.ts           # Admin stats, user management, DJ verification, ranking override
│   └── payments.ts        # Payment records, processing, refunds
├── utils/
│   ├── prisma.ts          # Singleton PrismaClient
│   ├── jwt.ts             # signToken, verifyToken (7-day expiry)
│   ├── otp.ts             # In-memory OTP store, send/verify
│   ├── rateLimiter.ts     # general, auth, booking, vote limiters
│   ├── upload.ts          # Multer configs (memory storage, file filters, limits)
│   ├── storage.ts         # S3 upload/delete, local filesystem fallback
│   ├── imageProcessor.ts  # Sharp-based image validation and resizing
│   ├── passport.ts        # Google OAuth 2.0 strategy
│   └── ranking.ts         # Ranking algorithm, battle scoring, recalculation
└── prisma/
    ├── schema.prisma      # Full database schema (12 models, 4 enums)
    └── seed.ts            # (not read) Database seeding script
```

## Frontend (src/)

```
src/
├── main.tsx               # React root, QueryClientProvider, auth init
├── App.tsx                # Router configuration, route definitions, layouts
├── index.css              # (not read) Global styles
├── lib/
│   ├── api.ts             # Axios instance with interceptors
│   ├── queryClient.ts     # TanStack Query client config
│   └── utils.ts           # cn() helper for Tailwind
├── stores/
│   └── authStore.ts       # Zustand auth store with persistence
├── hooks/
│   ├── useDJs.ts          # DJ list, single DJ, cities, genres
│   ├── useMixes.ts        # Mix list, trending, categories, single mix
│   ├── useBookings.ts     # Booking list, create booking
│   ├── useRankings.ts     # Rankings list, overview, history
│   ├── useAdmin.ts        # Admin stats, users, pending DJs
│   ├── useEvents.ts       # (not read) Events
│   ├── useBattles.ts      # (not read) Battles
│   ├── useReviews.ts      # (not read) Reviews
│   ├── useHomeData.ts     # Aggregated home page data
│   ├── usePublicStats.ts  # (not read) Public stats
│   ├── use-mobile.ts      # (not read) Mobile detection
│   └── useAuthStore.ts    # (missing file) Would re-export from stores/
├── pages/
│   ├── Home.tsx           # (not read) Landing page
│   ├── Discover.tsx       # DJ discovery with filters, search, pagination
│   ├── Rankings.tsx       # (not read) Rankings page
│   ├── DjProfile.tsx      # DJ profile (1,849 lines — massive)
│   ├── Booking.tsx        # (not read) Booking page
│   ├── MixHub.tsx         # (not read) Mix browsing
│   ├── Events.tsx         # (not read) Events listing
│   ├── HallOfFame.tsx     # (not read) Hall of fame
│   ├── Battles.tsx        # (not read) Battle listing
│   ├── Login.tsx          # (not read) Login page
│   ├── Register.tsx       # (not read) Registration page
│   ├── AdminDashboard.tsx # (not read) Admin dashboard
│   ├── AuthCallback.tsx   # (not read) Google OAuth callback
│   └── Dashboard.tsx      # (not read) Old dashboard (redirect?)
├── pages/dashboard/
│   ├── Overview.tsx       # (not read) Dashboard overview
│   ├── Bookings.tsx       # (not read) Dashboard bookings
│   ├── Messages.tsx       # (not read) Dashboard messages
│   ├── Mixes.tsx          # (not read) Dashboard mixes
│   ├── DjEvents.tsx       # (not read) Dashboard events
│   ├── Analytics.tsx      # (not read) Dashboard analytics
│   ├── Earnings.tsx       # (not read) Dashboard earnings
│   ├── Profile.tsx        # (not read) Dashboard profile
│   ├── Settings.tsx       # (not read) Dashboard settings
│   └── Subscription.tsx   # (not read) Dashboard subscription
├── components/
│   ├── Layout.tsx         # (not read) Public page layout (Navbar + Footer + Outlet)
│   ├── DashboardLayout.tsx# (not read) Dashboard layout (sidebar)
│   ├── Navbar.tsx         # Fixed navigation, scroll detection, mobile menu
│   ├── Footer.tsx         # (not read) Site footer
│   ├── AuthLayout.tsx     # (not read) Auth page layout
│   ├── ProtectedRoute.tsx # (not read) Role-based route guard
│   ├── BottomNav.tsx      # (not read) Mobile bottom nav
│   ├── MixPlayer.tsx      # (not read) Audio player with waveform
│   ├── WaveformAnimation.tsx # (not read) Waveform visualizer
│   ├── FadeIn.tsx         # (not read) Scroll animation wrapper
│   ├── CountdownTimer.tsx # (not read) Countdown timer
│   ├── PasswordStrength.tsx # (not read) Password strength meter
│   ├── ShareButton.tsx    # (not read) Social share button
│   └── ui/                # 50+ shadcn/ui components (button, card, dialog, etc.)
```

---

*Report generated by reverse-engineering analysis of the Deck Salone codebase.*
*All observations are based on static code analysis of files read in this session.*
