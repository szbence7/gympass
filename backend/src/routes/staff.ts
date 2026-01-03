import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getGymBySlug, updateGymOpeningHours } from '../db/registry';
import { getCurrentGymSlug } from '../db/tenantContext';
import { validatePassByToken, consumePassEntry, getUsageHistory, purchasePass } from '../services/passService';
import { getDb } from '../db';
import { users, userPasses, passTypes, passUsageLogs, passTokens, passOfferings } from '../db/schema';
import { eq, or, like, and, gte, lte, sql, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { generateTempPassword } from '../utils/password';
import { BadRequestError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { parseOpeningHours, validateOpeningHours } from '../utils/openingHours';
import { getAllGlobalTemplates, getGlobalTemplate } from '../passes/globalTemplates';
import { BadRequestError, NotFoundError } from '../utils/errors';

const router = Router();

const scanSchema = z.object({
  token: z.string(),
});

const consumeSchema = z.object({
  token: z.string(),
  entries: z.number().int().positive().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const assignPassSchema = z.object({
  userId: z.string().uuid(),
  passTypeId: z.string().uuid(),
});

router.post('/scan', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = scanSchema.parse(req.body);
  const staffUserId = req.user!.userId;

  const result = await validatePassByToken(body.token, true, staffUserId);

  res.json(result);
}));

router.post('/consume', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = consumeSchema.parse(req.body);
  const staffUserId = req.user!.userId;

  const result = await consumePassEntry(body.token, body.entries || 1, staffUserId);

  res.json(result);
}));

router.get('/history', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = await getUsageHistory(limit);

  res.json(history);
}));

router.get('/users', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query.query as string | undefined;
  const activePassOnly = req.query.activePassOnly === 'true';
  const blockedOnly = req.query.blockedOnly === 'true';
  
  let conditions = [];
  
  if (query && query.length > 0) {
    conditions.push(
      or(
        like(users.email, `%${query}%`),
        like(users.name, `%${query}%`)
      )
    );
  }
  
  if (blockedOnly) {
    conditions.push(eq(users.isBlocked, true));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  let userList = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isBlocked: users.isBlocked,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .limit(100)
    .all();

  // Get active passes for each user
  const now = new Date();
  const usersWithPasses = await Promise.all(userList.map(async (user) => {
    const activePasses = await getDb()
      .select({
        id: userPasses.id,
        passTypeName: passTypes.name,
        validUntil: userPasses.validUntil,
        remainingEntries: userPasses.remainingEntries,
        status: userPasses.status,
      })
      .from(userPasses)
      .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
      .where(
        and(
          eq(userPasses.userId, user.id),
          eq(userPasses.status, 'ACTIVE'),
          or(
            sql`${userPasses.validUntil} IS NULL`,
            gte(userPasses.validUntil, now)
          )
        )
      )
      .all();

    return {
      ...user,
      hasActivePass: activePasses.length > 0,
      activePassSummary: activePasses.length > 0 ? activePasses[0] : null,
    };
  }));

  // Filter by active pass if requested
  const filteredUsers = activePassOnly 
    ? usersWithPasses.filter(u => u.hasActivePass)
    : usersWithPasses;

  res.json(filteredUsers);
}));

router.post('/users', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = createUserSchema.parse(req.body);

  const existing = await getDb().select().from(users).where(eq(users.email, body.email)).get();
  if (existing) {
    throw new BadRequestError('Email already exists');
  }

  const tempPassword = generateTempPassword(12);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  const userId = uuidv4();
  const now = new Date();

  await getDb().insert(users).values({
    id: userId,
    email: body.email,
    password: hashedPassword,
    name: body.name,
    role: 'USER',
    createdAt: now,
    updatedAt: now,
  });

  const user = await getDb().select().from(users).where(eq(users.id, userId)).get();

  res.status(201).json({
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
    },
    tempPassword,
  });
}));

router.post('/passes/assign', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = assignPassSchema.parse(req.body);

  const result = await purchasePass({
    userId: body.userId,
    passTypeId: body.passTypeId,
  });

  res.status(201).json({
    pass: result.pass,
    token: result.token.token,
  });
}));

