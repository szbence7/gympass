import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler';
import { generateToken } from '../middleware/auth';
import { 
  listGyms, 
  getGymById, 
  updateGymStatus, 
  softDeleteGym,
  getPlatformAdminByEmail 
} from '../db/registry';
import { getTenantDbPath, getTenantDb } from '../db/tenantDb';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { env } from '../utils/env';
import Database from 'better-sqlite3';
import fs from 'fs';

const router = Router();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Admin login (no tenant middleware)
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const admin = getPlatformAdminByEmail(body.email);
  if (!admin) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(body.password, admin.password);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate token with platform admin role
  const token = generateToken({ userId: admin.id, role: 'PLATFORM_ADMIN' });

  res.json({
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'PLATFORM_ADMIN',
    },
  });
}));

// Middleware to check platform admin auth
import { authenticateToken, AuthRequest } from '../middleware/auth';

function requirePlatformAdmin(req: AuthRequest, res: Response, next: any) {
  if (!req.user || req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Platform admin access required',
      },
    });
  }
  next();
}

// Get all gyms with metrics
router.get('/gyms', authenticateToken, requirePlatformAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, status } = req.query;
  
  let gyms = listGyms(false); // Exclude deleted gyms

  // Filter by search
  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    gyms = gyms.filter(g => 
      g.name.toLowerCase().includes(searchLower) || 
      g.slug.toLowerCase().includes(searchLower)
    );
  }

  // Filter by status
  if (status && typeof status === 'string') {
    gyms = gyms.filter(g => g.status === status);
  }

  // Calculate metrics for each gym
  const gymsWithMetrics = await Promise.all(gyms.map(async (gym) => {
    const metrics = await calculateGymMetrics(gym.slug);
    return {
      ...gym,
      metrics,
    };
  }));

  res.json(gymsWithMetrics);
}));

// Get gym detail with full metrics
router.get('/gyms/:id', authenticateToken, requirePlatformAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const gym = getGymById(req.params.id);
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  const metrics = await calculateGymMetrics(gym.slug);
  const detailedMetrics = await calculateDetailedMetrics(gym.slug);

  res.json({
    ...gym,
    metrics,
    detailedMetrics,
  });
}));

// Block gym
router.post('/gyms/:id/block', authenticateToken, requirePlatformAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const gym = getGymById(req.params.id);
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  if (gym.status === 'BLOCKED') {
    throw new BadRequestError('Gym is already blocked');
  }

  updateGymStatus(req.params.id, 'BLOCKED');

  res.json({ success: true, message: 'Gym blocked successfully' });
}));

// Unblock gym
router.post('/gyms/:id/unblock', authenticateToken, requirePlatformAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const gym = getGymById(req.params.id);
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  if (gym.status !== 'BLOCKED') {
    throw new BadRequestError('Gym is not blocked');
  }

  updateGymStatus(req.params.id, 'ACTIVE');

  res.json({ success: true, message: 'Gym unblocked successfully' });
}));

// Soft delete gym
router.post('/gyms/:id/delete', authenticateToken, requirePlatformAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const gym = getGymById(req.params.id);
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  if (gym.status === 'DELETED') {
    throw new BadRequestError('Gym is already deleted');
  }

  softDeleteGym(req.params.id);

  res.json({ success: true, message: 'Gym deleted successfully' });
}));

// Update gym business/contact info (platform admin only)
import { updateGymBusinessInfo, GymBusinessInfo } from '../db/registry';

const updateBusinessInfoSchema = z.object({
  company_name: z.string().optional(),
  tax_number: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
});

router.patch('/gyms/:id', authenticateToken, requirePlatformAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const gym = getGymById(req.params.id);
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  const body = updateBusinessInfoSchema.parse(req.body);
  updateGymBusinessInfo(req.params.id, body as GymBusinessInfo);

  res.json({ success: true, message: 'Gym business info updated successfully' });
}));

