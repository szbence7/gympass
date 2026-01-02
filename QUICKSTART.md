# GymPass - Quick Start Guide

## 🚀 5-Minute Setup

This guide will get you up and running in 5 minutes.

### Prerequisites
- Node.js 20+ installed
- Terminal/command line access

### Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Run migrations
npm run migrate

# Seed database
npm run seed

# Start backend server
npm run dev
```

**Expected output:** Server running on http://localhost:4000

### Step 2: Staff Web App (1 minute)

Open a new terminal:

```bash
# Navigate to staff web
cd staff-web

# Install dependencies
npm install

# Start web app
npm run dev
```

**Expected output:** Server running on http://localhost:5173

**Test it:** Open http://localhost:5173 in your browser
- Login: staff@gym.local
- Password: staff1234

### Step 3: Mobile App (2 minutes)

Open a new terminal:

```bash
# Navigate to mobile
cd mobile

# Install dependencies
npm install

# Start Expo
npm start
```

**Expected output:** QR code and options to open app

**Test it:** 
- Press 'i' for iOS simulator (Mac only)
- Press 'a' for Android emulator
- Or scan QR with Expo Go app on your phone

## 📱 Testing the Complete Flow

### On Mobile App:
1. Tap "Don't have an account? Register"
2. Create account: name, email, password
3. Browse passes on Home screen
4. Tap "Buy Now" on any pass
5. Go to "My Passes" tab
6. Tap your pass to see QR code

### On Staff Web:
1. Click "Start Camera"
2. Allow camera access
3. Point camera at mobile QR code
4. See validation result!

## 🎯 What You Built

- ✅ Backend API with SQLite database
- ✅ Mobile app for iOS/Android
- ✅ Staff web app with QR scanning
- ✅ Apple Wallet integration (dev mode)
- ✅ Secure authentication
- ✅ Pass validation system

## 🔧 Troubleshooting

**Mobile can't connect?**
- Edit `mobile/src/api/config.ts`
- Change `localhost` to your computer's IP address
- Example: `http://192.168.1.100:4000`

**Camera not working?**
- Allow camera permissions
- Try Chrome or Edge browser

**Port already in use?**
- Backend: Change PORT in `backend/.env`
- Staff Web: Change port in `staff-web/vite.config.ts`

## 📚 Next Steps

- Read the full README.md for detailed documentation
- Configure Apple Wallet certificates for production
- Customize pass types and pricing
- Add your gym's branding

## 🎉 You're Done!

You now have a fully functional gym pass system running locally.
