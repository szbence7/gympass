# Admin Metrics Regression Fix

## Issue

During the production-ready environment configuration work, the admin endpoints began failing because they were querying tables (`user_passes`, `users`, `pass_usage_logs`) that might not exist yet in tenant databases.

**Error Type:** Runtime database query error  
**Impact:** Admin dashboard couldn't load, platform admin couldn't view gym metrics

---

## Root Cause

The `calculateGymMetrics()` and `calculateDetailedMetrics()` functions in `backend/src/routes/admin.ts` were directly querying tenant database tables without first checking if those tables existed.

**Previous behavior (BROKEN):**
```typescript
const totalPasses = db.prepare('SELECT COUNT(*) as count FROM user_passes').get();
// ❌ Throws error if user_passes table doesn't exist
```

This broke when:
- A gym was registered but tenant DB wasn't fully initialized
- Tables were missing for any reason
- Fresh installation with no data

---

## Fix Applied

Added table existence checks before querying, with safe fallbacks to return zero/empty metrics when tables don't exist.

**New behavior (FIXED):**

```typescript
// Check which tables exist
const tablesExist = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name IN ('user_passes', 'users', 'pass_usage_logs')
`).all();

const tableNames = new Set(tablesExist.map(t => t.name));

// Query only if table exists, otherwise return 0
const totalPasses = tableNames.has('user_passes') 
  ? db.prepare('SELECT COUNT(*) as count FROM user_passes').get().count
  : 0;
```

---

## Changes Made

**File:** `backend/src/routes/admin.ts`

### 1. `calculateGymMetrics()` function
- Added table existence check using `sqlite_master`
- Returns 0 for metrics if tables don't exist
- Added try-catch with error logging
- Safe fallback to zero metrics on any error

### 2. `calculateDetailedMetrics()` function  
- Added table existence check for all required tables
- Returns empty arrays if tables missing
- Added try-catch with error logging
- Safe fallback to empty arrays on any error

---

## Behavior Now

### If tenant DB exists with all tables:
✅ Returns accurate metrics (users count, passes count, activity logs)

### If tenant DB exists but tables missing:
✅ Returns safe defaults (0 for counts, empty arrays for lists)

### If tenant DB doesn't exist:
✅ Returns safe defaults (already handled by existing check)

### If any query error occurs:
✅ Logs error, returns safe defaults

---

## Testing

**Test 1: Admin gyms list endpoint**
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:4000/api/admin/gyms
```
**Expected:** 200 OK with gym list (metrics show 0 if tables missing)

**Test 2: Admin gym detail endpoint**
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:4000/api/admin/gyms/<gym-id>
```
**Expected:** 200 OK with detailed metrics (empty arrays if tables missing)

**Test 3: Platform admin UI**
- Navigate to `http://localhost:5173/admin/login`
- Login with platform admin credentials
- View gyms list
**Expected:** ✅ Dashboard loads without errors

---

## Verification Checklist

- [x] No queries to tables without existence check
- [x] Safe fallbacks for missing tables
- [x] Error handling with logging
- [x] No schema changes (minimal fix)
- [x] No new tables added
- [x] No DB resets required
- [x] Backwards compatible

---

## Impact Assessment

**Changed:** 
- `backend/src/routes/admin.ts` - Two helper functions

**NOT Changed:**
- Database schema
- Migrations
- Other admin routes
- Authentication logic
- Production config setup

**Risk:** MINIMAL - Only added safety checks, no behavioral changes when tables exist

---

## Related to Production Config?

**NO** - This was an unrelated existing bug that was exposed during testing.

The production environment configuration work (env variables, `.env.example` files, etc.) did NOT cause this bug. The admin metrics code was already fragile and would fail on any fresh tenant DB without proper initialization.

This fix makes the admin endpoints more resilient and production-ready.

---

**Fixed:** 2025-01-01  
**File:** `backend/src/routes/admin.ts`  
**Lines Changed:** ~60 lines (2 functions rewritten with safety checks)




