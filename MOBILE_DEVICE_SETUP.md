# Running Mobile App on Real Devices - Quick Fix

## 🐛 Problem

The app shows: **"Cannot connect to server"** when running on a real device (iPhone/Android).

## ✅ Solution

### Why This Happens
- `localhost` on a real device refers to the **device itself**, not your computer
- The app needs your computer's **LAN IP address** to connect to the backend

### Quick Fix (2 steps)

#### 1. Find Your Computer's LAN IP

**macOS/Linux:**
```bash
ipconfig getifaddr en0
# Example output: 192.168.1.100
```

**Windows:**
```cmd
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

#### 2. Set Environment Variable

**Before starting Expo, set the API URL:**

```bash
# Replace 192.168.1.100 with YOUR actual LAN IP
export EXPO_PUBLIC_API_URL=http://192.168.1.100:4000

# Then start Expo
cd mobile
npx expo start -c
```

**Alternative: Create `.env` file**

```bash
cd mobile
cp .env.example .env
# Edit .env and add your LAN IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

---

## 🔄 Auto-Detection (No Config Needed)

The app **automatically detects** the correct URL when:
- ✅ Running in iOS Simulator (uses `localhost`)
- ✅ Running in Android Emulator (uses `10.0.2.2`)
- ✅ Running on real device via Expo Go (derives host from Expo dev server)

**Only set `EXPO_PUBLIC_API_URL` if auto-detection fails or you want to override.**

---

## 🧪 Testing

### Verify Backend is Running
```bash
cd backend
npm run dev
# Should show: "🚀 GymPass SaaS - Server Started Successfully"
# Port: 4000
```

### Start Mobile App
```bash
cd mobile
npx expo start -c
```

### Check Console Output
You should see:
```
📡 API Base URL: http://192.168.1.100:4000
```

### Test on Device
1. Open Expo Go app on your phone
2. Scan QR code
3. App should load gym selection screen
4. Gyms list should load successfully

---

## ❌ Common Issues

### "Cannot connect to server"
- ✅ Ensure backend is running (`npm run dev` in `/backend`)
- ✅ Ensure your phone and computer are on the **same WiFi network**
- ✅ Check firewall isn't blocking port 4000
- ✅ Verify your LAN IP is correct

### "Network request failed"
- ✅ Try restarting Expo dev server
- ✅ Try restarting backend
- ✅ Ensure no VPN is active on your phone or computer

### Auto-detection not working
- ✅ Set `EXPO_PUBLIC_API_URL` explicitly
- ✅ Verify the environment variable is set before starting Expo

---

## 🔍 How It Works

The app determines the API URL in this order:

1. **`EXPO_PUBLIC_API_URL` env var** (if set) - highest priority
2. **Auto-detect from Expo host** (for real devices via Expo Go)
3. **Android emulator special case** (`10.0.2.2:4000`)
4. **Localhost fallback** (for iOS simulator)

See: `mobile/src/api/config.ts`

---

## 💡 Tips

- Your LAN IP may change when switching networks
- Update `EXPO_PUBLIC_API_URL` if your IP changes
- For production, you'll use a real domain name (not LAN IP)
- The backend logs the URL on startup - check terminal output

---

## 🚀 Quick Commands

```bash
# 1. Find your IP
ipconfig getifaddr en0

# 2. Set env var (replace IP)
export EXPO_PUBLIC_API_URL=http://192.168.1.100:4000

# 3. Start backend
cd backend && npm run dev

# 4. Start mobile (in new terminal)
cd mobile && npx expo start -c
```

**That's it! Your app should now connect successfully.** 🎉