router.get('/dashboard', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const recentLimit = parseInt(req.query.recentLimit as string) || 10;
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [todayCount] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(userPasses)
    .where(gte(userPasses.createdAt, startOfToday))
    .all();

  const [weekCount] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(userPasses)
    .where(gte(userPasses.createdAt, startOfWeek))
    .all();

  const [monthCount] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(userPasses)
    .where(gte(userPasses.createdAt, startOfMonth))
    .all();

  const [activeCount] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(userPasses)
    .where(
      and(
        eq(userPasses.status, 'ACTIVE'),
        or(
          sql`${userPasses.validUntil} IS NULL`,
          gte(userPasses.validUntil, now)
        ),
        or(
          sql`${userPasses.remainingEntries} IS NULL`,
          sql`${userPasses.remainingEntries} > 0`
        )
      )
    )
    .all();

  const recentCheckIns = await getDb()
    .select({
      createdAt: passUsageLogs.createdAt,
      action: passUsageLogs.action,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      passId: userPasses.id,
      passTypeCode: passTypes.code,
      passTypeName: passTypes.name,
      remainingEntries: userPasses.remainingEntries,
      validUntil: userPasses.validUntil,
    })
    .from(passUsageLogs)
    .leftJoin(userPasses, eq(passUsageLogs.userPassId, userPasses.id))
    .leftJoin(users, eq(userPasses.userId, users.id))
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .where(eq(passUsageLogs.action, 'SCAN'))
    .orderBy(desc(passUsageLogs.createdAt))
    .limit(recentLimit)
    .all();

  const expiringSoon = await getDb()
    .select({
      passId: userPasses.id,
      userId: users.id,
      userName: users.name,
      passTypeName: passTypes.name,
      validUntil: userPasses.validUntil,
    })
    .from(userPasses)
    .leftJoin(users, eq(userPasses.userId, users.id))
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .where(
      and(
        eq(userPasses.status, 'ACTIVE'),
        sql`${userPasses.validUntil} IS NOT NULL`,
        gte(userPasses.validUntil, now),
        lte(userPasses.validUntil, in7Days)
      )
    )
    .limit(5)
    .all();

  const lowEntries = await getDb()
    .select({
      passId: userPasses.id,
      userId: users.id,
      userName: users.name,
      passTypeName: passTypes.name,
      remainingEntries: userPasses.remainingEntries,
    })
    .from(userPasses)
    .leftJoin(users, eq(userPasses.userId, users.id))
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .where(
      and(
        eq(userPasses.status, 'ACTIVE'),
        sql`${userPasses.remainingEntries} IS NOT NULL`,
        lte(userPasses.remainingEntries, 2),
        sql`${userPasses.remainingEntries} > 0`
      )
    )
    .limit(5)
    .all();

  res.json({
    stats: {
      purchases: {
        today: todayCount.count || 0,
        week: weekCount.count || 0,
        month: monthCount.count || 0,
      },
      activePasses: activeCount.count || 0,
    },
    recentCheckIns: recentCheckIns.map((log) => ({
      at: log.createdAt?.toISOString(),
      user: {
        id: log.userId,
        name: log.userName,
        email: log.userEmail,
      },
      pass: {
        id: log.passId,
        typeCode: log.passTypeCode,
        typeName: log.passTypeName,
        remainingEntries: log.remainingEntries,
        validUntil: log.validUntil?.toISOString() || null,
      },
    })),
    alerts: {
      expiringSoon: expiringSoon.map((p) => ({
        passId: p.passId,
        userId: p.userId,
        userName: p.userName,
        typeName: p.passTypeName,
        validUntil: p.validUntil?.toISOString(),
      })),
      lowEntries: lowEntries.map((p) => ({
        passId: p.passId,
        userId: p.userId,
        userName: p.userName,
        typeName: p.passTypeName,
        remainingEntries: p.remainingEntries,
      })),
    },
  });
}));

// User Management Endpoints

router.get('/users/:id', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  const user = await getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new BadRequestError('User not found');
  }

  const userPassesList = await getDb()
    .select({
      id: userPasses.id,
      passTypeId: userPasses.passTypeId,
      status: userPasses.status,
      purchasedAt: userPasses.purchasedAt,
      validFrom: userPasses.validFrom,
      validUntil: userPasses.validUntil,
      totalEntries: userPasses.totalEntries,
      remainingEntries: userPasses.remainingEntries,
      walletSerialNumber: userPasses.walletSerialNumber,
      passTypeName: passTypes.name,
      passTypeCode: passTypes.code,
    })
    .from(userPasses)
    .leftJoin(passTypes, eq(userPasses.passTypeId, passTypes.id))
    .where(eq(userPasses.userId, userId))
    .orderBy(desc(userPasses.createdAt))
    .all();

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    },
    passes: userPassesList,
  });
}));

