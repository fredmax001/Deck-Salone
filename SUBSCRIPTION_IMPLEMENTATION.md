# Subscription System - Technical Implementation

## Architecture Overview

### Data Model (Prisma)

```prisma
model User {
  id String @id
  role String // ADMIN, USER, DJ, etc.
  // ...
}

model DJProfile {
  id String @id
  userId String
  user User @relation(fields: [userId], references: [id])
  
  // Subscription fields
  isPro Boolean @default(false)
  subscriptionTier String @default("free") // "free", "pro", "legend"
  subscriptionActivatedAt DateTime?
  
  proSubscriptionRequests ProSubscriptionRequest[]
  // ...
}

model ProSubscriptionRequest {
  id String @id
  djId String
  dj DJProfile @relation(fields: [djId], references: [id])
  
  // Request details
  plan String // "pro" or "legend"
  status String // "pending", "approved", "rejected"
  amount Int // SLE amount
  currency String
  paymentMethod String
  paymentNumber String
  proofUrl String // S3 or storage URL
  note String? // DJ's optional note
  
  // Admin review
  adminNote String?
  reviewedAt DateTime?
  reviewedById String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### API Endpoints

#### User Endpoints (Authenticated)

```
GET /api/payments/pro-subscription/config
├─ Returns payment configuration
├─ paymentMethod: "Orange Money"
├─ paymentNumber: "+23272011156"
├─ proPrice: 250, legendPrice: 750
└─ plans: [{ id: "pro", name: "Pro", price: 250 }, ...]

GET /api/payments/pro-subscription/current
├─ Returns current DJ subscription status
├─ isPro: boolean
├─ activePlan: "free" | "pro" | "legend"
├─ subscriptionActivatedAt: Date | null
└─ latestRequest: {
     id, plan, status, proofUrl, amount, 
     currency, adminNote, createdAt
   }

POST /api/payments/pro-subscription
├─ Accepts: FormData with plan + proof file
├─ File validation:
│  ├─ Max size: 10MB
│  ├─ Types: PNG, JPG, WEBP, PDF
│  └─ Required: proof file
├─ Responses:
│  ├─ 201: Created new request
│  ├─ 200: Updated existing pending request
│  └─ 400/404/500: Various errors
└─ Returns: ProSubscriptionRequest object
```

#### Admin Endpoints (Requires ADMIN/FINANCE_ADMIN role)

```
GET /api/admin/pro-subscription-requests?status=pending
├─ Returns all subscription requests
├─ Query params: status (pending/approved/rejected/all)
└─ Includes DJ details, payment info, proof URL

GET /api/admin/subscriptions
├─ Returns subscription overview stats
├─ totalRevenue: sum of approved payments
├─ mrr: monthly recurring revenue
├─ plans: array with user counts per tier
└─ pendingRequests: count

POST /api/admin/pro-subscription-requests/:id/approve
├─ Body: { note?: string }
├─ Side effects:
│  ├─ Updates DJProfile: isPro=true, subscriptionTier=plan
│  ├─ Sets subscriptionActivatedAt to now
│  └─ Updates ProSubscriptionRequest: status=approved
└─ Returns: Updated request with DJ details