// Helper: Calculate gym metrics
async function calculateGymMetrics(gymSlug: string) {
  if (env.DATABASE_URL) {
    // PostgreSQL mode
    try {
      const postgres = require('postgres');
      const connection = postgres(env.DATABASE_URL);
      
      // Set search_path to gym schema
      await connection.unsafe(`SET search_path TO "${gymSlug}"`);
      
      // Check if schema exists
      const schemaExists = await connection`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = ${gymSlug}
      `;
      
      if (schemaExists.length === 0) {
        await connection.end();
        return {
          totalPasses: 0,
          activePasses: 0,
          totalUsers: 0,
          lastActivity: null,
        };
      }
      
      // Query metrics
      const [totalPassesResult] = await connection`
        SELECT COUNT(*) as count FROM user_passes
      `;
      const totalPasses = Number(totalPassesResult?.count || 0);
      
      const [activePassesResult] = await connection`
        SELECT COUNT(*) as count FROM user_passes WHERE status = 'ACTIVE'
      `;
      const activePasses = Number(activePassesResult?.count || 0);
      
      const [totalUsersResult] = await connection`
        SELECT COUNT(*) as count FROM users
      `;
      const totalUsers = Number(totalUsersResult?.count || 0);
      
      const [lastActivityResult] = await connection`
        SELECT MAX(created_at) as last FROM pass_usage_logs
      `;
      const lastActivity = lastActivityResult?.last ? new Date(lastActivityResult.last).getTime() : null;
      
      await connection.end();
      
      return {
        totalPasses,
        activePasses,
        totalUsers,
        lastActivity,
      };
    } catch (error) {
      console.error(`Error calculating metrics for gym ${gymSlug}:`, error);
      return {
        totalPasses: 0,
        activePasses: 0,
        totalUsers: 0,
        lastActivity: null,
      };
    }
  } else {
    // SQLite mode
    const dbPath = getTenantDbPath(gymSlug);
    
    if (!fs.existsSync(dbPath)) {
      return {
        totalPasses: 0,
        activePasses: 0,
        totalUsers: 0,
        lastActivity: null,
      };
    }

    const db = new Database(dbPath, { readonly: true });
    
    try {
      // Check if tables exist first
      const tablesExist = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('user_passes', 'users', 'pass_usage_logs')
      `).all() as Array<{ name: string }>;
      
      const tableNames = new Set(tablesExist.map(t => t.name));
      
      const totalPasses = tableNames.has('user_passes') 
        ? (db.prepare('SELECT COUNT(*) as count FROM user_passes').get() as { count: number }).count
        : 0;
        
      const activePasses = tableNames.has('user_passes')
        ? (db.prepare('SELECT COUNT(*) as count FROM user_passes WHERE status = ?').get('ACTIVE') as { count: number }).count
        : 0;
        
      const totalUsers = tableNames.has('users')
        ? (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count
        : 0;
        
      const lastActivity = tableNames.has('pass_usage_logs')
        ? (db.prepare('SELECT MAX(created_at) as last FROM pass_usage_logs').get() as { last: number | null }).last
        : null;

      return {
        totalPasses,
        activePasses,
        totalUsers,
        lastActivity,
      };
    } catch (error) {
      console.error(`Error calculating metrics for gym ${gymSlug}:`, error);
      return {
        totalPasses: 0,
        activePasses: 0,
        totalUsers: 0,
        lastActivity: null,
      };
    } finally {
      db.close();
    }
  }
}

// Helper: Calculate detailed metrics
async function calculateDetailedMetrics(gymSlug: string) {
  if (env.DATABASE_URL) {
    // PostgreSQL mode
    try {
      const postgres = require('postgres');
      const connection = postgres(env.DATABASE_URL);
      
      // Set search_path to gym schema
      await connection.unsafe(`SET search_path TO "${gymSlug}"`);
      
      // Check if schema exists
      const schemaExists = await connection`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = ${gymSlug}
      `;
      
      if (schemaExists.length === 0) {
        await connection.end();
        return {
          passesByType: [],
          recentActivity: [],
        };
      }
      
      // Passes by type
      const passesByType = await connection`
        SELECT 
          pt.name as "passType",
          COUNT(*)::int as count
        FROM user_passes up
        LEFT JOIN pass_types pt ON up.pass_type_id = pt.id
        GROUP BY pt.id, pt.name
      `;
      
      // Recent activity
      const recentActivity = await connection`
        SELECT 
          EXTRACT(EPOCH FROM pul.created_at)::bigint * 1000 as timestamp,
          pul.action,
          u.name as "userName"
        FROM pass_usage_logs pul
        LEFT JOIN user_passes up ON pul.user_pass_id = up.id
        LEFT JOIN users u ON up.user_id = u.id
        ORDER BY pul.created_at DESC
        LIMIT 10
      `;
      
      await connection.end();
      
      return {
        passesByType: passesByType.map((p: any) => ({ passType: p.passType, count: Number(p.count) })),
        recentActivity: recentActivity.map((a: any) => ({ 
          timestamp: Number(a.timestamp), 
          action: a.action, 
          userName: a.userName 
        })),
      };
    } catch (error) {
      console.error(`Error calculating detailed metrics for gym ${gymSlug}:`, error);
      return {
        passesByType: [],
        recentActivity: [],
      };
    }
  } else {
    // SQLite mode
    const dbPath = getTenantDbPath(gymSlug);
    
    if (!fs.existsSync(dbPath)) {
      return {
        passesByType: [],
        recentActivity: [],
      };
    }

    const db = new Database(dbPath, { readonly: true });
    
    try {
      // Check if tables exist first
      const tablesExist = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('user_passes', 'pass_types', 'pass_usage_logs', 'users')
      `).all() as Array<{ name: string }>;
      
      const tableNames = new Set(tablesExist.map(t => t.name));
      
      // Passes by type (only if tables exist)
      const passesByType = (tableNames.has('user_passes') && tableNames.has('pass_types'))
        ? db.prepare(`
            SELECT 
              pt.name as passType,
              COUNT(*) as count
            FROM user_passes up
            LEFT JOIN pass_types pt ON up.pass_type_id = pt.id
            GROUP BY pt.id
          `).all() as Array<{ passType: string; count: number }>
        : [];

      // Recent activity (only if tables exist)
      const recentActivity = (tableNames.has('pass_usage_logs') && tableNames.has('user_passes') && tableNames.has('users'))
        ? db.prepare(`
            SELECT 
              pul.created_at as timestamp,
              pul.action,
              u.name as userName
            FROM pass_usage_logs pul
            LEFT JOIN user_passes up ON pul.user_pass_id = up.id
            LEFT JOIN users u ON up.user_id = u.id
            ORDER BY pul.created_at DESC
            LIMIT 10
          `).all() as Array<{ timestamp: number; action: string; userName: string }>
        : [];

      return {
        passesByType,
        recentActivity,
      };
    } catch (error) {
      console.error(`Error calculating detailed metrics for gym ${gymSlug}:`, error);
      return {
        passesByType: [],
        recentActivity: [],
      };
    } finally {
      db.close();
    }
  }
}

export default router;

