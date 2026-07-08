# Pro Subscription + Orange Money Payment Plan

## Overview
Implement a manual Pro Subscription system for DJs. No payment API available in Sierra Leone. DJs pay via Orange Money to +23272011156, upload proof screenshot/receipt, admin reviews and activates Pro status.

## Architecture

### Database Changes (schema.prisma)
Add to `DjProfile` model:
- `subscriptionStatus: String @default("free")` — free | pending | active | expired
- `subscriptionProofUrl: String?` — uploaded screenshot/receipt
- `subscriptionProofUploadedAt: DateTime?`
- `subscriptionActivatedAt: DateTime?`
- `subscriptionExpiresAt: DateTime?`
- `subscriptionPlan: String @default("monthly")` — monthly | yearly
- `subscriptionAmount: Float?`
- `subscriptionNotes: String?` — admin notes
- `subscriptionPaymentMethod: String @default("orange_money")`

### Backend Endpoints

**DJ-facing (in djs.ts, auth required):**
- `POST /api/djs/subscription-proof` — Upload payment proof image (uses existing upload middleware). Body: multipart with `proof` file field. Sets `subscriptionStatus` to "pending".
- `GET /api/djs/subscription-status` — Returns current DJ's subscription status and details.

**Admin-facing (in admin.ts, admin role required):**
- `GET /api/admin/subscriptions/pending` — List DJs with `subscriptionStatus = 'pending'`. Include DJ profile + user email + proof URL.
- `PUT /api/admin/subscriptions/:djId/approve` — Approve subscription. Body: `{ plan?: "monthly" | "yearly", amount?: number, notes?: string }`. Sets `isPro = true`, `subscriptionStatus = "active"`, `subscriptionActivatedAt = now()`, calculates `subscriptionExpiresAt` (monthly = +30 days, yearly = +365 days). Adds "Pro DJ" badge.
- `PUT /api/admin/subscriptions/:djId/reject` — Reject subscription. Body: `{ reason: string }`. Sets `subscriptionStatus = "free"`, `subscriptionNotes = reason`.
- Update existing `GET /api/admin/subscriptions` to return real data: count of free DJs, pending DJs, active Pro DJs, expired Pro DJs.

### Frontend — DJ Dashboard
New file: `app/src/pages/dashboard/Subscription.tsx`
- Shows current subscription status (Free / Pending / Pro / Expired)
- If Free: Shows Orange Money payment instructions
  - Number: +23272011156
  - Instructions: "Send payment via Orange Money to +23272011156, then upload your screenshot or receipt below"
  - WhatsApp contact link: `https://wa.me/23272011156`
- If Free: Upload proof button (image upload, uses existing file upload pattern)
- If Pending: Shows "Your payment proof is under review"
- If Pro: Shows active status, expiry date, plan details
- Route: Add to dashboard navigation

### Frontend — Admin Dashboard
Update: `app/src/pages/AdminDashboard.tsx`
- Replace existing static SubscriptionsSection with real data
- Table showing pending subscriptions: DJ name, email, proof image, upload date
- Actions: Approve (with plan + amount + notes) / Reject (with reason)
- KPI cards: Total Free DJs, Pending Subscriptions, Active Pro DJs, Expired Pros

### Frontend — WhatsApp + Pro Badges
- Add WhatsApp contact link (`https://wa.me/23272011156`) in Footer component or main navigation
- Create a ProBadge component
- Show Pro badge on: DJ profile cards, mix cards (in MixHub), DJ detail page, Rankings
- Use gold color (#D4A24A) for Pro badge

## Orange Money Number
+23272011156 — used for both payments and WhatsApp contact

## Design Notes
- Dark theme: bg-black, text-white, text-gold (#D4A24A)
- Use existing UI patterns (rounded-2xl, border-white/5, etc.)
- Follow existing dashboard and admin styling
