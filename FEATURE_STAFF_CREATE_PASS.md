# Feature: Staff Can Create Pass for Users

## Summary
Added functionality for staff to create gym passes for users directly from the staff web app. Staff can either select an existing user or create a new user with an auto-generated temporary password.

## Changes Made

### Backend Changes

#### 1. New Utility: Password Generator
**File:** `backend/src/utils/password.ts` (NEW)
- Generates secure temporary passwords (12 chars, avoids ambiguous characters)

#### 2. Updated Staff Routes
**File:** `backend/src/routes/staff.ts`

**New Endpoints:**
- `GET /api/staff/users?query=...` - Search/list users (requires STAFF role)
  - Returns: `{ id, email, name }[]`
  - Supports search by email or name
  - Limited to 20 results

- `POST /api/staff/users` - Create new user (requires STAFF role)
  - Body: `{ name, email }`
  - Generates temporary password
  - Returns: `{ user: { id, email, name }, tempPassword: "..." }`
  - Enforces unique email constraint

- `POST /api/staff/passes/assign` - Assign pass to user (requires STAFF role)
  - Body: `{ userId, passTypeId }`
  - Reuses existing `purchasePass()` service
  - Returns: `{ pass, token }`

**Imports Added:**
- `purchasePass` from passService
- Database imports: `db`, `users`, `eq`, `or`, `like`
- `bcrypt`, `uuidv4`
- `generateTempPassword` utility
- `BadRequestError`

### Staff-Web Changes

#### 1. Updated API Client
**File:** `staff-web/src/api/client.ts`

**New Interfaces:**
```typescript
interface User { id, email, name }
interface PassType { id, code, name, description, durationDays, totalEntries, price }
interface CreateUserResponse { user: User, tempPassword: string }
```

**New API Methods:**
- `staffAPI.getUsers(query?)` - GET /api/staff/users
- `staffAPI.createUser(name, email)` - POST /api/staff/users
- `staffAPI.getPassTypes()` - GET /api/pass-types
- `staffAPI.assignPass(userId, passTypeId)` - POST /api/staff/passes/assign

#### 2. New Screen: CreatePass
**File:** `staff-web/src/screens/CreatePassScreen.tsx` (NEW)

**Features:**
- **Step 1: User Selection**
  - Search existing users by name/email
  - Display list of matching users (clickable)
  - "New User" button to toggle inline user creation form
  
- **New User Form:**
  - Fields: name, email
  - On success: shows temporary password in prominent panel with copy button
  - Auto-selects the newly created user
  - Shows warning: "Save this password now - it won't be shown again!"

- **Step 2: Pass Type Selection**
  - Displays all available pass types
  - Shows: name, description, duration, entries, price
  - Click to select pass type

- **Step 3: Assignment**
  - "Assign Pass" button
  - Success state shows confirmation
  - "Create Another Pass" button to reset flow

**Error Handling:**
- Displays backend errors (e.g., "Email already exists")
- Shows loading states
- Clear error messages

#### 3. New CSS
**File:** `staff-web/src/styles/CreatePass.css` (NEW)
- Styled components for all CreatePass UI elements
- Step panels, user search, temp password display
- Pass type cards, buttons, success panel

#### 4. Updated App Routing
**File:** `staff-web/src/App.tsx`
- Added import: `CreatePassScreen`
- Added route: `/create-pass` → `<CreatePassScreen />`

#### 5. Updated Scanner Navigation
**File:** `staff-web/src/screens/ScannerScreen.tsx`
- Added "Create Pass" button in header
- Header now has `.nav-buttons` wrapper for multiple buttons

**File:** `staff-web/src/styles/Scanner.css`
- Added `.nav-buttons` flex container for button layout

## API Endpoints Summary

### New Staff Endpoints
```
GET    /api/staff/users?query=...         (STAFF only)
POST   /api/staff/users                   (STAFF only)
POST   /api/staff/passes/assign           (STAFF only)
```

## Database Impact
- **No schema changes required**
- Uses existing `users` and `user_passes` tables
- Temporary passwords stored as bcrypt hashes (same as regular passwords)

## User Flow

### Staff Creates User + Assigns Pass:
1. Staff opens staff-web → Scanner → "Create Pass"
2. Clicks "+ New User"
3. Enters name and email
4. Backend generates temp password (e.g., "a7Hk3mNp9Rty")
5. Staff sees temp password with Copy button
6. Staff selects pass type
7. Staff clicks "Assign Pass"
8. Pass created for user
9. User can now login on mobile app with email + temp password

### Staff Assigns Pass to Existing User:
1. Staff opens "Create Pass"
2. Searches for user by email/name
3. Selects user from list
4. Selects pass type
5. Clicks "Assign Pass"
6. Pass created

## Testing Steps

### Backend:
```bash
cd backend
npm install  # no new dependencies needed
npm run dev
```

**Test endpoints:**
```bash
# Get staff token first
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@gym.local","password":"staff1234"}' \
  | jq -r '.token')

# List users
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/staff/users

# Create user
curl -X POST http://localhost:4000/api/staff/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Assign pass (use real userId and passTypeId from above)
curl -X POST http://localhost:4000/api/staff/passes/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","passTypeId":"PASS_TYPE_ID"}'
```

### Staff-Web:
```bash
cd staff-web
npm install  # no new dependencies needed
npm run dev
```

1. Login as staff (staff@gym.local / staff1234)
2. Click "Create Pass" button
3. Test user search
4. Create a new user → verify temp password shown
5. Select pass type
6. Assign pass
7. Verify success message

### Mobile App (Test Login with Temp Password):
```bash
cd mobile
npm start
```

1. On login screen, enter the email and temp password from staff creation
2. Should successfully login
3. Navigate to "My Passes"
4. Should see the assigned pass

## Files Modified
- `backend/src/routes/staff.ts` (added 3 endpoints)
- `staff-web/src/api/client.ts` (added 4 methods + interfaces)
- `staff-web/src/App.tsx` (added route)
- `staff-web/src/screens/ScannerScreen.tsx` (added nav button)
- `staff-web/src/styles/Scanner.css` (added nav-buttons style)

## Files Created
- `backend/src/utils/password.ts`
- `staff-web/src/screens/CreatePassScreen.tsx`
- `staff-web/src/styles/CreatePass.css`

## No Breaking Changes
- All existing functionality remains unchanged
- No database migrations required
- No new dependencies required
- Backward compatible with existing code
