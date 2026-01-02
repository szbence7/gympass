import { Request, Response, NextFunction } from 'express';
import { runWithTenant } from '../db/tenantContext';
import { tenantDbExists } from '../db/tenantDb';
import { getGymBySlug } from '../db/registry';
import { env } from '../utils/env';

function extractGymSlug(hostname: string): string | null {
  // Examples (DEV):
  // - "hanker.gympass.local" -> "hanker"
  // - "gympass.local" -> null (main site)
  // - "localhost" -> null (use default)
  const host = (hostname || '').toLowerCase();

  if (!host || host === 'localhost') return null;

  // If request is for the main SaaS domain (no tenant), do not treat it as a gym slug.
  if (host === env.TENANT_BASE_DOMAIN) return null;

  const suffix = `.${env.TENANT_BASE_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const subdomain = host.slice(0, -suffix.length);
  // Only allow single-label slug (no nested subdomains)
  if (!subdomain || subdomain.includes('.') || subdomain === 'www') return null;

  return subdomain;
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const hostname = req.hostname || req.get('host')?.split(':')[0] || 'localhost';
  
  // Check for X-Gym-Slug header first (for mobile app), fallback to subdomain
  const gymSlugHeader = req.get('X-Gym-Slug');
  const gymSlug = gymSlugHeader || extractGymSlug(hostname) || 'default';
  
  // Check if tenant DB exists
  if (!tenantDbExists(gymSlug)) {
    // If requesting non-default gym that doesn't exist, return 404
    if (gymSlug !== 'default') {
      return res.status(404).json({
        error: {
          code: 'GYM_NOT_FOUND',
          message: `Gym "${gymSlug}" not found. Please check the subdomain.`,
        },
      });
    }
    
    // If default gym doesn't exist, that's a setup issue
    return res.status(500).json({
      error: {
        code: 'DEFAULT_GYM_NOT_FOUND',
        message: 'Default gym database not found. Please run migration.',
      },
    });
  }
  
  // Check gym status (PENDING, BLOCKED or DELETED gyms cannot be accessed)
  const gym = getGymBySlug(gymSlug);
  
  if (gym && gym.status === 'PENDING') {
    return res.status(403).json({
      error: {
        code: 'GYM_PENDING_PAYMENT',
        message: 'This gym is pending payment. Please complete the subscription setup.',
      },
    });
  }
  
  if (gym && gym.status === 'BLOCKED') {
    return res.status(403).json({
      error: {
        code: 'GYM_BLOCKED',
        message: 'This gym has been blocked by the platform administrator.',
      },
    });
  }
  
  if (gym && gym.status === 'DELETED') {
    return res.status(404).json({
      error: {
        code: 'GYM_NOT_FOUND',
        message: 'This gym is no longer available.',
      },
    });
  }
  
  // Run the rest of the request within the tenant context
  runWithTenant(gymSlug, () => {
    next();
  });
}

// Middleware to skip tenant resolution (for public endpoints like gym registration)
export function skipTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  next();
}


