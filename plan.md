# DJ Dashboard Build Plan — The Deck Salone

## Current State Audit

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard.tsx | Basic single page | Stats cards, ranking chart, recent bookings, top mixes, username editor |
| Backend `/dashboard` | Real data | overview, bookings, mixes, reviews, rankings, events, battles, payments |
| Backend `/bookings` | Full CRUD | status transitions, filtering, pagination |
| Backend `/djs` | Full CRUD | profile update with avatar/cover upload |
| Messages API | Missing | No `/api/messages` routes exist |
| Dedicated layout | Missing | Dashboard is under public Layout (Navbar + Footer) |
| Sub-routes | Missing | No `/dashboard/bookings`, etc. |
| shadcn/ui sidebar | Available | `src/components/ui/sidebar.tsx` exists |

## Architecture

```
/dashboard              → Overview (enhanced)
/dashboard/bookings     → Booking management
/dashboard/messages     → Message center (frontend ready, backend needs wiring)
/dashboard/mixes        → Mix upload & management
/dashboard/profile      → Profile editor
/dashboard/analytics    → Detailed performance
/dashboard/earnings     → Income tracking
/dashboard/settings     → Account settings
```

## Shared Contract

### Colors (existing Tailwind)
- `gold` (#D4A24A), `gold-light`, `gold-dark` — accent/primary actions
- `black` (#0A0A0A), `black-elevated` (#111), `black-surface` (#181818) — backgrounds
- `dark-gray` (#1E1E1E), `medium-gray` (#2A2A2A) — borders, cards
- `text-primary` (#F5F5F5), `text-secondary` (#A3A3A3), `text-muted` (#6B6B6B) — text
- `green`, `red`, `blue`, `purple`, `orange` — status colors

### Fonts
- Display: `font-display` (Clash Display)
- Body: `font-body` (Inter)

### API Endpoints (existing)
- `GET /dashboard` — full dashboard data
- `GET /dashboard/stats` — quick stats
- `GET /bookings?asDj=true` — DJ bookings list
- `PUT /bookings/:id/status` — update status
- `GET /djs/:id` — DJ profile
- `PUT /djs/:id` — update profile (with multipart for avatar/cover)
- `GET /mixes` — list mixes (with `djId` filter)

### New API Endpoints needed
- `POST /messages` — send message
- `GET /messages/conversations` — list conversations
- `GET /messages/:userId` — get thread
- `PATCH /messages/:id/read` — mark as read
- `GET /payments?asDj=true` — earnings data

## Implementation Order

1. **Stage 1 — Foundation**: DashboardLayout + App.tsx routing + Overview page (enhanced)
2. **Stage 2 — Bookings**: Full booking management page (calendar, list, requests)
3. **Stage 3 — Profile + Mixes**: Profile editor + Mix management
4. **Stage 4 — Messages**: Frontend with mock/polling (backend to be wired)
5. **Stage 5 — Analytics + Earnings + Settings**: Data pages + account settings

## Worker Assignments

| Stage | Worker | Files | Scope |
|-------|--------|-------|-------|
| 1 | Main agent | DashboardLayout.tsx, App.tsx, Overview page | Foundation + routing |
| 2 | Coder 1 | Bookings page + hooks | Booking management |
| 3 | Coder 2 | Profile page + Mixes page + hooks | Profile + Mixes |
| 4 | Coder 3 | Messages page + Analytics + Earnings + Settings | Remaining pages |
| 5 | Main agent | Integration, fixes, final validation | Merge + test |

## Design Rules
- Dark theme by default (already the site default)
- Sidebar: 260px desktop, 72px collapsed, overlay mobile
- Cards: `bg-black-surface border border-dark-gray rounded-2xl`
- KPI cards: icon in gold circle, big number, label below
- Status badges: color-coded (PENDING=yellow, CONFIRMED=green, CANCELLED=red, etc.)
- No placeholder text, no Lorem ipsum
- All data from real APIs, no mock data
- Mobile: collapsible sidebar or hamburger menu
