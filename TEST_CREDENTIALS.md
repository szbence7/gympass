# Test Credentials

Quick reference for all seeded test accounts.

## 🔐 Seeded Accounts

### Staff Account (for Staff Web App)
Use these credentials to login to the staff-web portal at `http://localhost:5173`

```
Email:    staff@gym.local
Password: staff1234
```

**Purpose:** Access staff dashboard, scan QR codes, view history, create passes

---

### Guest User Account (for Mobile App)
Use these credentials to test the mobile app (iOS/Android)

```
Email:    guest@gym.local
Password: guest1234
```

**Purpose:** Test mobile app features:
- Login/Register flow
- Browse pass types
- Purchase passes
- View My Passes
- Display QR codes
- Add to Apple Wallet (iOS)

---

## 🚀 Quick Start

### Backend
```bash
cd backend
npm run seed    # Creates these test accounts
npm run dev     # Start API server
```

### Staff Web
```bash
cd staff-web
npm run dev     # Open http://localhost:5173
# Login with: staff@gym.local / staff1234
```

### Mobile App
```bash
cd mobile
npm start       # Press 'i' for iOS, 'a' for Android
# Login with: guest@gym.local / guest1234
```

---

## 📝 Notes

- These accounts are created automatically when you run `npm run seed` in the backend
- The passwords are hashed using bcrypt in the database
- You can create additional accounts through:
  - **Mobile users:** Register in the mobile app
  - **Staff users:** Create via backend seed script (edit `backend/src/db/seed.ts`)

---

## 🔄 Reset Test Data

If you need to start fresh:

```bash
cd backend

# Delete database
rm gympass.db gympass.db-shm gympass.db-wal

# Recreate schema and seed data
npm run migrate
npm run seed
```

This will reset all data and recreate the test accounts.

---

## 🎯 Testing Workflow

### 1. Test Mobile App
1. Login with `guest@gym.local` / `guest1234`
2. Purchase a pass (e.g., "10-Entry Pass")
3. Go to "My Passes" tab
4. Tap on the pass to view QR code

### 2. Test Staff Web
1. Login with `staff@gym.local` / `staff1234`
2. View dashboard (see recent activity)
3. Go to Scanner
4. Scan the QR code from mobile app
5. Verify pass is validated and entry consumed

### 3. Verify Integration
- After scanning in staff-web, return to mobile app
- Refresh "My Passes"
- Verify remaining entries decreased
- Check staff-web History tab for scan log

---

**All test credentials are for development only!**




