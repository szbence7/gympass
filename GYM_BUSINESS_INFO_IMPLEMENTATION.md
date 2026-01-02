# Gym Business/Contact Info Implementation

## Summary

Added business and contact information fields to the Gym entity with proper security controls:
- **Platform Admin**: Can view and edit all fields
- **Staff Users**: Can view fields (read-only), CANNOT edit
- **Registration**: Collects all fields during gym sign-up

---

## Database Changes

### Schema (`registry-schema.sql`)
Added 10 new columns to `gyms` table:
```sql
company_name TEXT,
tax_number TEXT,
address_line1 TEXT,
address_line2 TEXT,
city TEXT,
postal_code TEXT,
country TEXT DEFAULT 'HU',
contact_name TEXT,
contact_email TEXT,
contact_phone TEXT
```

### Migration (`registry.ts`)
- Idempotent migration checks for `company_name` column
- Adds all 10 fields if missing (backwards compatible)
- Runs automatically on server startup

### Seed Data (`registry.ts`)
- `seedDummyBusinessInfo()` function
- Seeds "default" and "hanker" gyms with dummy data
- Only runs if fields are null (idempotent)
- Runs automatically on server startup

---

## API Changes

### Gym Registration (`POST /api/gyms/register`)
**New required fields:**
- `companyName` (string, min 1)
- `taxNumber` (string, min 1)
- `addressLine1` (string, min 1)
- `addressLine2` (string, optional)
- `city` (string, min 1)
- `postalCode` (string, min 1)
- `country` (string, default "HU")
- `contactName` (string, min 1)
- `contactEmail` (email)
- `contactPhone` (string, min 1)

### Staff Portal (READ-ONLY)
**New endpoint:** `GET /api/staff/gym-info`
- Returns gym business/contact info
- Requires staff authentication
- **READ-ONLY** - no write access

### Platform Admin (EDITABLE)
**New endpoint:** `PATCH /api/admin/gyms/:id`
- Updates gym business/contact info
- Requires platform admin authentication
- Validates all fields with Zod schema

---

## Security Enforcement

### Server-Side Protection
**Staff users CANNOT modify these fields:**

1. **No write endpoint**: Staff routes do NOT have any endpoint to update gym business info
2. **Admin-only PATCH**: Only `/api/admin/gyms/:id` can update (requires `PLATFORM_ADMIN` role)
3. **Authorization check**: `requirePlatformAdmin` middleware enforces 403 for non-admins

**Key security principle:**
- Staff can call `GET /api/staff/gym-info` (read)
- Staff CANNOT call `PATCH /api/admin/gyms/:id` (403 Forbidden)
- Even if staff tries to forge a request, server rejects it

### UI Enforcement
**Staff Portal:**
- Displays fields in a modal (read-only)
- No input fields, no edit buttons
- Clear message: "Only platform administrators can edit this information"

**Platform Admin:**
- Full edit form with input fields
- Save/Cancel buttons
- Updates via `PATCH /api/admin/gyms/:id`

---

## Files Changed

### Backend (10 files)
1. `backend/src/db/registry-schema.sql` - Added 10 columns
2. `backend/src/db/registry.ts` - Added migration, seed, update function
3. `backend/src/index.ts` - Call seedDummyBusinessInfo() on startup
4. `backend/src/routes/gyms.ts` - Updated registration schema
5. `backend/src/routes/staff.ts` - Added GET /staff/gym-info (read-only)
6. `backend/src/routes/admin.ts` - Added PATCH /admin/gyms/:id
7. `backend/src/services/gymService.ts` - Save business info on registration

### Frontend (7 files)
8. `registration-portal/index.html` - Added 10 input fields
9. `registration-portal/app.js` - Collect and submit new fields
10. `staff-web/src/api/client.ts` - Added getGymInfo()
11. `staff-web/src/screens/DashboardScreen.tsx` - Added "Gym Info" button + modal
12. `staff-web/src/styles/Dashboard.css` - Modal styles
13. `staff-web/src/api/adminClient.ts` - Added updateGymBusinessInfo()
14. `staff-web/src/screens/admin/AdminGymDetailScreen.tsx` - Edit form
15. `staff-web/src/styles/AdminGymDetail.css` - Edit form styles

