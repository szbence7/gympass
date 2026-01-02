import { getDb } from '../db';
import { userPasses, passTypes, passTokens, passUsageLogs, users, staffUsers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface PurchasePassParams {
  userId: string;
  passTypeId: string;
}

export interface ValidatePassResult {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'DEPLETED' | 'REVOKED';
  pass?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    type: {
      id: string;
      name: string;
      code: string;
    };
    validUntil: Date | null;
    remainingEntries: number | null;
    status: string;
  };
  autoConsumed?: boolean;
}

export async function purchasePass(params: PurchasePassParams) {
  const user = await getDb().select().from(users).where(eq(users.id, params.userId)).get();
  
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isBlocked) {
    throw new BadRequestError('Account is blocked. Cannot purchase passes.');
  }

  const passType = await getDb().select().from(passTypes).where(eq(passTypes.id, params.passTypeId)).get();
  
  if (!passType) {
    throw new NotFoundError('Pass type not found');
  }

  const now = new Date();
  const validFrom = now;
  const validUntil = passType.durationDays 
    ? new Date(now.getTime() + passType.durationDays * 24 * 60 * 60 * 1000)
    : null;

  const walletSerialNumber = `GYM-${Date.now()}-${uuidv4().substring(0, 8)}`;
  const passId = uuidv4();
  const tokenId = uuidv4();
  const token = crypto.randomBytes(32).toString('base64url');

  await getDb().insert(userPasses).values({
    id: passId,
    userId: params.userId,
    passTypeId: params.passTypeId,
    status: 'ACTIVE',
    purchasedAt: now,
    validFrom,
    validUntil,
    totalEntries: passType.totalEntries,
    remainingEntries: passType.totalEntries,
    walletSerialNumber,
    qrTokenId: tokenId,
    createdAt: now,
    updatedAt: now,
  });

  await getDb().insert(passTokens).values({
    id: tokenId,
    userPassId: passId,
    token,
    active: true,
    createdAt: now,
  });

  const createdPass = await getDb().select().from(userPasses).where(eq(userPasses.id, passId)).get();
  const createdToken = await getDb().select().from(passTokens).where(eq(passTokens.id, tokenId)).get();

  return {
    pass: createdPass!,
    token: createdToken!,
  };
}

export async function getUserPasses(userId: string) {
  const passes = await getDb()
    .select({
      pass: userPasses,
      passType: passTypes,
    })
    .from(userPasses)
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .where(eq(userPasses.userId, userId))
    .all();

  return passes.map(p => ({
    ...p.pass,
    passType: p.passType,
  }));
}

export async function getUserPassById(passId: string, userId: string) {
  const result = await getDb()
    .select({
      pass: userPasses,
      passType: passTypes,
      token: passTokens,
    })
    .from(userPasses)
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .leftJoin(passTokens, eq(userPasses.qrTokenId, passTokens.id))
    .where(and(eq(userPasses.id, passId), eq(userPasses.userId, userId)))
    .get();

  if (!result) {
    throw new NotFoundError('Pass not found');
  }

  return {
    ...result.pass,
    passType: result.passType,
    token: result.token,
  };
}

