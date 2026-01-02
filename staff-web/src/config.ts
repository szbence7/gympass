/**
 * Staff-web configuration
 * 
 * Reads from Vite environment variables with safe dev defaults.
 * No env vars needed for local development.
 */

// API base URL - where the backend API is hosted
// Dev default: localhost:4000 (if not using proxy)
// Prod: set VITE_API_BASE_URL or use relative '/api' if behind same domain
const getApiBaseUrl = (): string => {
  // 1. If explicitly set in env, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 2. In production builds, prefer relative paths (assumes reverse proxy)
  if (import.meta.env.PROD) {
    return '/api'; // Relative - works if backend is proxied on same domain
  }
  
  // 3. Dev default: detect subdomain and build URL
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  // If on tenant subdomain (e.g., hanker.gym.local or hanker.gymgo.hu)
  const tenantBaseDomain = import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gympass.local';
  if (hostname.includes(`.${tenantBaseDomain}`)) {
    const protocol = import.meta.env.VITE_API_PROTOCOL || 'http';
    const port = import.meta.env.VITE_API_PORT || '4000';
    return `${protocol}://${hostname}:${port}/api`;
  }
  
  // Default: localhost for dev
  return 'http://localhost:4000/api';
};

// Admin API base URL
// Dev default: localhost:4000/api/admin
// Prod: set VITE_ADMIN_API_BASE_URL or derived from API_BASE_URL
const getAdminApiBaseUrl = (): string => {
  if (import.meta.env.VITE_ADMIN_API_BASE_URL) {
    return import.meta.env.VITE_ADMIN_API_BASE_URL;
  }
  
  // Use same base as regular API, just different path
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith('/')) {
    return '/api/admin'; // Relative
  }
  
  // Absolute URL - append /admin path
  return apiBase.replace('/api', '/api/admin');
};

export const config = {
  apiBaseUrl: getApiBaseUrl(),
  adminApiBaseUrl: getAdminApiBaseUrl(),
  tenantBaseDomain: import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gympass.local',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};



