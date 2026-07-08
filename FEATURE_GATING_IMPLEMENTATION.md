# 🔒 Subscription Feature-Gating Implementation Guide

## ✅ COMPLETED (Foundation Layer)

### Backend
- ✅ Permission middleware system (`middleware/permissions.ts`)
- ✅ Feature access helpers (canUploadMix, canSyncHearThis, etc.)
- ✅ Subscription tier checking
- ✅ Database schema with feature tracking columns
- ✅ Opportunities model and API route
- ✅ Auto-feature activation on subscription approval

### Database
- ✅ DjProfile.totalMixUploads, canReceivePayments, etc.
- ✅ Opportunity and OppApplications tables

### Frontend
- ✅ Subscription system already visual and working

---

## 🚀 NEXT STEPS (Priority Order)

### PHASE 1: Frontend Lock System (DO THIS FIRST)
**This unlocks all other frontend features**

#### 1.1 Create Upgrade Modal Component

**File:** `app/src/components/UpgradeModal.tsx`

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentTier: 'free' | 'pro' | 'legend';
  requiredTier: 'pro' | 'legend';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature,
  currentTier,
  requiredTier,
}) => {
  const navigate = useNavigate();

  const tiers = {
    pro: { name: 'Pro', price: '250 SLE/month', icon: Zap, color: 'bg-gold' },
    legend: { name: 'Legend', price: '750 SLE/month', icon: Crown, color: 'bg-gold' },
  };

  const target = tiers[requiredTier];
  const Icon = target.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gold" />
            Unlock {feature}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-black-surface rounded-lg border border-gold/30">
            <p className="text-sm text-text-secondary mb-3">
              This feature requires <span className="font-semibold text-gold">{target.name}</span> subscription
            </p>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-lg ${target.color} bg-opacity-20 flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${target.color}`} />
              </div>
              <div>
                <p className="font-bold text-lg text-text-primary">{target.name}</p>
                <p className="text-xs text-text-muted">{target.price}</p>
              </div>
            </div>
          </div>

          {requiredTier === 'pro' && (
            <ul className="text-sm text-text-secondary space-y-1">
              <li>✓ Unlimited mix uploads</li>
              <li>✓ HearThis sync</li>
              <li>✓ Apply for opportunities</li>
              <li>✓ Direct booking payments</li>
              <li>✓ Advanced analytics</li>
            </ul>
          )}

          {requiredTier === 'legend' && (
            <ul className="text-sm text-text-secondary space-y-1">
              <li>✓ Everything in Pro, plus:</li>
              <li>✓ Featured on homepage</li>
              <li>✓ Exclusive opportunities</li>
              <li>✓ Dedicated account manager</li>
              <li>✓ 24/7 priority support</li>
            </ul>
          )}

          <Button
            onClick={() => {
              navigate('/dashboard/subscription');
              onClose();
            }}
            className="w-full bg-gold-gradient text-black hover:opacity-90 font-semibold uppercase"
          >
            Upgrade Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

#### 1.2 Create Feature Lock Overlay Component

**File:** `app/src/components/FeatureLock.tsx`

```tsx
import { Lock } from 'lucide-react';
import React from 'react';

interface FeatureLockProps {
  children: React.ReactNode;
  isLocked: boolean;
  tier?: 'pro' | 'legend';
  message?: string;
}

export const FeatureLock: React.FC<FeatureLockProps> = ({
  children,
  isLocked,
  tier = 'pro',
  message,
}) => {
  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm">
        <div className="text-center">
          <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
          <p className="text-sm font-semibold text-text-primary">
            {message || `Upgrade to ${tier} to unlock`}
          </p>
        </div>
      </div>
    </div>
  );
};
```

#### 1.3 Create useFeatureAccess Hook

**File:** `app/src/hooks/useFeatureAccess.ts`

```typescript
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';

export const useFeatureAccess = () => {
  const user = useAuthStore((s) => s.user);
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    feature: string;
    requiredTier: 'pro' | 'legend';
  }>({ isOpen: false, feature: '', requiredTier: 'pro' });

  const tier = (user?.djProfile?.subscriptionTier || 'free') as 'free' | 'pro' | 'legend';

  const checkFeature = (requiredTier: 'pro' | 'legend', feature: string) => {
    const tiers = { free: 0, pro: 1, legend: 2 };
    const hasAccess = tiers[tier] >= tiers[requiredTier];

    if (!hasAccess) {
      setUpgradeModal({ isOpen: true, feature, requiredTier });
    }

    return hasAccess;
  };

  return {
    tier,
    upgradeModal,
    setUpgradeModal,
    checkFeature,
    isPro: tier === 'pro' || tier === 'legend',
    isLegend: tier === 'legend',
  };
};
```

---

### PHASE 2: Mix Upload Limits

**File:** `app/src/pages/dashboard/Mixes.tsx` (Update existing component)

```typescript
// Check upload limit before allowing upload
const canUploadMore = () => {
  if (tier === 'free' && totalMixCount >= 5) {
    checkFeature('pro', 'Unlimited Mix Uploads');
    return false;
  }
  return true;
};

