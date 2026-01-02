# GymPass - Multi-Tenant SaaS Gym Management System

A full-stack **multi-tenant SaaS** gym membership system with React Native mobile app (iOS/Android), Staff web app, Node.js backend, and Apple Wallet integration.

**🆕 Now Multi-Tenant**: Each gym gets its own isolated database with subdomain-based access.

## 📁 Project Structure

```
gympass/
├── backend/                    # Node.js + Express + SQLite backend
│   └── data/
│       ├── registry.db        # Global gym registry
│       └── gyms/              # Per-gym databases
│           ├── default.db     # Default gym
│           └── <slug>.db      # Tenant databases
├── mobile/                     # React Native (Expo) mobile app
├── staff-web/                  # React + Vite staff web app
├── registration-portal/        # Gym registration portal
└── README.md
```

## 🚀 Features

### Multi-Tenant SaaS
- **Database-per-Tenant**: Complete isolation per gym
- **Subdomain-Based**: Each gym gets `<gymslug>.gym.local`
- **Registration Portal**: Easy gym onboarding
- **Auto-Provisioning**: DB creation, schema init, default data
- **Admin Account**: Auto-generated per gym

### Core Features

### Mobile App (iOS/Android)
- User registration and authentication
- Browse and purchase gym passes (Weekly, Monthly, 10-Entry)
- View active passes with QR codes
- Add passes to Apple Wallet (iOS)
- Track remaining entries and expiration dates

### Staff Web App
- Staff authentication
- Dashboard with recent check-ins and analytics
- QR code scanning via device camera
- Real-time pass validation
- Automatic entry consumption for entry-based passes
- View scan history
- **User Management:**
  - Search and filter users
  - View user profiles and pass history
  - Block/unblock users
  - Revoke/restore individual passes
  - Delete users (with safety confirmation)

### Backend API
- REST API with JWT authentication
- SQLite database with migrations
- Secure pass token system (not exposing IDs)
- Apple Wallet .pkpass generation (signed or unsigned dev mode)
- Role-based access control (USER/STAFF)
- Complete audit logging

## 📋 Prerequisites

