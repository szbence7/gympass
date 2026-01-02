import { Router, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { passTypes, users } from '../db/schema';
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
  const types = await db.select().from(passTypes).where(eq(passTypes.active, true)).all();
  res.json(types);
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