POST /api/admin/pro-subscription-requests/:id/reject
├─ Body: { note?: string }
├─ Side effects:
│  └─ Sets status=rejected, stores admin note
└─ Returns: Updated request
```

### Frontend Components

#### `Subscription.tsx`

**Key State:**
```typescript
const [status, setStatus] = useState<ProSubscriptionStatus>()
const [selectedPlanId, setSelectedPlanId] = useState<string>()
const [selectedProof, setSelectedProof] = useState<File>()
const [loading, setLoading] = useState<string>() // "pro-proof"
const [requestSent, setRequestSent] = useState(false)
```

**Key Functions:**

1. **`handleSubscribe(planId)`**
   - Validates plan selection
   - Scrolls to payment panel
   - Updates selectedPlanId state

2. **`handleSubmitProof()`**
   - Validates file selected and size < 10MB
   - Creates FormData with file + plan + note
   - POSTs to `/payments/pro-subscription`
   - Updates status with response
   - Shows success message: "Request sent"
   - Sets requestSent=true

3. **`useEffect` - Load Current Status**
   - Fetches `/payments/pro-subscription/current` on mount
   - Fetches `/payments/pro-subscription/config` for prices
   - Initializes selectedPlanId from latestRequest or activePlan

4. **`useEffect` - Poll for Approval**
   - Triggers when latestRequest.status === "pending"
   - Polls `/payments/pro-subscription/current` every 5 seconds
   - When nextStatus.isPro becomes true:
     - Clears interval
     - Updates selectedPlanId
     - Calls fetchMe() to refresh user auth
     - Shows success toast: "Active now!"

**UI Components:**

- **Plan Cards**: Three tiers with CTA buttons
- **Payment Panel**: Shows payment instructions + file upload
- **Status Badges**: 
  - ⏳ Pending: Orange badge
  - ✓ Approved: Green badge
  - ✗ Rejected: Red badge
  - ✓ Active: Green badge (when isPro)
- **File Upload**: Drag & drop area, file validation
- **FAQ Section**: Common questions about subscriptions

#### `AdminDashboard.tsx` - SubscriptionsSection

**Key State:**
```typescript
const [selectedFilter, setSelectedFilter] = useState<'all'|'pending'|'approved'|'rejected'>('pending')
const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
```

**Features:**

1. **Statistics Cards**: Total revenue, MRR, Pro/Legend count, Pending count
2. **Filter Tabs**: All | Pending | Approved | Rejected (with counts)
3. **Request List**: 
   - DJ stage name + tier badge + status badge
   - Email, phone, amount, date
   - Optional DJ note and admin note
   - View Proof button (opens in new tab)
   - Approve/Reject buttons (if status=pending)
   - Per-request note textarea

4. **Approve Handler**:
   - POSTs to `/admin/pro-subscription-requests/:id/approve`
   - Includes optional note from textarea
   - Invalidates query caches to refresh
   - Shows success toast

5. **Reject Handler**:
   - POSTs to `/admin/pro-subscription-requests/:id/reject`
   - Includes optional reason note
   - Invalidates query caches
   - Shows success toast

### File Upload Handler

**Backend Middleware:**
```javascript
uploadDocument.single('proof')
├─ Multer middleware for single file
├─ Max size: 10MB (configured globally)
├─ Accepted types: images + PDF
└─ Buffer stored in req.file
```

**Upload Utility:**
```typescript
uploadBuffer(buffer, 'subscription-proofs', {
  ext: 'jpg' | 'png' | 'pdf' | 'webp',
  contentType: 'image/jpeg' | 'image/png' | etc.
})
├─ Uploads to S3 or local storage
├─ Returns presigned/public URL
└─ Stored in proofUrl field
```

### Form Data Handling

**Axios Configuration** (`api.ts`):
```typescript
// When FormData is detected:
if (config.data instanceof FormData) {
  delete config.headers['Content-Type']
  delete config.headers['content-type']
}
// Browser auto-sets boundary for multipart/form-data
```

### Error Handling

**File Upload Errors:**
- File not selected → "Upload a screenshot or receipt first"
- File too large → "File is too large. Max 10MB. Your file is 15.2MB."
- Invalid type → "File type not supported. PNG, JPG, WEBP, or PDF."
- DJ profile not found → "DJ profile not found" (404)
- Plan already active → "Your Pro subscription is already active"
- API error → Shows error from response or generic message

**Admin Errors:**
- Invalid request ID → "Subscription request not found" (404)
- Invalid note format → Validation error from zod schema
- Database error → "Failed to approve/reject request"

### Data Refresh Flow

**When user submits proof:**
1. API creates/updates ProSubscriptionRequest
2. Component updates local status state
3. Component calls fetchMe() to refresh auth
4. Auth store updates with new subscription tier
5. Component sets requestSent=true for UI feedback

**When admin approves:**
1. Admin clicks "Approve" button
2. API updates:
   - DJProfile: isPro=true, subscriptionTier=plan
   - ProSubscriptionRequest: status=approved
3. React Query cache invalidated
4. Admin sees updated request status
5. User's next poll sees isPro=true
6. User gets success notification

### Polling Strategy

**Client-side polling:**
```javascript
// Polls every 5 seconds when:
// - latestRequest?.status === 'pending' AND
// - !status?.isPro

// Stops when:
// - nextStatus.isPro becomes true OR
// - latestRequest?.status != 'pending'

// Clears interval on unmount
```

**Why 5 seconds?**
- Fast enough for good UX (notification appears ~5s after admin approves)
- Slow enough to not spam server
- Can be tuned if needed

### Security Considerations

1. **Authentication**: All endpoints require authMiddleware
2. **Authorization**: Admin endpoints require ADMIN/FINANCE_ADMIN role
3. **File Validation**: Type, size, and content checks
4. **DJ Profile Check**: Ensures DJ profile exists before processing
5. **Ownership Check**: API verifies user owns the DJ profile
6. **Duplicate Prevention**: Only one pending request per DJ at a time

### Environment Variables

```bash
# Payment configuration
PRO_SUBSCRIPTION_PRICE=250          # SLE, can override default
LEGEND_SUBSCRIPTION_PRICE=750       # SLE, can override default
PLATFORM_PAYMENT_NUMBER="+23272011156"
PLATFORM_WHATSAPP_NUMBER="+23272011156"

# Storage (if using S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
```

### Testing Checklist

- [ ] User can select Pro tier and see payment form
- [ ] Payment form shows correct Orange Money number
- [ ] File upload validates size (< 10MB) and type
- [ ] Submit button disabled until file selected
- [ ] Status shows "⏳ Pending" after submission
- [ ] Polling updates every 5 seconds (check network tab)
- [ ] Admin sees request in pending filter
- [ ] Admin can view proof (opens in new tab)
- [ ] Admin can approve with optional note
- [ ] User sees "✓ Active Now" after approval (within 5 sec)
- [ ] User tier updated in profile
- [ ] Admin can reject and user can resubmit
- [ ] Legend tier works identically to Pro
- [ ] Mobile responsive (file upload works on mobile)
- [ ] Error messages display correctly

### Performance Notes

1. **Polling**: 5-second interval is reasonable for manual process
2. **Query Caching**: React Query with 1-minute cache on subscription endpoints
3. **File Upload**: Only after file selected and form validated
4. **Status Updates**: Minimal API calls, uses existing endpoints

### Future Improvements

1. **Real-time Updates**: Consider WebSocket instead of polling
2. **Email Notifications**: Send DJ email when approved/rejected
3. **SMS Notifications**: Optional SMS to phone number
4. **Automatic Payment Verification**: AI/OCR to validate receipts
5. **Multiple Payment Methods**: Add Flutterwave, Stripe for int'l users
6. **Cancellation**: Allow downgrade from Pro to Free
7. **Usage Limits**: Enforce feature limits per tier
8. **Analytics**: Track conversion rates, average approval time