router.post('/users/:id/block', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  const user = await getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new BadRequestError('User not found');
  }

  await getDb().update(users)
    .set({ isBlocked: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  res.json({ success: true, message: 'User blocked successfully' });
}));

router.post('/users/:id/unblock', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  const user = await getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new BadRequestError('User not found');
  }

  await getDb().update(users)
    .set({ isBlocked: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  res.json({ success: true, message: 'User unblocked successfully' });
}));

router.delete('/users/:id', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  const user = await getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new BadRequestError('User not found');
  }

  // Delete related records first (foreign key cascade)
  const userPassesForUser = await getDb().select().from(userPasses).where(eq(userPasses.userId, userId)).all();
  
  for (const pass of userPassesForUser) {
    // Delete pass tokens
    await getDb().delete(passTokens).where(eq(passTokens.userPassId, pass.id));
    // Delete pass usage logs
    await getDb().delete(passUsageLogs).where(eq(passUsageLogs.userPassId, pass.id));
  }
  
  // Delete user passes
  await getDb().delete(userPasses).where(eq(userPasses.userId, userId));
  
  // Delete user
  await getDb().delete(users).where(eq(users.id, userId));

  res.json({ success: true, message: 'User deleted successfully' });
}));

router.post('/passes/:id/revoke', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const passId = req.params.id;

  const pass = await getDb().select().from(userPasses).where(eq(userPasses.id, passId)).get();
  if (!pass) {
    throw new BadRequestError('Pass not found');
  }

  await getDb().update(userPasses)
    .set({ status: 'REVOKED', updatedAt: new Date() })
    .where(eq(userPasses.id, passId));

  res.json({ success: true, message: 'Pass revoked successfully' });
}));

router.post('/passes/:id/restore', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const passId = req.params.id;

  const pass = await getDb().select().from(userPasses).where(eq(userPasses.id, passId)).get();
  if (!pass) {
    throw new BadRequestError('Pass not found');
  }

  await getDb().update(userPasses)
    .set({ status: 'ACTIVE', updatedAt: new Date() })
    .where(eq(userPasses.id, passId));

  res.json({ success: true, message: 'Pass restored successfully' });
}));

// Get gym info (READ-ONLY for staff)
router.get('/gym-info', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const gymSlug = getCurrentGymSlug();
  const gym = getGymBySlug(gymSlug);
  
  if (!gym) {
    throw new BadRequestError('Gym not found');
  }
  
  // Return only business/contact info (READ-ONLY) + opening hours (editable)
  res.json({
    name: gym.name,
    slug: gym.slug,
    company_name: gym.company_name,
    tax_number: gym.tax_number,
    address_line1: gym.address_line1,
    address_line2: gym.address_line2,
    city: gym.city,
    postal_code: gym.postal_code,
    country: gym.country,
    contact_name: gym.contact_name,
    contact_email: gym.contact_email,
    contact_phone: gym.contact_phone,
    openingHours: parseOpeningHours(gym.opening_hours),
  });
}));

// Update opening hours (staff can edit their own gym)
const updateOpeningHoursSchema = z.object({
  openingHours: z.object({
    mon: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
    tue: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
    wed: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
    thu: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
    fri: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
    sat: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
    sun: z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    }),
  }),
});

router.put('/gym/opening-hours', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const gymSlug = getCurrentGymSlug();
  const gym = getGymBySlug(gymSlug);
  
  if (!gym) {
    throw new BadRequestError('Gym not found');
  }
  
  const body = updateOpeningHoursSchema.parse(req.body);
  
  // Additional validation using helper
  const validation = validateOpeningHours(body.openingHours);
  if (!validation.valid) {
    throw new BadRequestError(validation.error || 'Invalid opening hours');
  }
  
  // Save as JSON string
  const openingHoursJson = JSON.stringify(body.openingHours);
  updateGymOpeningHours(gym.id, openingHoursJson);
  
  res.json({ success: true, message: 'Opening hours updated successfully' });
}));

// Get global pass templates
router.get('/passes/templates', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const templates = getAllGlobalTemplates();
  res.json(templates);
}));

