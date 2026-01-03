# Staff Login Path Implementation

## Summary
Tenant root (e.g., `default.gym.local:5173/`) now shows a **public landing page** instead of staff login. Staff must use a per-gym secret path to access login.

## Changes Made

### 1. Database Schema
- **Added `staff_login_path` column** to `gyms` table in `registry.db`
- **Migration logic** added to automatically add the column to existing databases
- **Backfill logic** generates paths for existing gyms on server startup

### 2. Backend Changes

#### `backend/src/db/registry-schema.sql`
- Added `staff_login_path TEXT` column

#### `backend/src/db/registry.ts`
- Added `staff_login_path` to `Gym` interface
- Added `generateStaffLoginPath()` function (12-15 chars, base62)
- Added `setStaffLoginPath()` function
- Added `backfillStaffLoginPaths()` function (idempotent)
- Updated `createGym()` to generate and store path on gym creation
- Updated migration logic to add column to existing databases

#### `backend/src/index.ts`
- Added call to `backfillStaffLoginPaths()` on startup

#### `backend/src/services/gymService.ts`
- Updated `CreateGymResult` interface to include `staffLoginPath`
- Modified `createNewGym()` to return the generated path

#### `backend/src/routes/public.ts` (NEW)
- Added `POST /api/public/verify-staff-path` endpoint
- Validates if a given path matches a gym's secret path
- Returns ONLY `{ valid: boolean }` - never leaks the actual path
- **Security**: Tenant-scoped validation (gym1's path only works on gym1's domain)

#### `backend/src/app.ts`
- Added `publicRoutes` import and route registration

### 3. Frontend Changes

#### `staff-web/src/screens/LandingScreen.tsx` (NEW)
- Public landing page with gym name
- "Download the App" button (placeholder)
- Feature highlights

#### `staff-web/src/styles/Landing.css` (NEW)
- Styling for landing page (gradient background, modern UI)

#### `staff-web/src/App.tsx`
- **NEW ROUTING LOGIC**:
  - `/` → Landing page (when not authenticated)
  - `/:path` → Verifies path with backend, shows login if valid, 404 if not
  - `/dashboard`, `/scanner`, etc. → Protected staff routes (when authenticated)
  - `/admin/*` → Platform admin routes (unchanged)
- Added `StaffLoginGuard` component:
  - Calls backend to verify if `:path` matches gym's `staffLoginPath`
  - Shows login page only if valid
  - Redirects to landing if invalid (no error message that could leak info)

#### `staff-web/src/screens/admin/AdminGymDetailScreen.tsx`
- Added display of `staffLoginPath` next to gym name header
- Format: `staff login: /<path>` in smaller text

#### `staff-web/src/styles/AdminGymDetail.css`
- Added styles for `.header-title`, `.staff-login-path`

#### `staff-web/src/api/adminClient.ts`
- Added `staff_login_path` to `Gym` interface

#### `registration-portal/app.js`
- Updated success message to show staff login URL
- Format: `http://{slug}.gym.local:5173/{staffLoginPath}`
- **IMPORTANT**: This is shown ONCE on registration success

## Security Features

### 1. Tenant-Scoped Validation
- `staffLoginPath` does NOT need to be globally unique
- Validation is always scoped to the current tenant domain
- Example:
  - `gym1.gym.local/ABC123` → Validates ABC123 against gym1's path only
  - `gym2.gym.local/ABC123` → Validates ABC123 against gym2's path only

### 2. No Path Leakage
- Invalid paths redirect to `/` without error messages
- Verification endpoint returns only `{ valid: boolean }`
- No logs or error messages expose the correct path
- Backend never returns the path in error responses

### 3. Limited Visibility
- **Shown ONCE**: On registration success screen (alongside admin password)
- **Shown to platform admins**: In admin portal gym detail page
- **NOT shown**: In staff portal, to end users, or in public landing

## Testing Steps

1. **Restart backend** to trigger migration and backfill:
   ```bash
   # Stop current backend (Ctrl+C in terminal)
   cd backend && npm run dev
   ```
   
   You should see:
   ```
   ✅ Generated staff login path for gym: default -> /abc123xyz456
   ✅ Generated staff login path for gym: hanker -> /xyz789abc123
   ```

2. **Test existing gyms**:
   - Visit `http://default.gym.local:5173/` → See landing page ✅
   - Visit `http://default.gym.local:5173/wrongpath` → Redirect to landing ✅
   - Check backend logs for the generated path (e.g., `/abc123xyz456`)
   - Visit `http://default.gym.local:5173/abc123xyz456` → See staff login ✅

3. **Test new gym registration**:
   - Visit `http://localhost:8081/` (registration portal)
   - Register a new gym
   - Note the staff login URL in success message
   - Visit that URL → Should see staff login ✅

4. **Test platform admin**:
   - Login to `http://localhost:5173/admin/login`
   - View any gym detail
   - See staff login path displayed next to gym name ✅

## Architecture Decisions

### Why per-gym (not globally unique)?
- Simplifies generation (no need to check uniqueness across all gyms)
- Natural tenant isolation through domain context
- Backend validates within tenant scope automatically

### Why not use a prefix like `/staff/:path`?
- User requested to try `/:path` first
- Cleaner URLs
- Less revealing of purpose
- Still allows future expansion if needed

### Why verify on each visit (not store in session)?
- Prevents path from being stored client-side
- Forces fresh validation per access
- Minimal performance impact (fast DB lookup)

## Migration Notes

- **Idempotent**: Safe to run multiple times
- **No data loss**: Existing gyms get new paths automatically
- **No downtime**: Column added via ALTER TABLE
- **Backwards compatible**: Null paths handled gracefully (backfill on startup)




