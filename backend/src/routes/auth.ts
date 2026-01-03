import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getDb } from '../db';
import { users, staffUsers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../middleware/auth';
import { BadRequestError, UnauthorizedError, InvalidCredentialsError, UserNotFoundError, InvalidPasswordError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { getCurrentGymSlug } from '../db/tenantContext';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await getDb().select().from(users).where(eq(users.email, body.email)).get();
  if (existing) {
    throw new BadRequestError('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
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

  const token = generateToken({ userId: user!.id, role: user!.role as 'USER' });

  res.status(201).json({
    token,
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
    },
  });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await getDb().select().from(users).where(eq(users.email, body.email)).get();
  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.isBlocked) {
    throw new UnauthorizedError('Account is blocked. Please contact support.');
  }

  const valid = await bcrypt.compare(body.password, user.password);
  if (!valid) {
    throw new InvalidPasswordError();
  }

  const token = generateToken({ userId: user.id, role: user.role as 'USER' });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}));

router.post('/staff/login', asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const gymSlug = getCurrentGymSlug();
  
  console.log('Staff login request received:', {
    email: body.email,
    gymSlug: gymSlug,
    hostname: req.hostname,
    'X-Gym-Slug': req.get('X-Gym-Slug')
  });

  const staff = await getDb().select().from(staffUsers).where(eq(staffUsers.email, body.email)).get();
  if (!staff) {
    console.log('Staff user not found in gym:', gymSlug, 'for email:', body.email);
    throw new InvalidCredentialsError();
  }

  const valid = await bcrypt.compare(body.password, staff.password);
  if (!valid) {
    console.log('Invalid password for staff user:', body.email, 'in gym:', gymSlug);
    throw new InvalidCredentialsError();
  }
  
  console.log('Staff login successful:', body.email, 'in gym:', gymSlug);

  const token = generateToken({ userId: staff.id, role: staff.role as 'STAFF' });

  res.json({
    token,
    user: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
    },
  });
}));

export default router;