**Total: 15 files changed**

---

## Testing Checklist

### ✅ Registration Flow
- [ ] Open `http://localhost:4000/register`
- [ ] Fill all fields (including new business/contact fields)
- [ ] Submit form → gym created successfully
- [ ] Verify new gym has business info in database

### ✅ Staff Portal (Read-Only)
- [ ] Login to staff portal (e.g., `http://hanker.gym.local:5173`)
- [ ] Click "🏢 Gym Info" button on dashboard
- [ ] Modal shows business/contact info (read-only)
- [ ] No edit buttons or input fields
- [ ] Close modal

### ✅ Staff Cannot Edit (Security Test)
- [ ] Try to call `PATCH /api/admin/gyms/:id` with staff token
- [ ] Should get **403 Forbidden** error
- [ ] Verify fields are NOT updated in database

### ✅ Platform Admin (Editable)
- [ ] Login to platform admin (`http://localhost:5173/admin/login`)
- [ ] Go to "Manage Gyms" → Click "View Details" on any gym
- [ ] See "Business Information" card with all fields
- [ ] Click "✏️ Edit Business Info"
- [ ] Edit form appears with input fields
- [ ] Change values → Click "Save"
- [ ] Success message → fields updated in database
- [ ] Reload page → changes persisted

### ✅ Seed Data
- [ ] Restart backend → check console logs
- [ ] Should see: "✅ Seeded business info for gym: default"
- [ ] Should see: "✅ Seeded business info for gym: hanker"
- [ ] Query database: `SELECT company_name, tax_number FROM gyms WHERE slug IN ('default', 'hanker');`
- [ ] Both gyms should have dummy data

---

## Dummy Data Values

**Default Gym:**
```
Company Name: Default Gym Kft.
Tax Number: 11111111-1-11
Address: Dummy Street 1, 1000 Budapest, HU
Contact: Dummy Contact, contact@default.example, +36 30 123 4567
```

**Hanker Gym:**
```
Company Name: Hanker Fitness Kft.
Tax Number: 12345678-1-42
Address: Dummy Street 1, 1000 Budapest, HU
Contact: Dummy Contact, contact@hanker.example, +36 30 123 4567
```

---

## How Staff Updates Are Prevented

### Server-Side Enforcement (Secure)

**1. No Staff Write Endpoint**
- Staff routes (`/api/staff/*`) do NOT have any endpoint to update gym business info
- Only read endpoint exists: `GET /api/staff/gym-info`

**2. Admin-Only PATCH Endpoint**
```typescript
// backend/src/routes/admin.ts
router.patch('/gyms/:id', 
  authenticateToken,           // Verify JWT token
  requirePlatformAdmin,        // Check role === 'PLATFORM_ADMIN'
  asyncHandler(async (req, res) => {
    // Only reachable by platform admins
    updateGymBusinessInfo(req.params.id, req.body);
  })
);
```

**3. Authorization Middleware**
```typescript
function requirePlatformAdmin(req, res, next) {
  if (req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

**Result:**
- Staff JWT has `role: 'STAFF'` or `role: 'ADMIN'` (gym-level)
- Platform admin JWT has `role: 'PLATFORM_ADMIN'`
- Middleware rejects staff requests with **403 Forbidden**

### UI Enforcement (User Experience)

**Staff Portal:**
- Read-only modal display
- No input fields
- No edit buttons
- Clear warning message

**Platform Admin:**
- Full edit form
- Input fields for all business/contact info
- Save/Cancel buttons

---

## Migration Safety

- ✅ **Backwards compatible**: Existing gyms work (fields nullable)
- ✅ **Idempotent**: Migration runs only if columns missing
- ✅ **Non-destructive**: Uses `ALTER TABLE ADD COLUMN`
- ✅ **No data loss**: Preserves all existing data
- ✅ **Auto-seed**: Fills dummy data for existing gyms on startup

---

## Complete!

All requirements implemented with minimal changes and strong security controls. Staff users can view but never modify gym business information.



