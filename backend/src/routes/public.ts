import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getGymBySlug, getAllGyms } from '../db/registry';
import { NotFoundError } from '../utils/errors';
import { env } from '../utils/env';

const router = Router();

// List all active gyms (for mobile app gym selection)
// Returns minimal, public gym information (no sensitive fields)
router.get('/gyms', asyncHandler(async (req: Request, res: Response) => {
  const gyms = getAllGyms();
  
  // Filter only ACTIVE gyms and return minimal public fields
  const publicGyms = gyms
    .filter(gym => gym.status === 'ACTIVE')
    .map(gym => ({
      id: gym.id,
      slug: gym.slug,
      name: gym.name,
      city: gym.city || null,
    }));
  
  res.json(publicGyms);
}));

// Verify staff login path for a specific gym (tenant-scoped, no auth required)
// This endpoint is used by the frontend to check if a path matches the gym's secret
router.post('/verify-staff-path', asyncHandler(async (req: Request, res: Response) => {
  const { slug, path } = req.body;
  
  if (!slug || !path) {
    return res.json({ valid: false });
  }
  
  const gym = getGymBySlug(slug);
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }
  
  // Compare the provided path with the gym's staff_login_path
  // Return ONLY a boolean, never leak the actual path
  const valid = gym.staff_login_path === path;
  
  res.json({ valid });
}));

// Public feature flags endpoint
// Returns safe, public feature flags (no secrets)
router.get('/features', asyncHandler(async (req: Request, res: Response) => {
  // Read APPLE_WALLET from env, case-insensitive, default to false
  const appleWalletEnv = (env.APPLE_WALLET ?? "").toLowerCase();
  const appleWallet = appleWalletEnv === "true";
  
  res.json({
    appleWallet,
  });
}));

export default router;