// Get gym pass offerings
router.get('/passes/offerings', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  try {
    const offerings = await db.select().from(passOfferings).all();
    res.json(offerings);
  } catch (err: any) {
    // Fallback: if table doesn't exist, return empty array (should not happen after migration)
    if (err.message && err.message.includes('no such table: pass_offerings')) {
      console.error('ERROR: pass_offerings table missing. This should be auto-created on DB open.');
      console.error('Please restart the backend to trigger migration.');
      res.json([]); // Return empty array instead of crashing
    } else {
      throw err;
    }
  }
}));

// Create pass offering
const createOfferingSchema = z.object({
  templateId: z.string().nullable().optional(),
  isCustom: z.boolean(),
  nameHu: z.string().min(1),
  nameEn: z.string().min(1),
  descHu: z.string().min(1),
  descEn: z.string().min(1),
  priceCents: z.number().int().positive(),
  enabled: z.boolean(),
  behavior: z.enum(['DURATION', 'VISITS']),
  durationValue: z.number().int().positive().nullable().optional(),
  durationUnit: z.enum(['day', 'week', 'month']).nullable().optional(),
  visitsCount: z.number().int().positive().nullable().optional(),
  expiresInValue: z.number().int().positive().nullable().optional(),
  expiresInUnit: z.enum(['day', 'week', 'month', 'year']).nullable().optional(),
  neverExpires: z.boolean(),
});

router.post('/passes/offerings', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = createOfferingSchema.parse(req.body);
  const db = getDb();
  
  // Validate behavior-specific fields
  if (body.behavior === 'DURATION' && (!body.durationValue || !body.durationUnit)) {
    throw new BadRequestError('Duration value and unit are required for DURATION behavior');
  }
  if (body.behavior === 'VISITS' && !body.visitsCount) {
    throw new BadRequestError('Visits count is required for VISITS behavior');
  }
  if (!body.neverExpires && (!body.expiresInValue || !body.expiresInUnit)) {
    throw new BadRequestError('Expiry value and unit are required when neverExpires is false');
  }
  
  const offeringId = uuidv4();
  const now = new Date();
  
  await db.insert(passOfferings).values({
    id: offeringId,
    templateId: body.templateId || null,
    isCustom: body.isCustom,
    nameHu: body.nameHu,
    nameEn: body.nameEn,
    descHu: body.descHu,
    descEn: body.descEn,
    priceCents: body.priceCents,
    enabled: body.enabled,
    behavior: body.behavior,
    durationValue: body.durationValue || null,
    durationUnit: body.durationUnit || null,
    visitsCount: body.visitsCount || null,
    expiresInValue: body.expiresInValue || null,
    expiresInUnit: body.expiresInUnit || null,
    neverExpires: body.neverExpires,
    createdAt: now,
    updatedAt: now,
  }).run();
  
  const created = await db.select().from(passOfferings).where(eq(passOfferings.id, offeringId)).get();
  res.json(created);
}));

