# Stripe Subscription + i18n Implementation Guide

## ✅ PART A: STRIPE SUBSCRIPTION - COMPLETED

### Backend Changes

#### 1. Dependencies Installed
```bash
cd backend && npm install stripe
```

#### 2. Environment Variables (`backend/src/utils/env.ts`)
Added:
```typescript
STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || '',
```

**Required .env setup:**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...  # Create in Stripe Dashboard: 49990 HUF/month recurring
```

#### 3. Database Schema (`backend/src/db/registry-schema.sql`)
Added `billing_email TEXT` to gyms table.
Migration logic in `registry.ts` handles existing databases automatically.

#### 4. Registry Functions (`backend/src/db/registry.ts`)
- Updated `Gym` interface to include `billing_email`
- Modified `createGym()` to accept `status` parameter (defaults to 'PENDING')
- Added `updateGymSubscription()` function for webhook updates
- Added migration for `billing_email` column

#### 5. Stripe Service (`backend/src/services/stripeService.ts`) - NEW FILE
- `createCheckoutSession()` - Creates Stripe Checkout for subscription
- `handleWebhookEvent()` - Processes Stripe webhooks
- Handles events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Updates gym status to ACTIVE on successful payment

#### 6. Stripe Routes (`backend/src/routes/stripe.ts`) - NEW FILE
- `POST /api/stripe/create-checkout-session` - Creates checkout session
- `POST /api/stripe/webhook` - Receives Stripe webhook events (with signature verification)

#### 7. App Configuration (`backend/src/app.ts`)
- Added `stripeRoutes` import and registration
- Added raw body parser for webhook endpoint (required for signature verification)
- Added CORS for `localhost:8081` (registration portal)
- Added routes for `/registration/success` and `/registration/cancel`

#### 8. Tenant Middleware (`backend/src/middleware/tenant.ts`)
- Added check for `PENDING` status
- PENDING gyms cannot access staff portal until payment completes

### Frontend Changes

#### 9. Registration Flow (`registration-portal/app.js`)
- Modified to create gym with PENDING status
- Creates Stripe Checkout Session after gym creation
- Stores gym data in sessionStorage
- Redirects to Stripe Checkout

#### 10. Success Page (`registration-portal/success.html`) - NEW FILE
- Displays gym credentials after successful payment
- Retrieves data from sessionStorage
- Shows staff login URL one time only
- Clears sessionStorage after display

#### 11. Cancel Page (`registration-portal/cancel.html`) - NEW FILE
- Handles payment cancellation
- Allows retry payment
- Gym remains in PENDING status

#### 12. Admin UI (`staff-web/src/screens/admin/AdminGymDetailScreen.tsx`)
- Displays subscription status with color-coded badges
- Shows billing period end date
- Shows Stripe customer ID
- Added CSS for status badges (`staff-web/src/styles/AdminGymDetail.css`)

#### 13. Admin API Client (`staff-web/src/api/adminClient.ts`)
- Added `billing_email` to `Gym` interface

### Testing Stripe Integration

1. **Create Stripe Product & Price:**
   ```
   - Go to Stripe Dashboard (test mode)
   - Products → Create Product
   - Name: "GymPass Monthly Subscription"
   - Price: 49,990 HUF, Recurring: Monthly
   - Copy the Price ID (starts with price_...)
   ```

2. **Set Environment Variables:**
   ```bash
   cd backend
   # Add to .env file:
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID=price_...
   ```

3. **Set Up Webhook (for local testing):**
   ```bash
   # Install Stripe CLI: https://stripe.com/docs/stripe-cli
   stripe login
   stripe listen --forward-to localhost:4000/api/stripe/webhook
   # Copy the webhook secret (whsec_...) to .env as STRIPE_WEBHOOK_SECRET
   ```

4. **Test Registration:**
   - Visit `http://localhost:8081/`
   - Fill in gym details
   - Click "Create Gym"
   - You'll be redirected to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`, any future date, any CVC
   - Complete payment
   - You'll be redirected to success page with credentials

