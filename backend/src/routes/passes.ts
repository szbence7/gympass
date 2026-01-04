import { Router, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { passTypes, users, passOfferings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { purchasePass, getUserPasses, getUserPassById } from '../services/passService';
import { generateWalletPass } from '../services/wallet';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const purchaseSchema = z.object({
  passTypeId: z.string().uuid(),
});

router.get('/pass-types', asyncHandler(async (req, res: Response) => {
  const db = getDb();
  
  // ONLY return enabled offerings (new system)
  // No fallback to old pass_types - if no offerings are enabled, return empty array
  const offerings = await db.select().from(passOfferings).where(eq(passOfferings.enabled, true)).all();
  
  if (offerings.length === 0) {
    // Return empty array if no enabled offerings
    return res.json([]);
  }
  
  // Return offerings in a format compatible with existing mobile app
  // Mobile will use the language from Accept-Language header or default to HU
  const acceptLanguage = req.headers['accept-language'] || 'hu';
  const preferredLang = acceptLanguage.startsWith('en') ? 'en' : 'hu';
  
  const formatted = offerings.map((offering: typeof offerings[0]) => ({
    id: offering.id,
    code: offering.templateId || `CUSTOM_${offering.id}`,
    name: preferredLang === 'en' ? offering.nameEn : offering.nameHu,
    description: preferredLang === 'en' ? offering.descEn : offering.descHu,
    durationDays: offering.behavior === 'DURATION' && offering.durationUnit === 'day' ? offering.durationValue : null,
    totalEntries: offering.behavior === 'VISITS' ? offering.visitsCount : null,
    price: offering.priceCents / 100, // Convert cents to HUF
    active: offering.enabled,
    // Include both languages for mobile to choose
    nameHu: offering.nameHu,
    nameEn: offering.nameEn,
    descHu: offering.descHu,
    descEn: offering.descEn,
    behavior: offering.behavior,
    durationValue: offering.durationValue,
    durationUnit: offering.durationUnit,
    visitsCount: offering.visitsCount,
    expiresInValue: offering.expiresInValue,
    expiresInUnit: offering.expiresInUnit,
    neverExpires: offering.neverExpires,
  }));
  
  res.json(formatted);
}));

router.post('/passes/purchase', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = purchaseSchema.parse(req.body);
  const userId = req.user!.userId;

  const result = await purchasePass({
    userId,
    passTypeId: body.passTypeId,
  });

  res.status(201).json({
    pass: result.pass,
    token: result.token.token,
  });
}));

router.get('/passes/me', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const passes = await getUserPasses(userId);
  res.json(passes);
}));

router.get('/passes/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const passId = req.params.id;
  const userId = req.user!.userId;

  const pass = await getUserPassById(passId, userId);
  res.json(pass);
}));

router.get('/passes/:id/wallet', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const passId = req.params.id;
  const userId = req.user!.userId;

  const passData = await getUserPassById(passId, userId);
  const user = await getDb().select().from(users).where(eq(users.id, userId)).get();

  if (!passData.passType) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pass type not found' } });
  }

  if (!passData.token) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pass token not found' } });
  }

  const walletBuffer = await generateWalletPass({
    pass: passData,
    passType: passData.passType,
    token: passData.token,
    userName: user!.name,
  });

  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.setHeader('Content-Disposition', `attachment; filename="${passData.walletSerialNumber}.pkpass"`);
  res.send(walletBuffer);
}));

export default router;
