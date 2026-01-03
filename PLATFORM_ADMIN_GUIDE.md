# Platform Admin Guide

## Overview

The GymPass SaaS platform now includes a **Platform Owner Admin Area** for managing all gyms in the system. This is separate from the gym staff portals and provides centralized control over the entire platform.

---

## 🔐 Access

### Admin Portal URL
```
http://localhost:5173/admin/login
```

### Default Credentials
```
Email: admin@gympass.com
Password: admin123
```

⚠️ **IMPORTANT**: Change these credentials in production!

---

## 📋 Features

### 1. Admin Dashboard (`/admin`)
- Overview statistics:
  - Total gyms
  - Active gyms
  - Blocked gyms
  - Total passes issued across all gyms
  - Total users across all gyms
- Recent gyms list with quick access

### 2. Gym Management (`/admin/gyms`)
- **List all gyms** with:
  - Gym name
  - Slug (subdomain)
  - Status (ACTIVE / BLOCKED / DELETED)
  - Created date
  - Subscription status (Stripe - prepared for future)
  - Total passes issued
  - Total users
  
- **Search & Filter**:
  - Search by name or slug
  - Filter by status (Active, Blocked, Deleted)

### 3. Gym Detail Page (`/admin/gyms/:id`)
- **Basic Information**:
  - Gym name, slug, status
  - Staff portal URL
  - Created date
  
- **Subscription Info** (Stripe fields prepared):
  - Subscription status
  - Current period end
  - Stripe customer ID
  - Plan ID
  
- **Metrics**:
  - Total passes issued
  - Active passes
  - Total users
  - Last activity timestamp
  - Passes breakdown by type
  
- **Admin Actions**:
  - 🚫 **Block Gym**: Prevents staff login and blocks all gym operations
  - ✅ **Unblock Gym**: Restores gym access
  - 🗑️ **Soft Delete Gym**: Marks gym as deleted (data preserved)

---

## 🛡️ Security

### Authentication
- Separate authentication system from gym staff
- JWT-based with `PLATFORM_ADMIN` role
- Token stored in `localStorage` as `admin_token`
- Automatic redirect to login if unauthorized

### Authorization
- All `/api/admin/*` routes require `PLATFORM_ADMIN` role
- Server-side middleware enforces access control
- 403 Forbidden if non-admin tries to access

### Route Priority
- `/admin` routes are matched **before** gym slug routes
- Ensures `/admin` is always reserved for platform admin
- No conflict with gym subdomains

---

## 🔧 Technical Implementation

### Backend

#### New Database Schema (`registry.db`)
```sql
-- Gym status and subscription fields
ALTER TABLE gyms ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE gyms ADD COLUMN deleted_at INTEGER;
ALTER TABLE gyms ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE gyms ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE gyms ADD COLUMN subscription_status TEXT;
ALTER TABLE gyms ADD COLUMN current_period_end INTEGER;
ALTER TABLE gyms ADD COLUMN plan_id TEXT;

-- Platform admin users
CREATE TABLE platform_admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### New API Endpoints
```
POST   /api/admin/login              - Platform admin login
GET    /api/admin/gyms               - List all gyms (with search/filter)
GET    /api/admin/gyms/:id           - Get gym detail + metrics
POST   /api/admin/gyms/:id/block     - Block a gym
POST   /api/admin/gyms/:id/unblock   - Unblock a gym
POST   /api/admin/gyms/:id/delete    - Soft delete a gym
```

#### Metrics Calculation
- Queries each gym's tenant database
- Aggregates:
  - Total passes (`user_passes` table)
  - Active passes (status = 'ACTIVE')
  - Total users (`users` table)
  - Last activity (`pass_usage_logs` table)
  - Passes by type (join with `pass_types`)

#### Gym Blocking
- When a gym is blocked:
  - `tenantMiddleware` checks gym status
  - Returns 403 error if status is 'BLOCKED'
  - Staff cannot log in
  - Users cannot purchase passes
  - All tenant-specific API calls are blocked

### Frontend

#### New Pages
- `AdminLoginScreen.tsx` - Platform admin login
- `AdminDashboardScreen.tsx` - Overview dashboard
- `AdminGymsScreen.tsx` - Gyms list with search/filter
- `AdminGymDetailScreen.tsx` - Gym detail with actions

#### Routing
```tsx
// Admin routes (checked first)
/admin/login          → AdminLoginScreen
/admin                → AdminDashboardScreen
/admin/gyms           → AdminGymsScreen
/admin/gyms/:id       → AdminGymDetailScreen

