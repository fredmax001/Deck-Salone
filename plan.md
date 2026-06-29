# Admin Dashboard Real Data Implementation Plan

## Backend Endpoints to Add (`api/routes/admin.ts`)

1. `GET /api/admin/analytics` — Monthly platform stats (last 6 months: users, DJs, mixes, bookings, revenue)
2. `GET /api/admin/payments` — All payments with pagination
3. `GET /api/admin/messages` — Recent message threads with counts
4. `GET /api/admin/staff` — Users with ADMIN/MODERATOR/FINANCE_ADMIN/VERIFICATION_ADMIN roles
5. `GET /api/admin/platforms` — Aggregated streaming platform data (followers, streams per platform)
6. `GET /api/admin/system` — Basic health (DB connection, counts, uptime)

## Frontend Hooks to Add (`src/hooks/useAdmin.ts`)
- `useAdminAnalytics()`
- `useAdminPayments()`
- `useAdminMessages()`
- `useAdminStaff()`
- `useAdminPlatforms()`
- `useAdminSystem()`

## Frontend Components to Update (`src/pages/AdminDashboard.tsx`)
- `AnalyticsSection` — Real monthly charts
- `BookingsSection` — Real bookings table (replace IntegrationSection)
- `PaymentsSection` — Real payments table
- `MessagingSection` — Real message threads
- `StaffSection` — Real staff list with role management
- `SubscriptionsSection` — Real subscription tiers from DB
- `AdvertisingSection` — Real ad slots from events (or placeholder)
- `ModerationSection` — Real content from mixes/bookings/reviews
- `SystemSection` — Real system health metrics
- `IntegrationSection` — Real DJ platform linking data instead of API mockups
