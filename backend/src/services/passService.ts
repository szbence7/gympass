import { getDb } from '../db';
import { userPasses, passTypes, passTokens, passUsageLogs, users, staffUsers, passOfferings } from '../db/schema';
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

  const db = getDb();
  const now = new Date();
  
  // First try to find in pass_offerings (new system)
  const offering = await db.select().from(passOfferings)
    .where(and(eq(passOfferings.id, params.passTypeId), eq(passOfferings.enabled, true)))
    .get();
  
  let validFrom: Date;
  let validUntil: Date | null;
  let totalEntries: number | null;
  let remainingEntries: number | null;
  let passTypeId: string;
  let offeringId: string | null = null;
  let purchasedNameHu: string | null = null;
  let purchasedNameEn: string | null = null;
  let purchasedDescHu: string | null = null;
  let purchasedDescEn: string | null = null;

  if (offering) {
    // New system: use offering rules
    offeringId = offering.id;
    purchasedNameHu = offering.nameHu;
    purchasedNameEn = offering.nameEn;
    purchasedDescHu = offering.descHu;
    purchasedDescEn = offering.descEn;
    
    // Ensure a corresponding pass_type exists for FK constraint
    // Check if pass_type already exists (may have been created earlier)
    let passType = await db.select().from(passTypes).where(eq(passTypes.id, offering.id)).get();
    
    if (!passType) {
      // Create a minimal pass_type entry for FK constraint
      // This is a bridge record to satisfy the schema requirement
      const code = offering.templateId || `CUSTOM_${offering.id}`;
      await db.insert(passTypes).values({
        id: offering.id,
        code: code,
        name: offering.nameHu, // Use HU name as default
        description: offering.descHu,
        durationDays: offering.behavior === 'DURATION' && offering.durationUnit === 'day' ? offering.durationValue : null,
        totalEntries: offering.behavior === 'VISITS' ? offering.visitsCount : null,
        price: offering.priceCents / 100,
        active: offering.enabled,
        createdAt: now,
        updatedAt: now,
      }).run();
      
      passType = await db.select().from(passTypes).where(eq(passTypes.id, offering.id)).get();
    }
    
    passTypeId = passType!.id; // Use the pass_type id for FK constraint
    
    validFrom = now;
    
    // Calculate validUntil based on behavior and expiry rules
    if (offering.behavior === 'DURATION' && offering.durationValue && offering.durationUnit) {
      let days = 0;
      if (offering.durationUnit === 'day') {
        days = offering.durationValue;
      } else if (offering.durationUnit === 'week') {
        days = offering.durationValue * 7;
      } else if (offering.durationUnit === 'month') {
        days = offering.durationValue * 30; // Approximate
      }
      validUntil = days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;
    } else {
      validUntil = null;
    }
    
    // Apply expiry rules (overrides duration-based expiry)
    if (!offering.neverExpires && offering.expiresInValue && offering.expiresInUnit) {
      let expiryDays = 0;
      if (offering.expiresInUnit === 'day') {
        expiryDays = offering.expiresInValue;
      } else if (offering.expiresInUnit === 'week') {
        expiryDays = offering.expiresInValue * 7;
      } else if (offering.expiresInUnit === 'month') {
        expiryDays = offering.expiresInValue * 30;
      } else if (offering.expiresInUnit === 'year') {
        expiryDays = offering.expiresInValue * 365;
      }
      validUntil = expiryDays > 0 ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null;
    } else if (offering.neverExpires) {
      validUntil = null;
    }
    
    // Set entries based on behavior
    if (offering.behavior === 'VISITS' && offering.visitsCount) {
      totalEntries = offering.visitsCount;
      remainingEntries = offering.visitsCount;
    } else {
      totalEntries = null;
      remainingEntries = null;
    }
  } else {
    // Fallback to old passTypes (backward compatibility)
    const passType = await db.select().from(passTypes).where(eq(passTypes.id, params.passTypeId)).get();
    
    if (!passType) {
      throw new NotFoundError('A kiválasztott bérlet nem található.');
    }
    
    passTypeId = passType.id;
    validFrom = now;
    validUntil = passType.durationDays 
      ? new Date(now.getTime() + passType.durationDays * 24 * 60 * 60 * 1000)
      : null;
    totalEntries = passType.totalEntries;
    remainingEntries = passType.totalEntries;
  }

  const walletSerialNumber = `GYM-${Date.now()}-${uuidv4().substring(0, 8)}`;
  const passId = uuidv4();
  const tokenId = uuidv4();
  const token = crypto.randomBytes(32).toString('base64url');

  await db.insert(userPasses).values({
    id: passId,
    userId: params.userId,
    passTypeId: passTypeId,
    offeringId: offeringId,
    status: 'ACTIVE',
    purchasedAt: now,
    validFrom,
    validUntil,
    totalEntries,
    remainingEntries,
    walletSerialNumber,
    qrTokenId: tokenId,
    purchasedNameHu,
    purchasedNameEn,
    purchasedDescHu,
    purchasedDescEn,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(passTokens).values({
    id: tokenId,
    userPassId: passId,
    token,
    active: true,
    createdAt: now,
  });

  const createdPass = await db.select().from(userPasses).where(eq(userPasses.id, passId)).get();
  const createdToken = await db.select().from(passTokens).where(eq(passTokens.id, tokenId)).get();

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

  return passes.map((p: typeof passes[0]) => {
    // If pass has purchased localized names, use those; otherwise use passType
    const passType = p.passType ? {
      ...p.passType,
      // Override with purchased names if available (for display consistency)
      name: p.pass.purchasedNameHu || p.passType.name,
      description: p.pass.purchasedDescHu || p.passType.description,
      // Include both languages
      nameHu: p.pass.purchasedNameHu || p.passType.name,
      nameEn: p.pass.purchasedNameEn || p.passType.name,
      descHu: p.pass.purchasedDescHu || p.passType.description || '',
      descEn: p.pass.purchasedDescEn || p.passType.description || '',
    } : null;
    
    return {
      ...p.pass,
      passType,
    };
  });
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

  // If pass has purchased localized names, use those; otherwise use passType
  const passType = result.passType ? {
    ...result.passType,
    // Override with purchased names if available (for display consistency)
    name: result.pass.purchasedNameHu || result.passType.name,
    description: result.pass.purchasedDescHu || result.passType.description,
    // Include both languages
    nameHu: result.pass.purchasedNameHu || result.passType.name,
    nameEn: result.pass.purchasedNameEn || result.passType.name,
    descHu: result.pass.purchasedDescHu || result.passType.description || '',
    descEn: result.pass.purchasedDescEn || result.passType.description || '',
  } : null;

  return {
    ...result.pass,
    passType,
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