5. **Verify:**
   - Check backend logs for webhook events
   - Check admin portal - gym should be ACTIVE with subscription info
   - Try accessing staff portal - should work now

---

## 🚧 PART B: i18n (HUNGARIAN DEFAULT) - IN PROGRESS

### What's Done

#### 1. Staff-Web Dependencies Installed
```bash
cd staff-web
npm install i18next react-i18next i18next-browser-languagedetector js-cookie
npm install --save-dev @types/js-cookie
```

#### 2. i18n Config Created (`staff-web/src/i18n/config.ts`)
- Custom cookie detector (reads/writes 'lang' cookie)
- Default language: HU
- Fallback: HU
- Cookie expires: 365 days

### What's Needed

#### 3. Create Translation Files

**File: `staff-web/src/i18n/locales/hu.json`**
```json
{
  "common": {
    "loading": "Betöltés...",
    "error": "Hiba",
    "success": "Sikeres",
    "save": "Mentés",
    "cancel": "Mégse",
    "delete": "Törlés",
    "edit": "Szerkesztés",
    "back": "Vissza",
    "next": "Következő",
    "submit": "Küldés",
    "search": "Keresés",
    "filter": "Szűrés",
    "language": "Nyelv"
  },
  "auth": {
    "login": "Bejelentkezés",
    "logout": "Kijelentkezés",
    "email": "E-mail",
    "password": "Jelszó",
    "signIn": "Bejelentkezés",
    "signingIn": "Bejelentkezés...",
    "wrongCredentials": "Hibás bejelentkezési adatok. {{remaining}} próbálkozás maradt.",
    "tooManyAttempts": "Túl sok sikertelen próbálkozás. Átirányítás...",
    "fillAllFields": "Kérjük, töltse ki az összes mezőt"
  },
  "dashboard": {
    "title": "Irányítópult",
    "welcome": "Üdvözöljük",
    "activePassesTitle": "Aktív bérletek",
    "activePasses": "Aktív bérlet",
    "totalUsersTitle": "Összes felhasználó",
    "totalUsers": "Felhasználó",
    "todayScansTitle": "Mai beléptések",
    "todayScans": "Beléptés ma",
    "recentActivity": "Legutóbbi tevékenység",
    "quickActions": "Gyors műveletek",
    "scanPass": "Bérlet beolvasása",
    "createPass": "Új bérlet",
    "viewUsers": "Felhasználók",
    "viewHistory": "Előzmények",
    "gymInfo": "Edzőterem információk"
  },
  "scanner": {
    "title": "Bérlet beolvasó",
    "scanQR": "QR kód beolvasása",
    "enterManually": "Kézi bevitel",
    "passId": "Bérlet azonosító",
    "validate": "Ellenőrzés",
    "validating": "Ellenőrzés...",
    "valid": "Érvényes bérlet",
    "invalid": "Érvénytelen bérlet",
    "expired": "Lejárt bérlet",
    "noEntriesLeft": "Nincs több belépés"
  },
  "passes": {
    "title": "Bérletek",
    "createNew": "Új bérlet létrehozása",
    "passType": "Bérlet típusa",
    "selectUser": "Felhasználó kiválasztása",
    "purchaseDate": "Vásárlás dátuma",
    "validUntil": "Érvényes eddig",
    "entriesLeft": "Hátralévő belépések",
    "status": "Állapot",
    "active": "Aktív",
    "expired": "Lejárt",
    "used": "Felhasznált"
  },
  "users": {
    "title": "Felhasználók",
    "addNew": "Új felhasználó",
    "name": "Név",
    "email": "E-mail",
    "phone": "Telefon",
    "registeredAt": "Regisztrált",
    "totalPasses": "Összes bérlet",
    "activePasses": "Aktív bérletek"
  },
  "history": {
    "title": "Előzmények",
    "scanHistory": "Beolvasási előzmények",
    "date": "Dátum",
    "user": "Felhasználó",
    "passType": "Bérlet típus",
    "action": "Művelet",
    "checkin": "Beléptés",
    "checkout": "Kiléptés"
  },
  "landing": {
    "title": "{{gymName}} Fitness",
    "tagline": "Az Ön fitnesz útja itt kezdődik",
    "downloadApp": "Alkalmazás letöltése",
    "availableOn": "Elérhető iOS és Android rendszeren",
    "features": {
      "passes": {
        "title": "Rugalmas bérletek",
        "description": "Heti, havi vagy alkalomjegyek"
      },
      "wallet": {
        "title": "Digitális tárca",
        "description": "Bérletek hozzáadása az Apple Wallet-hez"
      },
      "checkin": {
        "title": "Gyors beléptés",
        "description": "Gyors QR kód beolvasás"
      }
    }
  },
  "admin": {
    "title": "Platform adminisztráció",
    "gyms": "Edzőtermek",
    "gymDetails": "Edzőterem részletei",
    "subscription": "Előfizetés",
    "businessInfo": "Céges információk",
    "actions": "Műveletek",
    "block": "Blokkolás",
    "unblock": "Blokkolás feloldása",
    "delete": "Törlés",
    "status": {
      "active": "Aktív",
      "pending": "Függőben",
      "blocked": "Blokkolt",
      "deleted": "Törölve"
    }
  }
}
```