// Update pass offering
router.put('/passes/offerings/:id', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const offeringId = req.params.id;
  const body = createOfferingSchema.partial().parse(req.body);
  const db = getDb();
  
  const existing = await db.select().from(passOfferings).where(eq(passOfferings.id, offeringId)).get();
  if (!existing) {
    throw new NotFoundError('Pass offering not found');
  }
  
  // Enforce restrictions for global template-based offerings
  if (existing.templateId) {
    const template = getGlobalTemplate(existing.templateId);
    if (template) {
      // For global templates, only allow editing specific fields based on template type
      const allowedFields: Partial<typeof body> = {};
      
      // Price is always editable for all templates
      if (body.priceCents !== undefined) {
        allowedFields.priceCents = body.priceCents;
      }
      
      // Expiry is editable for all templates
      if (body.neverExpires !== undefined) {
        allowedFields.neverExpires = body.neverExpires;
      }
      if (body.expiresInValue !== undefined) {
        allowedFields.expiresInValue = body.expiresInValue;
      }
      if (body.expiresInUnit !== undefined) {
        allowedFields.expiresInUnit = body.expiresInUnit;
      }
      
      // Template-specific editable fields
      if (existing.templateId === 'DURATION_MONTHS') {
        // Monthly pass: only price editable (duration is fixed to 1 month)
        if (body.nameHu !== undefined || body.nameEn !== undefined || 
            body.descHu !== undefined || body.descEn !== undefined ||
            body.behavior !== undefined || body.durationValue !== undefined || 
            body.durationUnit !== undefined || body.neverExpires !== undefined ||
            body.expiresInValue !== undefined || body.expiresInUnit !== undefined) {
          throw new BadRequestError('For monthly pass template, only price can be modified');
        }
      } else if (existing.templateId === 'VISITS_SINGLE' || existing.templateId === 'VISITS_TEN') {
        // Visits-based: visitsCount + expiry + price editable
        if (body.visitsCount !== undefined) {
          allowedFields.visitsCount = body.visitsCount;
        }
        // Reject attempts to modify name, desc, behavior
        if (body.nameHu !== undefined || body.nameEn !== undefined || 
            body.descHu !== undefined || body.descEn !== undefined ||
            body.behavior !== undefined) {
          throw new BadRequestError('For visits-based template, only visits count, expiry, and price can be modified');
        }
      } else {
        // Other templates: default to only price + expiry
        if (body.nameHu !== undefined || body.nameEn !== undefined || 
            body.descHu !== undefined || body.descEn !== undefined ||
            body.behavior !== undefined) {
          throw new BadRequestError('For global templates, only price and expiry can be modified');
        }
      }
      
      // Only update allowed fields
      await db.update(passOfferings)
        .set({
          ...allowedFields,
          updatedAt: new Date(),
        })
        .where(eq(passOfferings.id, offeringId))
        .run();
    } else {
      // Template not found, treat as custom (allow all)
      // Validate behavior-specific fields
      if (body.behavior === 'DURATION' && (!body.durationValue && !existing.durationValue || !body.durationUnit && !existing.durationUnit)) {
        throw new BadRequestError('Duration value and unit are required for DURATION behavior');
      }
      if (body.behavior === 'VISITS' && (!body.visitsCount && !existing.visitsCount)) {
        throw new BadRequestError('Visits count is required for VISITS behavior');
      }
      const finalBehavior = body.behavior || existing.behavior;
      const finalNeverExpires = body.neverExpires !== undefined ? body.neverExpires : existing.neverExpires;
      if (!finalNeverExpires && (!body.expiresInValue && !existing.expiresInValue || !body.expiresInUnit && !existing.expiresInUnit)) {
        throw new BadRequestError('Expiry value and unit are required when neverExpires is false');
      }
      
      await db.update(passOfferings)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(passOfferings.id, offeringId))
        .run();
    }
  } else {
    // Custom offering: allow full update
    // Validate behavior-specific fields
    if (body.behavior === 'DURATION' && (!body.durationValue && !existing.durationValue || !body.durationUnit && !existing.durationUnit)) {
      throw new BadRequestError('Duration value and unit are required for DURATION behavior');
    }
    if (body.behavior === 'VISITS' && (!body.visitsCount && !existing.visitsCount)) {
      throw new BadRequestError('Visits count is required for VISITS behavior');
    }
    const finalBehavior = body.behavior || existing.behavior;
    const finalNeverExpires = body.neverExpires !== undefined ? body.neverExpires : existing.neverExpires;
    if (!finalNeverExpires && (!body.expiresInValue && !existing.expiresInValue || !body.expiresInUnit && !existing.expiresInUnit)) {
      throw new BadRequestError('Expiry value and unit are required when neverExpires is false');
    }
    
    await db.update(passOfferings)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(passOfferings.id, offeringId))
      .run();
  }
  
  const updated = await db.select().from(passOfferings).where(eq(passOfferings.id, offeringId)).get();
  res.json(updated);
}));

// Backward compatibility: get pass types (old system + offerings)
router.get('/pass-types', authenticateToken, requireRole('STAFF', 'ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  
  // Get both old pass_types and new offerings
  const oldTypes = await db.select().from(passTypes).where(eq(passTypes.active, true)).all();
  const offerings = await db.select().from(passOfferings).where(eq(passOfferings.enabled, true)).all();
  
  // Format offerings to match PassType interface for backward compatibility
  const formattedOfferings = offerings.map(offering => ({
    id: offering.id,
    code: offering.templateId || `CUSTOM_${offering.id}`,
    name: offering.nameHu, // Default to HU
    description: offering.descHu,
    durationDays: offering.behavior === 'DURATION' && offering.durationUnit === 'day' ? offering.durationValue : null,
    totalEntries: offering.behavior === 'VISITS' ? offering.visitsCount : null,
    price: offering.priceCents / 100,
    active: offering.enabled,
  }));
  
  // Combine old types and offerings (offerings take precedence if same ID)
  const allTypes = [...oldTypes, ...formattedOfferings];
  res.json(allTypes);
}));

export default router;