// In the upload button
<Button
  disabled={!canUploadMore() || uploading}
  onClick={handleUpload}
>
  {tier === 'free' && totalMixCount >= 5 ? '🔒 Limit Reached' : 'Upload Mix'}
</Button>
```

---

### PHASE 3: Analytics Gating

**File:** `app/src/pages/dashboard/Analytics.tsx`

```typescript
import { FeatureLock } from '@/components/FeatureLock';

export const Analytics = () => {
  const { tier, checkFeature } = useFeatureAccess();

  return (
    <div className="space-y-6">
      {/* Basic analytics (everyone sees) */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <p className="text-text-secondary text-sm">Total Plays</p>
          <p className="text-3xl font-bold">{stats.plays}</p>
        </Card>
        <Card>
          <p className="text-text-secondary text-sm">Total Followers</p>
          <p className="text-3xl font-bold">{stats.followers}</p>
        </Card>
        <Card>
          <p className="text-text-secondary text-sm">Total Likes</p>
          <p className="text-3xl font-bold">{stats.likes}</p>
        </Card>
      </div>

      {/* Advanced analytics (Pro+ only) */}
      <FeatureLock isLocked={tier === 'free'} tier="pro" message="Upgrade to Pro for advanced insights">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <p className="text-text-secondary text-sm">Audience Growth</p>
            <LineChart data={audienceGrowth} />
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Monthly Listeners</p>
            <p className="text-3xl font-bold">{stats.monthlyListeners}</p>
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Top Countries</p>
            <BarChart data={topCountries} />
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Engagement Trends</p>
            <LineChart data={engagementTrends} />
          </Card>
        </div>
      </FeatureLock>
    </div>
  );
};
```

---

### PHASE 4: Opportunities Page

**File:** `app/src/pages/Opportunities.tsx` (NEW)

```tsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Music, Lock } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/UpgradeModal';

export const Opportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { tier, upgradeModal, setUpgradeModal, checkFeature } = useFeatureAccess();

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const res = await api.get('/opportunities');
        setOpportunities(res.data.data);
      } catch (err) {
        console.error('Failed to load opportunities', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  const handleApply = (opp) => {
    if (!checkFeature('pro', 'Apply for Opportunities')) return;

    // Handle application...
  };

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">DJ Opportunities</h1>
        <p className="text-text-secondary">
          {tier === 'free'
            ? 'Browse available opportunities. Upgrade to Pro to apply.'
            : 'Browse and apply for DJ opportunities'}
        </p>
      </div>

      <div className="grid gap-4 mt-6">
        {opportunities.map((opp) => (
          <Card key={opp.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{opp.title}</h3>
                <p className="text-text-secondary text-sm">{opp.description}</p>
              </div>
              {opp.isFeatured && <Badge className="bg-gold text-black">Featured</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(opp.eventDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {opp.eventLocation}
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Budget:</span> {opp.budgetCurrency} {opp.budget}
              </div>
            </div>

            <Button
              onClick={() => handleApply(opp)}
              disabled={tier === 'free'}
              className="w-full"
            >
              {tier === 'free' ? '🔒 Upgrade to Apply' : 'Apply Now'}
            </Button>
          </Card>
        ))}
      </div>

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, feature: '', requiredTier: 'pro' })}
        feature={upgradeModal.feature}
        currentTier={tier}
        requiredTier={upgradeModal.requiredTier}
      />
    </>
  );
};
```

---

### PHASE 5: Update Sidebar

Add to `app/src/components/Sidebar.tsx` (or similar):

```typescript
const menuItems = [
  // ... existing items ...
  { 
    label: 'Opportunities', 
    icon: Briefcase, 
    path: '/opportunities',
    badge: isPro ? null : <Badge className="bg-gold text-black">Pro+</Badge>,
  },
  // ... rest of menu ...
];
```

---

### PHASE 6: Backend Upload Limit Enforcement

**File:** `app/api/routes/mixes.ts` (Update existing)

```typescript
const { canCheckMixUploadLimit } = require('../middleware/permissions');