**File: `staff-web/src/i18n/locales/en.json`**
```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "next": "Next",
    "submit": "Submit",
    "search": "Search",
    "filter": "Filter",
    "language": "Language"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "signIn": "Sign In",
    "signingIn": "Signing in...",
    "wrongCredentials": "Wrong credentials. {{remaining}} attempt(s) remaining.",
    "tooManyAttempts": "Too many failed attempts. Redirecting...",
    "fillAllFields": "Please fill in all fields"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome",
    "activePassesTitle": "Active Passes",
    "activePasses": "Active Pass",
    "totalUsersTitle": "Total Users",
    "totalUsers": "User",
    "todayScansTitle": "Today's Check-ins",
    "todayScans": "Check-in Today",
    "recentActivity": "Recent Activity",
    "quickActions": "Quick Actions",
    "scanPass": "Scan Pass",
    "createPass": "New Pass",
    "viewUsers": "Users",
    "viewHistory": "History",
    "gymInfo": "Gym Info"
  },
  "scanner": {
    "title": "Pass Scanner",
    "scanQR": "Scan QR Code",
    "enterManually": "Enter Manually",
    "passId": "Pass ID",
    "validate": "Validate",
    "validating": "Validating...",
    "valid": "Valid Pass",
    "invalid": "Invalid Pass",
    "expired": "Expired Pass",
    "noEntriesLeft": "No entries left"
  },
  "passes": {
    "title": "Passes",
    "createNew": "Create New Pass",
    "passType": "Pass Type",
    "selectUser": "Select User",
    "purchaseDate": "Purchase Date",
    "validUntil": "Valid Until",
    "entriesLeft": "Entries Left",
    "status": "Status",
    "active": "Active",
    "expired": "Expired",
    "used": "Used"
  },
  "users": {
    "title": "Users",
    "addNew": "Add New User",
    "name": "Name",
    "email": "Email",
    "phone": "Phone",
    "registeredAt": "Registered At",
    "totalPasses": "Total Passes",
    "activePasses": "Active Passes"
  },
  "history": {
    "title": "History",
    "scanHistory": "Scan History",
    "date": "Date",
    "user": "User",
    "passType": "Pass Type",
    "action": "Action",
    "checkin": "Check-in",
    "checkout": "Check-out"
  },
  "landing": {
    "title": "{{gymName}} Fitness",
    "tagline": "Your fitness journey starts here",
    "downloadApp": "Download the App",
    "availableOn": "Available on iOS and Android",
    "features": {
      "passes": {
        "title": "Flexible Passes",
        "description": "Weekly, monthly, or entry-based options"
      },
      "wallet": {
        "title": "Digital Wallet",
        "description": "Add passes to Apple Wallet"
      },
      "checkin": {
        "title": "Quick Check-in",
        "description": "Fast QR code scanning"
      }
    }
  },
  "admin": {
    "title": "Platform Administration",
    "gyms": "Gyms",
    "gymDetails": "Gym Details",
    "subscription": "Subscription",
    "businessInfo": "Business Information",
    "actions": "Actions",
    "block": "Block",
    "unblock": "Unblock",
    "delete": "Delete",
    "status": {
      "active": "Active",
      "pending": "Pending",
      "blocked": "Blocked",
      "deleted": "Deleted"
    }
  }
}
```

