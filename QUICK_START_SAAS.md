# Quick Start - Multi-Tenant SaaS

## 🚀 Your System is Now Multi-Tenant!

Each gym gets its own isolated database. Here's how to use it:

---

## ✅ What Changed

**Before:**
- One database for everyone
- `http://localhost:4000`

**After:**
- One database per gym
- `http://<gymslug>.gym.local:4000`
- Registration portal for new gyms

---

## 📋 Quick Test (5 minutes)

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Test Default Gym (Your Existing Data)
```bash
# Open staff portal
open http://localhost:5173

# Login with existing credentials
Email: staff@gym.local
Password: admin123

# Everything works as before!
```

### 3. Register a New Gym
```bash
# Open registration portal
open registration-portal/index.html

# Fill the form:
Gym Name: Test Fitness
Slug: testgym

# Click "Create Gym"
# SAVE THE ADMIN CREDENTIALS SHOWN!
```

### 4. Add to /etc/hosts
```bash
sudo nano /etc/hosts

# Add this line:
127.0.0.1  testgym.gym.local

# Save and exit (Ctrl+O, Enter, Ctrl+X)
```

### 5. Access New Gym
```bash
# Open new gym's staff portal
open http://testgym.gym.local:5173

# Login with the admin credentials from step 3
# You'll see an empty gym - completely isolated!
```

---

## 🏗️ How It Works

```
Request: http://acmegym.gym.local:4000/api/auth/login
              ↓
Extracts subdomain: "acmegym"
              ↓
Loads DB: backend/data/gyms/acmegym.db
              ↓
All queries run on acmegym's DB only
```

**Complete isolation - no gym can see another gym's data!**

---

## 📱 Mobile App Setup

For each gym, update the API URL:

```typescript
// mobile/src/api/config.ts
export const API_BASE_URL = 'http://testgym.gym.local:4000';
```

Then rebuild the mobile app.

---

## 🆕 New API Endpoints

### Register a Gym
```bash
curl -X POST http://localhost:4000/api/gyms/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Gym",
    "slug": "mygym"
  }'
```

### List All Gyms
```bash
curl http://localhost:4000/api/gyms
```

---

## 🗂️ File Structure

```
backend/data/
├── registry.db          # Global gym registry
└── gyms/
    ├── default.db       # Your existing data
    ├── testgym.db       # New gym 1
    └── acmegym.db       # New gym 2
```

Each `.db` file is a complete, isolated gym database.

---

## ✅ Testing Isolation

1. **Login to default gym** (localhost:5173)
   - See your existing users/passes

2. **Login to testgym** (testgym.gym.local:5173)
   - See empty data (new gym!)

3. **Create a pass in testgym**
   - It won't appear in default gym
   - Complete isolation confirmed! ✅

---

## 🔧 Troubleshooting

### "Tenant database not found"
**Fix:** Register the gym first via registration portal

### "Can't access testgym.gym.local"
**Fix:** Add to `/etc/hosts`: `127.0.0.1  testgym.gym.local`

### "Wrong gym's data showing"
**Fix:** Clear browser cache or use incognito mode

---

## 📚 Full Documentation

See `MULTI_TENANCY_IMPLEMENTATION.md` for complete details.

---

## 🎯 Summary

✅ Existing data works at `localhost` (default gym)  
✅ New gyms get their own subdomain  
✅ Complete database isolation  
✅ Registration portal for easy gym creation  
✅ All existing features work unchanged  

**You're now running a multi-tenant SaaS!** 🚀




