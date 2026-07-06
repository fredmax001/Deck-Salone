# Fix Plan — Deck Salone Platform

## Overview
8 categories of fixes needed across frontend, backend, and admin dashboard.

## Stage 1: Parallel Implementation (5 workers)

### Worker 1: Admin Dashboard — View/Delete/Edit + Battles
**Files:** `app/src/pages/AdminDashboard.tsx`, `app/src/hooks/useAdmin.ts`, `app/src/App.tsx`
**Tasks:**
1. Fix **View** buttons on DJs, Users, Events, Mixes, Bookings sections — navigate to detail pages (`/dj/:id`, etc.)
2. Verify **Delete** buttons work (check endpoints exist)
3. Make **Rankings** editable — add inline score editing or modal
4. Add **DJ Battles** section to admin sidebar — manage battles, voting periods, applications
5. Add corresponding backend hooks for battle management

### Worker 2: DJ Follow Button
**Files:** `app/src/pages/DjProfile.tsx`, `app/src/hooks/useDJs.ts`, `app/api/routes/djs.ts`, `app/api/prisma/schema.prisma`
**Tasks:**
1. Add Follow/Unfollow button to DJ profile page
2. Create `useFollowDj()` hook (POST/DELETE `/api/djs/:id/follow`)
3. Add backend route `POST /api/djs/:id/follow` and `DELETE /api/djs/:id/follow`
4. Update Prisma schema if needed (Follow model or follower count)
5. Show follower count on DJ profile

### Worker 3: Hall of Fame — Real Data + Admin Editable
**Files:** `app/src/pages/HallOfFame.tsx`, `app/api/routes/admin.ts`
**Tasks:**
1. Replace hardcoded pioneer data with real verified DJs from API
2. Replace hardcoded legendary mixes with real mixes from API
3. Add admin-only edit controls (visible when user is ADMIN/MODERATOR)
4. Allow admin to select which DJs appear in Hall of Fame

### Worker 4: Static Pages (Terms, Privacy, Help, Blog)
**Files:** `app/src/pages/Terms.tsx`, `app/src/pages/Privacy.tsx`, `app/src/pages/Help.tsx`, `app/src/pages/Blog.tsx`, `app/src/App.tsx`, `app/src/components/Footer.tsx`
**Tasks:**
1. Create `/terms` page — Terms of Service
2. Create `/privacy` page — Privacy Policy  
3. Create `/help` page — Help Center / FAQ
4. Create `/blog` page — Blog placeholder (can show coming soon or sample posts)
5. Update Footer links from `#` to real routes
6. Add routes to App.tsx

### Worker 5: Language Fix + Battle Admin
**Files:** `app/src/components/Footer.tsx`, `app/src/pages/AdminDashboard.tsx`, `app/api/routes/battles.ts`, `app/api/routes/admin.ts`
**Tasks:**
1. Fix Footer language display: change "SLE | English" to "English | Krio"
2. Add DJ Battle management to admin dashboard sidebar
3. Create admin battle hooks: `useAdminBattles`, `useUpdateBattleStatus`, `useCreateBattle`
4. Admin can: create battles, set voting periods, approve applicants, view votes

## Stage 2: Build Verification
After all workers complete, run `npm run build` in `app/` to verify TypeScript compiles cleanly.

## Key Context
- Backend runs on `localhost:5002`
- API baseURL: `http://localhost:5002/api`
- Admin auth: `useAuthStore` with role check
- Admin sidebar items array at top of AdminDashboard.tsx
- All admin API paths now use `/admin/...` (not `/api/admin/...`)
- Prisma client path: `app/api/utils/prisma.ts`