#### 4. Initialize i18n in App

**File: `staff-web/src/main.tsx`**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/config'; // Import i18n config BEFORE App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### 5. Create Language Selector Component

**File: `staff-web/src/components/LanguageSelector.tsx`**
```typescript
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import '../styles/LanguageSelector.css';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    Cookies.set('lang', lng, { expires: 365, path: '/' });
  };

  return (
    <div className="language-selector">
      <label>{t('common.language')}:</label>
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="lang-dropdown"
      >
        <option value="hu">Magyar (HU)</option>
        <option value="en">English (EN)</option>
      </select>
    </div>
  );
}
```

**File: `staff-web/src/styles/LanguageSelector.css`**
```css
.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.language-selector label {
  color: #666;
  font-weight: 500;
}

.lang-dropdown {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: border-color 0.2s;
}

.lang-dropdown:hover {
  border-color: #667eea;
}

.lang-dropdown:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
```

#### 6. Update Components to Use Translations

**Example: `staff-web/src/screens/LoginScreen.tsx`**
```typescript
import { useTranslation } from 'react-i18next';
// ... other imports

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useTranslation();
  // ... existing state

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">GymPass Staff</h1>
        <p className="login-subtitle">{t('auth.signIn')}</p>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="staff@gym.local"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder={t('auth.password')}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        {/* Add language selector */}
        <div style={{ marginTop: '20px' }}>
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
}
```

### Repeat for All Apps

1. **Registration Portal** (vanilla JS):
   - Store lang in cookie manually
   - Load translations from JSON files
   - Simple dropdown selector

2. **Mobile App** (React Native):
   ```bash
   cd mobile
   npm install i18next react-i18next @react-native-async-storage/async-storage
   ```
   - Use AsyncStorage instead of cookies
   - Same translation structure
   - Language selector in settings

### Quick Implementation Checklist

- [ ] Create translation files (hu.json, en.json) for staff-web
- [ ] Update `main.tsx` to import i18n config
- [ ] Create LanguageSelector component
- [ ] Add LanguageSelector to all major screens
- [ ] Replace hardcoded strings with `t('key')` calls
- [ ] Test language switching (should persist after refresh)
- [ ] Repeat for registration-portal (simpler, vanilla JS)
- [ ] Repeat for mobile app (use AsyncStorage)

---

## Environment Variables Summary

Create `backend/.env`:
```env
# Existing vars...
JWT_SECRET=your-secret-here
PORT=4000

# NEW: Stripe vars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

## Testing Checklist

### Stripe
- [ ] Gym registration redirects to Stripe Checkout
- [ ] Payment success activates gym (status: PENDING → ACTIVE)
- [ ] Payment cancel allows retry
- [ ] Webhook updates subscription status
- [ ] Admin portal shows subscription info
- [ ] PENDING gyms cannot access staff portal

### i18n
- [ ] Default language is HU on first visit
- [ ] Language selector works on all pages
- [ ] Selected language persists after refresh
- [ ] All UI text is translated (no English visible by default)
- [ ] Mobile app also defaults to HU

## No Regressions
- [ ] Tenant routing still works (subdomain.gym.local)
- [ ] Staff login path still works
- [ ] Platform admin /admin still works
- [ ] Existing gyms still work (ACTIVE status)
- [ ] Mobile app still connects to backend





