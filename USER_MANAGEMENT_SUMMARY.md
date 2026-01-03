# User Management - Quick Summary

## What Was Added

**Staff-web now has User Management:**
- **Users list page** (`/users`) - Search, filter, view all users
- **User detail page** (`/users/:id`) - View user info and all their passes
- **Actions**: Block/Unblock users, Delete users, Revoke/Restore passes

## Quick Start

### 1. Run Migration
```bash
cd backend
sqlite3 gympass.db < src/db/add-user-blocked.sql
```

### 2. Start Services
```bash
# At repo root:
npm run gym:api
```

### 3. Test It
1. Login as staff: `staff@gym.local` / `admin123`
2. Click "Users" button in navigation
3. Try searching, filtering, viewing details
4. Test block/unblock on a user (e.g., `guest@gym.local`)

## Key Features

✅ **Search & Filter**
- Search by name/email
- Filter: active pass only, blocked only
- View stats: total users, active passes, blocked count

✅ **User Management**
- View complete user profile
- Block/Unblock users
- Delete users (with safety confirmation)
- View all user's passes

✅ **Pass Management**
- Revoke individual passes
- Restore revoked passes
- See full pass history per user

✅ **Security Enforced**
- Blocked users can't login
- Blocked users can't purchase passes
- Blocked users can't use passes (validation fails)
- All endpoints require STAFF auth

## Files Changed

**Backend (5 files):**
- `backend/src/db/schema.ts` - Added `isBlocked` field
- `backend/src/db/add-user-blocked.sql` - Migration
- `backend/src/routes/staff.ts` - User management endpoints
- `backend/src/routes/auth.ts` - Block check on login
- `backend/src/services/passService.ts` - Block enforcement

**Frontend (8 files):**
- `staff-web/src/screens/UsersScreen.tsx` - List page (NEW)
- `staff-web/src/screens/UserDetailScreen.tsx` - Detail page (NEW)
- `staff-web/src/styles/Users.css` - Styling (NEW)
- `staff-web/src/api/client.ts` - API methods
- `staff-web/src/App.tsx` - Routes
- Navigation updates in Dashboard, Scanner, History, CreatePass screens

## New API Endpoints (STAFF-only)

```
GET    /api/staff/users              - List users (with filters)
GET    /api/staff/users/:id          - Get user details
POST   /api/staff/users/:id/block    - Block user
POST   /api/staff/users/:id/unblock  - Unblock user
DELETE /api/staff/users/:id          - Delete user
POST   /api/staff/passes/:id/revoke  - Revoke pass
POST   /api/staff/passes/:id/restore - Restore pass
```

## Test Scenario

1. **Block a user:**
   - Go to Users → Find `guest@gym.local` → View Details
   - Click "Block User" → Confirm
   - Try to login as guest on mobile → Should fail

2. **Check pass validation:**
   - Guest has an active pass
   - Staff scans guest's QR code → Should fail (user blocked)

3. **Unblock:**
   - Click "Unblock User" → Confirm
   - Login as guest → Works
   - Scan pass → Works

4. **Revoke a pass:**
   - View user's passes → Click "Revoke Pass" on an active pass
   - Try to scan that pass → Should fail (pass revoked)
   - Click "Restore Pass" → Pass works again

5. **Delete user:**
   - Click "Delete User"
   - Type the user's email exactly to confirm
   - User and all their passes/tokens/logs are deleted

## Existing Features Unaffected

✅ Staff login
✅ Camera scanner
✅ Pass validation
✅ Consume entry
✅ History
✅ Dashboard
✅ Create pass
✅ Mobile app (for non-blocked users)

## No Breaking Changes

- Existing API contracts unchanged
- Existing features work as before
- Migration is safe (adds column with default value)
- Minimal code changes only





