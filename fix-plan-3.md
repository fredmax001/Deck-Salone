# Fix Plan — 3 Issues

## Issue 1: DJ Dashboard Followers Count Not Showing

**Root Cause:** The `DashboardData` interface in `Overview.tsx` doesn't include `totalFollowers`. The backend `/dashboard/overview` endpoint likely doesn't include it either.

**Fix:**
- Backend: `app/api/routes/dashboard.ts` — add `totalFollowers` to the overview response
- Frontend: `app/src/pages/dashboard/Overview.tsx` — add `totalFollowers` to the DashboardData interface and display it as a KPI card

## Issue 2: Messaging Page Has No "Start New Chat"

**Root Cause:** Both DJ and User messaging pages only show existing conversations. No way to search for a DJ and start a new conversation.

**Fix:**
- Add a "New Chat" button in the conversation sidebar header
- Clicking it opens a modal/search to find DJs by name
- Selecting a DJ creates/opens a conversation with them
- Apply to both:
  - `app/src/pages/dashboard/Messages.tsx` (DJ)
  - `app/src/pages/user/Messages.tsx` (User)

## Issue 3: User Following Page Needs List/Grid Toggle

**Root Cause:** The Following page only has one card layout. No way to switch views.

**Fix:**
- Add a Grid/List toggle button in the page header
- Grid view: existing card layout (2-3 columns)
- List view: compact rows with avatar, name, city, followers, unfollow button, latest content
- Add `layout: 'grid' | 'list'` to state, persist to localStorage
- File: `app/src/pages/user/Following.tsx`
