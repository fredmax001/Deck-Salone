# Fix Plan — 6 Issues Diagnosed

## Issue 1: Follow Button Not Working
**Root Cause:** The `DjFollowButton` component exists but may be hidden or the mutation fails silently.
**Fix:** Verify the button is rendered in the correct location and visible. Check that `follow.mutate()` and `unfollow.mutate()` actually call the backend.

## Issue 2: DJs Not Showing on Discover
**Root Cause:** The `useDJs` hook might be hitting an error. The Discover page shows "FAILED TO LOAD DJS" when `djsQuery.error` is truthy.
**Fix:** The backend `/djs` route with `sortBy: 'ranking'` might fail if `rankingScore` field is missing or the Prisma query fails. Debug the API response.

## Issue 3: Discover City Filter
**Status:** UI already exists (lines 469-480). The filter panel has city checkboxes.
**Fix:** Verify the city filter works correctly after fixing Issue 2.

## Issue 4: "Failed to Load" on User Dashboard Pages
**Root Cause:** Backend routes in `app/api/routes/users.ts` exist but the RUNNING server hasn't been restarted. The `/api/users/activity` endpoint returns "Route not found".
**Fix:** Restart the backend. Also add missing endpoints.

## Issue 5: User Avatar Upload Not Working
**Root Cause:** The frontend calls `PUT /users/avatar` but this endpoint doesn't exist in the backend.
**Fix:** Create `PUT /api/users/avatar` endpoint that handles multipart upload using the existing upload utility.

## Issue 6: Profile Changes Don't Save
**Root Cause:** The frontend calls `PUT /users/profile` and `PUT /users/password` but these endpoints don't exist.
**Fix:** Create endpoints:
- `GET /api/users/profile` — returns user's profile data
- `PUT /api/users/profile` — updates user profile (username, name, bio, location, favoriteGenres, social)
- `PUT /api/users/avatar` — handles avatar upload
- `PUT /api/users/password` — changes password (requires current password)
- `GET /api/users/following` — returns DJs the user follows (with details)
- `PUT /api/users/notifications/:id/read` — mark notification as read
- `PUT /api/users/notifications/read-all` — mark all as read

## Worker Assignments

### Worker A: Backend Fix
1. Add missing endpoints to `app/api/routes/users.ts`:
   - `GET /profile` — return user profile with extended fields
   - `PUT /profile` — update user profile
   - `PUT /avatar` — handle avatar upload (multipart, use existing upload utility)
   - `PUT /password` — change password with current password validation
   - `GET /following` — return followed DJs with latest mix/event
   - `PUT /notifications/:id/read` — mark read
   - `PUT /notifications/read-all` — mark all read
2. Restart the backend
3. Verify all endpoints work with curl

### Worker B: Frontend User Profile Fix
1. Fix `app/src/pages/user/UserProfile.tsx`:
   - Ensure avatar upload calls the correct endpoint and handles response
   - Ensure save calls the correct endpoint
   - Add proper error handling and success feedback
2. Fix `app/src/pages/user/UserSettings.tsx`:
   - Ensure password change calls the correct endpoint

### Worker C: Discover + Follow Button Fix
1. Fix `app/src/pages/Discover.tsx`:
   - Debug why DJs are not showing (check API response structure, error handling)
   - Ensure the city filter UI works correctly
2. Fix `app/src/pages/DjProfile.tsx`:
   - Ensure the Follow button is visible and positioned correctly
   - Add error feedback if follow/unfollow fails

### Worker D: Verify and Build
1. Run `npm run build` and fix any TypeScript errors
2. Test all endpoints with curl
3. Report which issues are resolved
