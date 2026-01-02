import { env } from './env';

/**
 * Build tenant gym URL (e.g. https://slug.gymgo.hu or http://slug.gym.local:4000)
 */
export function buildTenantUrl(slug: string): string {
  const protocol = env.TENANT_PROTOCOL || 'http';
  const baseDomain = env.TENANT_BASE_DOMAIN || 'gympass.local';
  const port = env.TENANT_PORT && env.TENANT_PORT !== '' && env.TENANT_PORT !== '443' && protocol !== 'https'
    ? `:${env.TENANT_PORT}`
    : '';
  
  return `${protocol}://${slug}.${baseDomain}${port}`;
}

/**
 * Build staff login URL for a gym
 */
export function buildStaffLoginUrl(slug: string, staffLoginPath: string): string {
  const tenantUrl = buildTenantUrl(slug);
  // Staff web typically runs on same domain as tenant, but on different port in dev
  // In prod, it's usually same domain or subdomain
  const staffPort = env.NODE_ENV === 'production' ? '' : ':5173';
  const protocol = env.TENANT_PROTOCOL || 'http';
  const baseDomain = env.TENANT_BASE_DOMAIN || 'gympass.local';
  
  if (env.NODE_ENV === 'production') {
    // In prod, staff web is typically on same domain or staff subdomain
    return `${protocol}://${slug}.${baseDomain}/staff/${staffLoginPath}`;
  } else {
    // In dev, staff web runs on Vite port
    return `${protocol}://${slug}.${baseDomain}${staffPort}/staff/${staffLoginPath}`;
  }
}

/**
 * Build public base URL (for Stripe redirects, registration portal, etc.)
 */
export function buildPublicBaseUrl(): string {
  return env.PUBLIC_BASE_URL || 'http://localhost:4000';
}

/**
 * Build API base URL
 */
export function buildApiBaseUrl(): string {
  return env.API_BASE_URL || env.PUBLIC_BASE_URL || 'http://localhost:4000';
}

