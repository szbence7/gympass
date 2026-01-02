# User Management Implementation

## Overview
Added comprehensive User Management features to the staff-web app, allowing staff to view, manage, block/unblock, and delete users.

## Files Changed/Added

### Backend Changes (4 files)

1. **`backend/src/db/schema.ts`** - Added `isBlocked` field to users table
   - Added: `isBlocked: integer('is_blocked', { mode: 'boolean' }).notNull().default(false)`

2. **`backend/src/db/add-user-blocked.sql`** - Migration script (NEW)
   - Adds `is_blocked` column to existing users table
   - Run: `cd backend && sqlite3 gympass.db < src/db/add-user-blocked.sql`

3. **`backend/src/routes/staff.ts`** - Enhanced user endpoints
   - **Modified** `GET /api/staff/users` - Now returns:
     - User details with `isBlocked` and `createdAt`
     - Active pass information (`hasActivePass`, `activePassSummary`)
     - Query parameters: `?query=text&activePassOnly=true&blockedOnly=true`
   
   - **Added** `GET /api/staff/users/:id` - Get user detail with all passes
   - **Added** `POST /api/staff/users/:id/block` - Block a user
   - **Added** `POST /api/staff/users/:id/unblock` - Unblock a user
   - **Added** `DELETE /api/staff/users/:id` - Delete user (cascades to passes, tokens, logs)
   - **Added** `POST /api/staff/passes/:id/revoke` - Revoke (block) a specific pass
   - **Added** `POST /api/staff/passes/:id/restore` - Restore (unblock) a specific pass

4. **`backend/src/routes/auth.ts`** - Added blocked user check
   - Login now rejects blocked users with message: "Account is blocked. Please contact support."

5. **`backend/src/services/passService.ts`** - Enforce blocked status
   - `validatePassByToken()` - Returns invalid if user is blocked
   - `purchasePass()` - Prevents blocked users from purchasing passes

### Frontend Changes (8 files)

6. **`staff-web/src/screens/UsersScreen.tsx`** - User list page (NEW)
   - Search by name/email
   - Filter: active pass only, blocked only
   - Table showing: name, email, registered date, active pass status, user status
   - Actions: View details button for each user
   - Shows stats: Total users, Active passes count, Blocked count

7. **`staff-web/src/screens/UserDetailScreen.tsx`** - User detail page (NEW)
   - Shows full user profile (name, email, role, status, registered date, ID)
   - Lists all user's passes with details (type, status, validity, entries)
   - Actions:
     - Block/Unblock user (with confirmation)
     - Delete user (requires typing email for confirmation)
     - Revoke/Restore individual passes (with confirmation)

8. **`staff-web/src/styles/Users.css`** - Styling for user management (NEW)
   - Clean, modern design consistent with existing staff-web UI
   - Responsive layout for mobile/tablet/desktop
   - Color-coded status badges (active, blocked, revoked, expired, depleted)

9. **`staff-web/src/api/client.ts`** - API methods
   - Updated `User` interface with new fields
   - Added `UserDetail` interface
   - Updated `getUsers()` with filter parameters
   - Added `getUserById(userId)`
   - Added `blockUser(userId)`
   - Added `unblockUser(userId)`
   - Added `deleteUser(userId)`
   - Added `revokePass(passId)`
   - Added `restorePass(passId)`

10. **`staff-web/src/App.tsx`** - Routes
    - Added: `/users` → UsersScreen
    - Added: `/users/:id` → UserDetailScreen

11-14. **Navigation updates** - Added "Users" link to:
    - `staff-web/src/screens/DashboardScreen.tsx`
    - `staff-web/src/screens/ScannerScreen.tsx`
    - `staff-web/src/screens/HistoryScreen.tsx`
    - `staff-web/src/screens/CreatePassScreen.tsx`

## Security Features

✅ **All endpoints require STAFF authentication** (via `authenticateToken` + `requireRole('STAFF', 'ADMIN')`)

✅ **Blocked users cannot:**
  - Log in (rejected at authentication)
  - Purchase passes (rejected in `purchasePass()`)
  - Use existing passes (rejected in `validatePassByToken()`)