- **Node.js** 20+ and npm
- **For Mobile Development:**
  - Install [Expo CLI](https://docs.expo.dev/get-started/installation/)
  - iOS Simulator (Mac only) or Android Emulator
  - Expo Go app on physical device (optional)
- **For Apple Wallet (Production):**
  - Apple Developer Account
  - Pass Type ID certificate
  - WWDR certificate

## 🛠️ Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from env.example)
cp env.example .env

# Edit .env and configure:
# - JWT_SECRET (use a strong secret)
# - WALLET_DEV_UNSIGNED=true (for development)
# - Other wallet settings for production

# Run database migrations
npm run migrate

# Seed the database (creates pass types and staff user)
npm run seed

# Run user management migration (if upgrading existing database)
sqlite3 gympass.db < src/db/add-user-blocked.sql

# Start development server
npm run dev
```

The backend will run on `http://localhost:4000`

**Seeded Credentials:**
- **Staff** (for staff-web app):
  - Email: `staff@gym.local`
  - Password: `staff1234`
- **Guest User** (for mobile app testing):
  - Email: `guest@gym.local`
  - Password: `guest1234`

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Update API URL if needed
# Edit src/api/config.ts and change API_BASE_URL
# For real device on same network: http://YOUR_LOCAL_IP:4000
# For simulator/emulator: http://localhost:4000 works

# Start Expo development server
npm start

# Then press:
# - 'i' for iOS simulator
# - 'a' for Android emulator
# - Scan QR with Expo Go app on physical device
```

**For physical devices:** Update `src/api/config.ts` to use your computer's LAN IP address instead of localhost.

**Test with seeded guest user:**
- Email: `guest@gym.local`
- Password: `guest1234`

Or create a new account by tapping "Register" on the login screen.

### 3. Staff Web App Setup

```bash
cd staff-web

# Install dependencies
npm install

# Start development server
npm run dev
```

The staff web app will run on `http://localhost:5173`

**Login with:**
- Email: `staff@gym.local`
- Password: `staff1234`

## 📱 Testing the Complete Flow

### End-to-End Test Scenario

1. **Start all three apps:**
   - Backend: `cd backend && npm run dev`
   - Mobile: `cd mobile && npm start`
   - Staff Web: `cd staff-web && npm run dev`

2. **Mobile App - User Flow:**
   - Open mobile app
   - Register a new account (email/password/name)
   - Browse available passes on Home screen
   - Purchase a pass (e.g., "10-Entry Pass")
   - Navigate to "My Passes" tab
   - Tap on the purchased pass
   - View the QR code

3. **Staff Web - Validation Flow:**
   - Open `http://localhost:5173` in browser
   - Login with `staff@gym.local` / `staff1234`
   - Click "Start Camera" (allow camera access)
   - Scan the QR code from the mobile app
   - See validation result:
     - **VALID** with member info and pass details
     - For 10-Entry pass: entry is auto-consumed
   - Click "View History" to see scan logs

4. **Apple Wallet (iOS only):**
   - On iOS device, go to Pass Details screen
   - Tap "Add to Apple Wallet"
   - The .pkpass file will be shared
   - **Note:** In dev mode (WALLET_DEV_UNSIGNED=true), the pass is unsigned and won't install. For real installation, see Production Setup below.

## 🔐 Security Model

### QR Token System
- QR codes contain secure random tokens (not pass IDs)
- Format: `gympass://scan?token=<RANDOM_TOKEN>`
- Tokens are 32+ bytes, base64url encoded
- Tokens map to passes via `pass_tokens` table
- Prevents direct pass ID exposure

### Authentication
- JWT tokens for both users and staff
- Separate authentication endpoints
- Role-based access control
- Passwords hashed with bcrypt (10 rounds)

## 🎫 Apple Wallet Integration

### Development Mode (Default)
The backend is configured with `WALLET_DEV_UNSIGNED=true` by default. This generates unsigned .pkpass files that show the structure but won't install on devices.

### Production Setup

To generate real, installable Apple Wallet passes:

1. **Obtain Certificates from Apple:**
   - Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
   - Create a Pass Type ID (e.g., `pass.com.yourdomain.gympass`)
   - Generate a Pass Type ID Certificate
   - Download the WWDR (Worldwide Developer Relations) certificate

2. **Export Certificates:**
   - Export Pass Type ID cert as `.p12` file with password
   - Convert WWDR to `.pem` format

3. **Configure Backend:**
   ```env
   WALLET_DEV_UNSIGNED=false
   WALLET_TEAM_ID=YOUR_TEAM_ID
   WALLET_PASS_TYPE_ID=pass.com.yourdomain.gympass
   WALLET_ORG_NAME=Your Gym Name
   WALLET_CERT_P12_PATH=./certs/signerCert.p12
   WALLET_CERT_P12_PASSWORD=your_p12_password
   WALLET_WWDR_CERT_PATH=./certs/wwdr.pem
   ```

4. **Place certificates in `backend/certs/` directory**

5. **Restart backend** - now .pkpass files will be properly signed

### Wallet Pass Assets
Placeholder images are included in `backend/assets/wallet/`. For production:
- Replace `icon.png` with 58x58px image
- Replace `logo.png` with 320x100px image
- Use your gym's branding

## 🗄️ Database Schema

### Tables
- **users** - Mobile app users
- **staff_users** - Staff accounts
- **pass_types** - Pass definitions (Weekly, Monthly, 10-Entry)
- **user_passes** - Purchased passes
- **pass_tokens** - Secure QR tokens
- **pass_usage_logs** - Audit trail (scan/consume actions)

### Pass Types (Seeded)
1. **Weekly Pass** - $29.99, 7 days, unlimited entries
2. **Monthly Pass** - $99.99, 30 days, unlimited entries
3. **10-Entry Pass** - $79.99, 10 entries, 90-day validity

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/staff/login` - Staff login

### Pass Management (User)
- `GET /api/pass-types` - List available pass types
- `POST /api/passes/purchase` - Purchase a pass
- `GET /api/passes/me` - Get my passes
- `GET /api/passes/:id` - Get pass details
- `GET /api/passes/:id/wallet` - Download .pkpass file

### Staff Operations
- `POST /api/staff/scan` - Scan and validate pass
- `POST /api/staff/consume` - Manually consume entries
- `GET /api/staff/history` - View scan history

## 🔄 Pass Status Flow

```
ACTIVE → EXPIRED (when validUntil is reached)
       → DEPLETED (when remainingEntries = 0)
       → REVOKED (manual staff action)
```

### Validation Logic
- **Weekly/Monthly passes:** Valid if status=ACTIVE and current date ≤ validUntil
- **Entry-based passes:** Valid if status=ACTIVE, remainingEntries > 0, and current date ≤ validUntil
- **Auto-consume:** TEN_ENTRY passes automatically consume 1 entry on scan

## 🏗️ Technology Stack

### Backend
- Node.js + Express
- TypeScript
- SQLite + better-sqlite3
- Drizzle ORM
- JWT + bcrypt
- Zod validation
- passkit-generator

### Mobile
- React Native (Expo)
- TypeScript
- React Navigation
- Axios
- expo-secure-store
- react-native-qrcode-svg
- expo-file-system + expo-sharing

### Staff Web
- React + TypeScript
- Vite
- React Router
- Axios
- @zxing/browser (QR scanning)

## 🐛 Troubleshooting

### Mobile app can't connect to backend
- Check `mobile/src/api/config.ts` API_BASE_URL
- For physical device: use your computer's LAN IP (e.g., `http://192.168.1.100:4000`)
- Ensure backend is running and accessible
- Check CORS settings in `backend/src/app.ts`

### Camera not working in staff web
- Grant camera permissions when prompted
- Use HTTPS in production (browsers require secure context for camera)
- Try a different browser (Chrome/Edge recommended)

### Apple Wallet pass won't install
- Ensure `WALLET_DEV_UNSIGNED=false`
- Verify certificates are valid and properly configured
- Check that Pass Type ID matches certificate
- Review backend logs for signing errors

### Database errors
- Delete `backend/gympass.db` and re-run migrations/seed
- Ensure SQLite is working: `npm run migrate`

## 📦 Building for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Mobile App
```bash
cd mobile
# iOS
eas build --platform ios

# Android
eas build --platform android
```

### Staff Web
```bash
cd staff-web
npm run build
# Deploy 'dist' folder to static hosting
```

## 🔒 Security Checklist for Production

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS for backend
- [ ] Configure proper CORS origins
- [ ] Use real Apple certificates for Wallet
- [ ] Implement rate limiting
- [ ] Add input validation on all endpoints
- [ ] Enable database backups
- [ ] Use secure session management
- [ ] Implement proper error handling (don't expose stack traces)

## 📄 License

This is a demo/MVP project. Use at your own risk.

## 🤝 Support

For issues or questions, please review the code and API documentation above.

## 🎯 Future Enhancements (Not Implemented)

- Real payment integration (Stripe, etc.)
- Push notifications for pass expiry
- Admin dashboard for managing staff and passes
- Pass renewal/upgrade flows
- Analytics and reporting
- Multi-gym/location support
- Social login integration
- Password reset functionality
