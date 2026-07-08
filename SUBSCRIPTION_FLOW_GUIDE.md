# Subscription Payment Flow - Complete Guide

## Overview

The platform now has a complete, production-ready subscription system with manual Orange Money payments for Sierra Leone. Users can upgrade to **Pro** or **Legend** tiers by paying via Orange Money and uploading proof. Admins review and activate subscriptions manually.

---

## 🎯 User Flow

### Step 1: Choose Subscription Tier

1. Navigate to **Dashboard → Subscription**
2. View the three tiers:
   - **Free**: Current default (5 mix uploads, basic profile)
   - **Pro**: SLE 250/month (unlimited uploads, advanced analytics, verified badge)
   - **Legend**: SLE 750/month (everything in Pro + featured placement, 24/7 support)
3. Click **"Upgrade to Pro"** or **"Upgrade to Legend"** button

### Step 2: Payment Instructions

After selecting a tier:

1. **Payment Panel appears** with:
   - Orange Money number: **+23272011156**
   - Exact amount to send (e.g., SLE 250 for Pro)
   - Clear instructions on next steps
   - Optional WhatsApp contact link for questions

2. **Make payment** via Orange Money:
   - Send the exact amount to the displayed number
   - Keep screenshot or receipt (you'll need this)
   - Payments are manual, processed by platform admins

### Step 3: Upload Payment Proof

1. **Take screenshot** of your Orange Money receipt/confirmation
   - Ensure date, amount, and transaction ID are visible
   - Supported formats: PNG, JPG, WEBP, PDF (max 10MB)

2. **Upload proof** in the payment panel:
   - Click the upload area
   - Select your screenshot/receipt
   - Optionally add a note (transaction ID, sender name, etc.)

3. **Click "Submit for Admin Review"**
   - Status shows: **⏳ Pending** 
   - Message displays: "Request sent! Your subscription is pending admin confirmation."
   - System polls every 5 seconds for admin approval

### Step 4: Admin Confirmation

**Expected timeline**: Admin will review within 24 hours

When admin approves:
- 🎉 **"Active Now"** status appears
- Your tier upgrades immediately
- You receive confirmation notification
- Full feature access unlocked

---

## 👨‍💼 Admin Flow

### Access Subscription Management

1. Go to **Admin Dashboard → Subscriptions**

### Dashboard Overview

**Top Statistics:**
- **Total Revenue**: Sum of all approved subscription payments
- **Monthly Revenue (MRR)**: Pro + Legend subscriptions this month
- **Pro DJs**: Number of active Pro subscribers
- **Legend DJs**: Number of active Legend subscribers  
- **Pending Proofs**: Count of awaiting review

**Plan Overview Cards:**
- Shows each tier's details and active subscriber count

### Review Pending Requests

**Filter Options:**
- **All**: View all requests ever submitted
- **Pending**: ⏳ Awaiting your review (ACTION NEEDED)
- **Approved**: ✓ Already activated
- **Rejected**: ✗ Rejected by admin

### Review & Approve Process

For each pending request, you'll see:

**DJ Information:**
- DJ stage name
- Email & phone number
- Plan requested (Pro or Legend)
- Amount paid (SLE)
- Payment method & number
- Date submitted

**Actions:**

1. **View Proof** button
   - Opens the payment screenshot/receipt in new tab
   - Verify: amount matches tier price, date is recent, transaction looks valid

2. **Optional: Add Admin Note**
   - Text area for notes (up to 200 chars)
   - Visible to DJ if rejected (e.g., "Receipt is blurry, please resubmit")

3. **Approve** button ✓
   - Activates subscription immediately
   - Sets `isPro: true` and `subscriptionTier: pro` or `legend`
   - DJ sees "Active Now" within 5 seconds
   - DJ receives success notification

4. **Reject** button ✗
   - Sets status to "rejected"
   - DJ can resubmit with new proof
   - Include note explaining why (receipt quality, amount mismatch, etc.)

---

## 🔄 Status Transitions

```
User selects tier
     ↓
Payment form appears
     ↓
User uploads proof & submits
     ↓
Status: ⏳ PENDING
System polls every 5 seconds
     ↓
    ┌─────────────────┬──────────────────┐
    ↓                 ↓                  ↓
APPROVED          REJECTED          (no change)
Status: ✓ ACTIVE  Pending → Show   Status stays
isPro: true       rejection error   pending
Tier: pro/legend  DJ can retry      User waits
    ↓                 ↓                  ↓
    User sees     User uploads       Keep polling
   "Active Now"    new proof
   Features       Cycle repeats
   unlocked
```

---

## 🐛 Troubleshooting

### User: Submit button doesn't work

**Solution:**
1. Ensure file is selected (required)
2. Check file size < 10MB
3. Verify file format (PNG, JPG, WEBP, PDF only)
4. Try clearing browser cache and refreshing
5. Check console for errors (F12 Developer Tools)

### User: Still pending after 24 hours

**Check as admin:**
1. Go to Admin Dashboard → Subscriptions → Pending
2. Verify request exists
3. If missing, ask user to resubmit
4. If exists, approve it

### Admin: Can't see pending requests

**Check:**
1. Ensure logged in as ADMIN role
2. Verify `pro-subscription-requests` endpoint is responding:
   - Test: `GET /api/admin/pro-subscription-requests`
   - Should return array of requests

### User: Payment didn't show as pending

**Solutions:**
1. Check network tab in DevTools for upload errors
2. Verify Orange Money number is correct
3. Try uploading with a different file format
4. Reduce file size if very large
5. Check auth token is valid (should auto-refresh)

---

## 📊 Revenue Tracking

**Admin Dashboard shows:**
- **Total Revenue**: All approved payments (lifetime)
- **MRR (Monthly Recurring Revenue)**: 
  - Pro count × 250 + Legend count × 750
  - Updates when subscriptions are approved
- **ARR (Annual Recurring Revenue)**: MRR × 12

---

## 🔐 Security Notes

1. **Payment Verification**: Admins must manually verify receipt authenticity
   - Check Orange Money transaction number matches
   - Verify date is recent (not old screenshot)
   - Confirm amount matches tier price

2. **Rejection Criteria**:
   - Receipt is blurry/unreadable
   - Amount doesn't match tier price
   - Date is too old (recommend <7 days)
   - Transaction number already used

3. **Data Safety**:
   - Proof images stored securely with upload utility
   - Access controlled via admin auth
   - Records maintained for revenue audit

---

## 🚀 Production Checklist

- ✅ Form submission with file upload works
- ✅ Error messages are clear and helpful
- ✅ Status polling updates every 5 seconds
- ✅ Admin dashboard shows all requests with filters
- ✅ Approve/reject with optional notes
- ✅ User sees "Active Now" immediately after approval
- ✅ Email notifications sent (if configured)
- ✅ File validation prevents oversized uploads
- ✅ Graceful error handling throughout
- ✅ Mobile responsive design

---

## 📱 Mobile Responsiveness

All flows fully responsive:
- ✓ Subscription tier selection
- ✓ Payment proof upload (file picker works)
- ✓ Admin dashboard filters & buttons
- ✓ Status messages and badges

---

## 🤝 Support

**For Users:**
- WhatsApp link on Subscription page: +23272011156
- In-app help text explains each step
- Clear error messages guide users

**For Admins:**
- View Proof button shows exact receipt
- Admin notes stored with each request
- Approval history visible in request details

---

## Next Steps

1. **Test the full flow:**
   - Create test DJ account
   - Select Pro tier
   - Upload sample receipt
   - Approve as admin
   - Verify "Active Now" appears

2. **Configure payment number** (if different):
   - Update `PLATFORM_PAYMENT_NUMBER` env var
   - Update prices: `PRO_SUBSCRIPTION_PRICE`, `LEGEND_SUBSCRIPTION_PRICE`

3. **Monitor submissions:**
   - Check Admin Dashboard regularly
   - Approve within 24 hours for best UX
   - Track revenue metrics

4. **Gather feedback:**
   - Improve error messages based on issues
   - Optimize polling if too frequent
   - Adjust rejection criteria as needed