✅ **Safe deletion:**
  - Cascades properly: deletes pass_tokens, pass_usage_logs, user_passes, then user
  - Requires email confirmation in UI

✅ **No sensitive data exposure:**
  - Password hashes never returned in API responses
  - Only safe user fields exposed

## API Endpoints (All require STAFF auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/staff/users` | List users with filters |
| GET | `/api/staff/users/:id` | Get user details + passes |
| POST | `/api/staff/users/:id/block` | Block user |
| POST | `/api/staff/users/:id/unblock` | Unblock user |
| DELETE | `/api/staff/users/:id` | Delete user (cascade) |
| POST | `/api/staff/passes/:id/revoke` | Revoke pass |
| POST | `/api/staff/passes/:id/restore` | Restore pass |

## Testing Checklist

### Prerequisites
1. Run migration: `cd backend && sqlite3 gympass.db < src/db/add-user-blocked.sql`
2. Start backend: `cd backend && npm run dev`
3. Start staff-web: `cd staff-web && npm run dev`
4. Login as staff: `staff@gym.local` / `admin123`

### Test Cases

#### ✅ Users List Page
- [ ] Navigate to "Users" from dashboard
- [ ] Users list loads and displays correctly
- [ ] Search by name works
- [ ] Search by email works
- [ ] "Active pass only" filter works
- [ ] "Blocked only" filter works
- [ ] Stats show correct counts (Total users, Active passes, Blocked)
- [ ] Table shows: name, email, registered date, active pass status, user status

#### ✅ User Detail Page
- [ ] Click "View Details" on a user → opens detail page
- [ ] User information displays correctly
- [ ] All user's passes are listed
- [ ] Pass details show: type, status, dates, entries, serial number

#### ✅ Block/Unblock User
- [ ] Click "Block User" → confirmation dialog appears
- [ ] Confirm block → user status changes to BLOCKED
- [ ] Blocked user shows in "Blocked only" filter
- [ ] Try to login as blocked user (mobile app) → rejected with "Account is blocked"
- [ ] Try to use pass as blocked user (staff scan) → validation fails
- [ ] Click "Unblock User" → confirmation dialog
- [ ] Confirm unblock → user status changes to ACTIVE
- [ ] Login as unblocked user → works
- [ ] Use pass as unblocked user → works

#### ✅ Delete User
- [ ] Click "Delete User" → prompt asks for email confirmation
- [ ] Type wrong email → deletion cancelled
- [ ] Type correct email → user deleted
- [ ] User no longer appears in users list
- [ ] User's passes are deleted (check database or detail page before deletion)

#### ✅ Revoke/Restore Pass
- [ ] Open user with ACTIVE pass
- [ ] Click "Revoke Pass" → confirmation
- [ ] Confirm → pass status changes to REVOKED
- [ ] Try to scan revoked pass (staff scanner) → validation fails
- [ ] Click "Restore Pass" → confirmation
- [ ] Confirm → pass status changes to ACTIVE
- [ ] Scan restored pass → works

#### ✅ Existing Features Still Work
- [ ] Staff login works
- [ ] Camera scanner works
- [ ] Pass validation works
- [ ] Consume entry works
- [ ] History page loads
- [ ] Dashboard loads
- [ ] Create pass works

#### ✅ Purchase Prevention
- [ ] Block a user
- [ ] Try to purchase pass for blocked user via mobile app → should fail with error
- [ ] Unblock user → purchase works again

## Database Schema Change

```sql
-- Added to users table:
is_blocked INTEGER NOT NULL DEFAULT 0
```

## Notes

- Pre-existing TypeScript errors in `passService.ts` and `wallet.ts` are unrelated to this feature
- Pre-existing unused variable warning in `ScannerScreen.tsx` is unrelated
- All changes are minimal and do not refactor existing code
- API contracts remain stable for existing endpoints
- Uses existing pass status `REVOKED` for pass-level blocking
- Deletion properly handles foreign key constraints




