# Deck Salone — User Role System Fixes (Plan)

## Goal
Separate User (consumer) and DJ (creator) roles completely. Users get a lightweight consumer dashboard. DJs keep their existing dashboard unchanged.

## Architecture

### Existing (UNCHANGED for DJ)
- `/dashboard/*` — DJ dashboard (Overview, Mixes, Events, Bookings, Earnings, Analytics, Profile, Settings, Messages)
- `DashboardLayout.tsx` — DJ sidebar layout
- All files in `app/src/pages/dashboard/` — DJ pages (DO NOT MODIFY)

### New (for USER role)
- `/user/*` — User consumer dashboard
- `UserDashboardLayout.tsx` — User sidebar layout (lightweight)
- `app/src/pages/user/` — User pages (My Bookings, Messages, Following, Activity, Notifications, Profile, Settings)

### Routing Rules
- DJ logs in → redirect to `/dashboard`
- User logs in → redirect to `/discover`
- User navigates to `/dashboard/*` → redirect to `/user/dashboard`
- DJ navigates to `/user/*` → can access or redirect to `/dashboard`

### Navbar Updates
- User profile dropdown: Profile, Dashboard, Account Settings, Support, Logout
- DJ profile dropdown: keep existing

## Worker Assignments

### Worker 1: User Dashboard Architecture + Routing
**Files to create/modify:**
- `app/src/components/UserDashboardLayout.tsx` — new sidebar with user nav items
- `app/src/pages/user/UserDashboard.tsx` — main shell
- `app/src/App.tsx` — add `/user/*` routes, role-based redirects
- `app/src/pages/Login.tsx` — role-based redirect after login
- `app/src/pages/Register.tsx` — redirect to `/discover` after user signup
- `app/src/components/ProtectedRoute.tsx` — add role-based guards

**User nav items:**
- My Bookings (`/user/bookings`)
- Messages (`/user/messages`)
- Following (`/user/following`)
- My Activity (`/user/activity`)
- Notifications (`/user/notifications`)
- Profile (`/user/profile`)
- Settings (`/user/settings`)

### Worker 2: User Dashboard Pages
**Files to create:**
- `app/src/pages/user/MyBookings.tsx` — user's booking requests (pending, countered, accepted, rejected, confirmed)
- `app/src/pages/user/Messages.tsx` — chat with DJs (reuse existing message components)
- `app/src/pages/user/Following.tsx` — DJs followed + new uploads/events from them
- `app/src/pages/user/Activity.tsx` — liked mixes, ratings given, battle votes, saved events
- `app/src/pages/user/Notifications.tsx` — booking updates, DJ replies, counter offers, new mixes
- `app/src/pages/user/UserProfile.tsx` — edit profile (picture, username, name, bio, location, genres, social)
- `app/src/pages/user/UserSettings.tsx` — account settings (password, email, preferences)

Use the same dark theme styling as the rest of the app. Each page should be a real implementation, not a placeholder.

### Worker 3: Backend APIs for User Role
**Files to create/modify:**
- `app/api/routes/bookings.ts` — add GET /api/bookings/my-requests (user's sent bookings)
- `app/api/routes/users.ts` (or add to auth.ts) — GET /api/users/activity, GET /api/users/following-feed, GET /api/users/notifications
- `app/api/routes/messages.ts` — ensure messages work for user-to-DJ conversations
- Update booking status endpoints to be bi-directional (user sees DJ's counter offer)

Key endpoints needed:
- `GET /api/bookings/my-requests` — bookings sent by current user
- `GET /api/users/activity` — mix likes, ratings, votes, saved events
- `GET /api/users/following-feed` — new content from followed DJs
- `GET /api/users/notifications` — user's notification feed
- `PUT /api/bookings/:id/counter` — user can respond to counter offers

### Worker 4: Role-Based Navigation + UI Protection
**Files to modify:**
- `app/src/components/Navbar.tsx` — update profile dropdown based on role (USER: Profile, Dashboard, Account Settings, Support, Logout)
- `app/src/components/DashboardLayout.tsx` — add role guard: if user is not DJ, redirect to `/user/dashboard`
- `app/src/App.tsx` — ensure role-based route protection
- Update any "Dashboard" links throughout the app to go to the right dashboard based on role

### Worker 5: Add Missing DJ Features (New files only, don't modify existing DJ code)
**Files to create:**
- `app/api/utils/rankingAlgorithm.ts` — auto-ranking formula based on followers, ratings, mix plays, bookings, battle wins
- `app/api/routes/rankings.ts` — add auto-calculation endpoint (if not already there)
- `app/api/utils/mixDiscovery.ts` — content ranking algorithm (audio quality, metadata, engagement)
- Add any missing DJ endpoints that don't exist yet

DO NOT modify any existing files in `app/src/pages/dashboard/`. Only create NEW files.

## Important Rules
1. DJ code in `app/src/pages/dashboard/` is READ-ONLY — do not modify
2. All new user code goes in `app/src/pages/user/` and `app/src/components/UserDashboardLayout.tsx`
3. Backend changes should not break existing DJ functionality
4. Build must pass after all changes
5. Use consistent styling with the existing dark theme