export async function validatePassByToken(token: string, autoConsume = false, staffUserId?: string): Promise<ValidatePassResult> {
  let tokenRecord = await getDb().select().from(passTokens).where(eq(passTokens.token, token)).get();

  // If not found, check if it's a serial number instead (for manual entry UX)
  if (!tokenRecord) {
    // Try to find pass by wallet serial number
    const passBySerial = await getDb().select().from(userPasses).where(eq(userPasses.walletSerialNumber, token)).get();
    
    if (passBySerial && passBySerial.qrTokenId) {
      // Found pass by serial, get its token
      tokenRecord = await getDb().select().from(passTokens).where(eq(passTokens.id, passBySerial.qrTokenId)).get();
    }
  }

  if (!tokenRecord || !tokenRecord.active) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const result = await getDb()
    .select({
      pass: userPasses,
      passType: passTypes,
      user: users,
    })
    .from(userPasses)
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .leftJoin(users, eq(userPasses.userId, users.id))
    .where(eq(userPasses.id, tokenRecord.userPassId))
    .get();

  if (!result || !result.pass || !result.passType || !result.user) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const pass = result.pass;
  const passType = result.passType;
  const user = result.user;

  // Check if user is blocked
  if (user.isBlocked) {
    return { valid: false, reason: 'REVOKED' };
  }

  if (pass.status === 'REVOKED') {
    return { valid: false, reason: 'REVOKED' };
  }

  if (pass.status === 'DEPLETED') {
    return { valid: false, reason: 'DEPLETED' };
  }

  const now = new Date();
  if (pass.validUntil && now > pass.validUntil) {
    await getDb().update(userPasses).set({ status: 'EXPIRED', updatedAt: now }).where(eq(userPasses.id, pass.id));
    return { valid: false, reason: 'EXPIRED' };
  }

  if (pass.remainingEntries !== null && pass.remainingEntries <= 0) {
    await getDb().update(userPasses).set({ status: 'DEPLETED', updatedAt: now }).where(eq(userPasses.id, pass.id));
    return { valid: false, reason: 'DEPLETED' };
  }

  const logId = uuidv4();
  await getDb().insert(passUsageLogs).values({
    id: logId,
    userPassId: pass.id,
    staffUserId: staffUserId || null,
    action: 'SCAN',
    consumedEntries: 0,
    createdAt: now,
  });

  let autoConsumed = false;
  if (autoConsume && passType.totalEntries !== null && pass.remainingEntries !== null && pass.remainingEntries > 0) {
    const newRemaining = pass.remainingEntries - 1;
    const newStatus = newRemaining === 0 ? 'DEPLETED' : 'ACTIVE';
    
    await getDb().update(userPasses)
      .set({ 
        remainingEntries: newRemaining, 
        status: newStatus,
        updatedAt: now 
      })
      .where(eq(userPasses.id, pass.id));

    await getDb().insert(passUsageLogs).values({
      id: uuidv4(),
      userPassId: pass.id,
      staffUserId: staffUserId || null,
      action: 'CONSUME',
      consumedEntries: 1,
      createdAt: now,
    });

    autoConsumed = true;
    pass.remainingEntries = newRemaining;
  }

  return {
    valid: true,
    pass: {
      id: pass.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      type: {
        id: passType.id,
        name: passType.name,
        code: passType.code,
      },
      validUntil: pass.validUntil,
      remainingEntries: pass.remainingEntries,
      status: pass.status,
    },
    autoConsumed,
  };
}

export async function consumePassEntry(token: string, entries = 1, staffUserId?: string) {
  const tokenRecord = await getDb().select().from(passTokens).where(eq(passTokens.token, token)).get();

  if (!tokenRecord || !tokenRecord.active) {
    throw new NotFoundError('Pass not found');
  }

  const pass = await getDb().select().from(userPasses).where(eq(userPasses.id, tokenRecord.userPassId)).get();

  if (!pass) {
    throw new NotFoundError('Pass not found');
  }

  if (pass.remainingEntries === null) {
    throw new BadRequestError('This pass type does not use entries');
  }

  if (pass.remainingEntries < entries) {
    throw new BadRequestError('Insufficient entries remaining');
  }

  const now = new Date();
  const newRemaining = pass.remainingEntries - entries;
  const newStatus = newRemaining === 0 ? 'DEPLETED' : 'ACTIVE';

  await getDb().update(userPasses)
    .set({ 
      remainingEntries: newRemaining, 
      status: newStatus,
      updatedAt: now 
    })
    .where(eq(userPasses.id, pass.id));

  await getDb().insert(passUsageLogs).values({
    id: uuidv4(),
    userPassId: pass.id,
    staffUserId: staffUserId || null,
    action: 'CONSUME',
    consumedEntries: entries,
    createdAt: now,
  });

  return {
    success: true,
    remainingEntries: newRemaining,
  };
}

export async function getUsageHistory(limit = 50) {
  const logs = await getDb()
    .select({
      log: passUsageLogs,
      pass: userPasses,
      user: users,
      passType: passTypes,
      staff: staffUsers,
    })
    .from(passUsageLogs)
    .leftJoin(userPasses, eq(passUsageLogs.userPassId, userPasses.id))
    .leftJoin(users, eq(userPasses.userId, users.id))
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .leftJoin(staffUsers, eq(passUsageLogs.staffUserId, staffUsers.id))
    .orderBy(passUsageLogs.createdAt)
    .limit(limit)
    .all();

  return logs;
}
