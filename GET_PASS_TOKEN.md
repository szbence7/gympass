# How to Get a Pass Token for Manual Scanning

## The Problem
The manual entry in the scanner requires the **scan token**, NOT the wallet serial number.

- ❌ **Wallet Serial**: `GYM-1767022544252-8d8394b4` (won't work)
- ✅ **Scan Token**: `a8K9mN4pQ2rS5tU7vW0xY3zA1bC4dE6fG8hI0jK2lM4n` (this works)

## How to Find the Token

### Option 1: Query the Database (Quick Test)

```bash
cd backend

# Get tokens for a specific user
sqlite3 gympass.db "
  SELECT 
    u.email,
    pt.name as pass_type,
    up.status,
    t.token,
    up.walletSerialNumber
  FROM users u
  JOIN user_passes up ON u.id = up.userId
  JOIN pass_types pt ON up.passTypeId = pt.id
  JOIN pass_tokens t ON up.qrTokenId = t.id
  WHERE u.email = 'guest@gym.local'
  AND up.status = 'ACTIVE';
"
```

The `token` column is what you need for manual entry.

### Option 2: View from Mobile App QR Code

1. Open the mobile app
2. Login as the user (e.g., `guest@gym.local` / `guest1234`)
3. Go to "My Passes"
4. Tap on a pass to view details
5. The QR code contains: `gympass://scan?token=ACTUAL_TOKEN_HERE`
6. You could decode the QR or inspect the pass object in dev tools

### Option 3: Add Backend Endpoint (For Development)

Create a test endpoint to retrieve tokens (ONLY for development!):

```typescript
// In backend/src/routes/staff.ts
router.get('/passes/:id/token', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const passId = req.params.id;
  
  const pass = await db.select().from(userPasses).where(eq(userPasses.id, passId)).get();
  if (!pass) {
    throw new BadRequestError('Pass not found');
  }
  
  const token = await db.select().from(passTokens).where(eq(passTokens.id, pass.qrTokenId)).get();
  
  res.json({ token: token?.token });
}));
```

## Example: Getting Guest User's Token

```bash
sqlite3 backend/gympass.db "SELECT t.token FROM users u JOIN user_passes up ON u.id = up.userId JOIN pass_tokens t ON up.qrTokenId = t.id WHERE u.email = 'guest@gym.local' AND up.status = 'ACTIVE' LIMIT 1;"
```

Copy the output and paste it into the "Manual Entry" field in the scanner.

## Token Format

The token is a base64url-encoded string, typically looks like:
- `a8K9mN4pQ2rS5tU7vW0xY3zA1bC4dE6fG8hI0jK2lM4n`
- 43 characters long
- Contains letters (A-Z, a-z), numbers (0-9), hyphens (-), and underscores (_)

## Why Two Identifiers?

1. **walletSerialNumber**: For Apple Wallet and human reference
2. **token**: For secure pass validation (not guessable, cryptographically secure)

The token is like a password for the pass - it proves you have the valid pass without exposing the pass ID.