// POST /api/mixes - Create mix
router.post('/', authMiddleware, async (req, res) => {
  try {
    // ... existing validation ...

    const djProfile = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { subscriptionTier: true, totalMixUploads: true },
    });

    // Check upload limit
    if (!canCheckMixUploadLimit(djProfile.subscriptionTier, djProfile.totalMixUploads)) {
      return res.status(403).json({
        success: false,
        error: 'Mix upload limit reached. Upgrade to Pro for unlimited uploads.',
        limit: 5,
        current: djProfile.totalMixUploads,
        tier: djProfile.subscriptionTier,
      });
    }

    // ... create mix ...
    
    // Increment counter
    await prisma.djProfile.update({
      where: { userId: req.user.id },
      data: { totalMixUploads: { increment: 1 } },
    });

    return res.status(201).json({ success: true, data: mix });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### PHASE 7: HearThis Sync Page

**File:** `app/src/pages/dashboard/HearThisSync.tsx` (NEW)

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/UpgradeModal';

export const HearThisSync = () => {
  const [username, setUsername] = useState('');
  const { tier, upgradeModal, setUpgradeModal, checkFeature } = useFeatureAccess();

  const handleSync = async () => {
    if (!checkFeature('pro', 'HearThis Sync')) return;
    // Implementation...
  };

  return (
    <>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">HearThis Sync</h2>
        
        {tier !== 'pro' && tier !== 'legend' ? (
          <div className="bg-black-surface border border-gold/30 rounded-lg p-6 text-center">
            <p className="text-gold font-semibold mb-3">🔒 Pro Feature</p>
            <p className="text-text-secondary mb-4">
              Automatically sync your HearThis profile with your Deck Salone DJ account.
            </p>
            <Button
              onClick={() =>
                setUpgradeModal({ isOpen: true, feature: 'HearThis Sync', requiredTier: 'pro' })
              }
              className="bg-gold-gradient text-black"
            >
              Upgrade to Pro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="HearThis username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button onClick={handleSync} className="w-full">
              Connect HearThis Account
            </Button>
          </div>
        )}
      </Card>

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, feature: '', requiredTier: 'pro' })}
        feature={upgradeModal.feature}
        currentTier={tier}
        requiredTier={upgradeModal.requiredTier}
      />
    </>
  );
};
```

---

### PHASE 8: Admin Controls for Subscriptions

**File:** `app/src/pages/AdminDashboard.tsx` (Add to existing)

```typescript
const SubscriptionSettings = () => {
  const [plans, setPlans] = useState([]);

  const updatePlanFeatures = async (planId, features) => {
    // API call to update plan feature access
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Subscription Plans</h2>
      
      {['pro', 'legend'].map((plan) => (
        <Card key={plan} className="p-4">
          <h3 className="font-bold capitalize mb-3">{plan} Plan</h3>
          {/* Checkboxes for each feature */}
        </Card>
      ))}
    </div>
  );
};
```

---

## 📋 COMPLETE FEATURE CHECKLIST

- [x] Backend permission middleware
- [x] Database feature tracking
- [x] Opportunities API
- [ ] Upload limit checking (mix)
- [ ] Frontend upgrade modals
- [ ] Analytics gating
- [ ] HearThis sync gating
- [ ] Opportunities page UI
- [ ] Sidebar "Opportunities" link
- [ ] Admin settings page
- [ ] Legend+ styling (gold theme)
- [ ] Email notifications on tier change

---

## 🔄 Testing Checklist

**Before going live:**

1. Create test DJ accounts (free, pro, legend tiers)
2. Verify each account can only access appropriate features
3. Test upgrade flow (free → pro)
4. Test legend-exclusive opportunities
5. Verify upload limits enforce on backend
6. Test admin approval activates all features
7. Verify all 403 responses are correct

---

## 📱 Frontend Integration Quick Start

1. Copy components (UpgradeModal, FeatureLock)
2. Add useFeatureAccess hook
3. Wrap restricted features with FeatureLock
4. Add Opportunities page
5. Update sidebar
6. Update Subscription page to auto-close on approval
7. Hard refresh browser cache

---

## 🚀 Deployment Checklist

- [ ] Backend compiled and running
- [ ] Frontend built and deployed
- [ ] Database migrations applied
- [ ] Test account creation
- [ ] Verify subscription approval activates all features
- [ ] Monitor admin logs for feature gating
- [ ] Document feature limits for support team

---

**This should give you a complete, production-ready feature-gating system. Build incrementally, test each phase, and roll out to users!**