// Staff routes (gym-specific, checked after)
/                     → LoginScreen
/dashboard            → DashboardScreen
/scanner              → ScannerScreen
...
```

---

## 🧪 Testing Checklist

### ✅ Admin Authentication
- [ ] Login with correct credentials → success
- [ ] Login with wrong credentials → error
- [ ] Access `/admin` without token → redirect to `/admin/login`
- [ ] Access `/admin/gyms` without token → redirect to `/admin/login`
- [ ] Logout → clears token and redirects

### ✅ Gym List
- [ ] View all gyms with correct metrics
- [ ] Search by name → filters results
- [ ] Search by slug → filters results
- [ ] Filter by status (Active) → shows only active
- [ ] Filter by status (Blocked) → shows only blocked
- [ ] Click "View Details" → navigates to detail page

### ✅ Gym Detail
- [ ] View gym basic info (name, slug, status, created date)
- [ ] View metrics (passes, users, last activity)
- [ ] View passes breakdown by type
- [ ] View subscription status (should show "No subscription" for now)

### ✅ Gym Actions
- [ ] Block active gym → status changes to BLOCKED
- [ ] Try to access blocked gym's staff portal → 403 error
- [ ] Unblock gym → status changes to ACTIVE
- [ ] Staff can log in again after unblock
- [ ] Soft delete gym → status changes to DELETED
- [ ] Deleted gym no longer appears in gym list (unless filter includes DELETED)

### ✅ Non-Regression
- [ ] Gym staff login still works (not affected by admin)
- [ ] Staff can access dashboard, scanner, users, etc.
- [ ] Mobile app can still register users and purchase passes
- [ ] QR scanning still works
- [ ] Apple Wallet download still works
- [ ] Gym registration portal still works

---

## 🚀 Quick Start

### 1. Start the backend
```bash
cd backend
npm run dev
```

The backend will automatically seed the default platform admin on startup.

### 2. Start the staff-web
```bash
cd staff-web
npm run dev
```

### 3. Access the admin portal
```
http://localhost:5173/admin/login
```

Login with:
- Email: `admin@gympass.com`
- Password: `admin123`

### 4. Test gym blocking
1. Go to `/admin/gyms`
2. Click "View Details" on any gym
3. Click "🚫 Block Gym"
4. Try to access that gym's staff portal (e.g., `http://hanker.gym.local:5173`)
5. Should see "Gym has been blocked" error

---

## 📝 Future Enhancements

### Stripe Integration
The database schema is already prepared for Stripe subscriptions. To integrate:

1. Add Stripe webhook handler:
   ```typescript
   router.post('/webhooks/stripe', async (req, res) => {
     // Handle subscription events
     // Update gym subscription_status, current_period_end, etc.
   });
   ```

2. Update gym subscription fields when:
   - Gym subscribes → set `stripe_customer_id`, `stripe_subscription_id`
   - Subscription status changes → update `subscription_status`
   - Period renews → update `current_period_end`

3. Add subscription-based access control:
   ```typescript
   // In tenantMiddleware
   if (gym.subscription_status === 'past_due') {
     return res.status(402).json({ error: 'Subscription payment required' });
   }
   ```

### Additional Features
- Gym analytics dashboard (revenue, growth charts)
- Email notifications to gym owners
- Bulk actions (block multiple gyms)
- Audit log (track all admin actions)
- Custom subscription plans per gym
- Gym onboarding workflow

---

## 🔒 Production Checklist

Before deploying to production:

- [ ] Change default platform admin password
- [ ] Add environment variable for admin email/password
- [ ] Enable HTTPS for admin portal
- [ ] Add rate limiting to admin login endpoint
- [ ] Add 2FA for platform admin
- [ ] Set up proper logging for admin actions
- [ ] Add database backups before destructive actions
- [ ] Test gym blocking doesn't affect other gyms
- [ ] Verify soft delete preserves all historical data

---

## 📞 Support

For issues or questions about the platform admin area, contact the development team.




