/**
 * Registration portal configuration
 * 
 * This is a static HTML app, so we use a simple JS config
 * that can be overridden at deploy time or reads from inline script
 */

// Try to read from window.ENV if injected by build/deploy process
const ENV = typeof window !== 'undefined' && window.ENV ? window.ENV : {};

/**
 * Get API base URL
 * Priority:
 * 1. window.ENV.API_BASE_URL (injected at deploy)
 * 2. Relative (if served from same domain as backend)
 * 3. localhost:4000 (dev default)
 */
function getApiBaseUrl() {
  // If explicitly set
  if (ENV.API_BASE_URL) {
    return ENV.API_BASE_URL;
  }
  
  // If we're on https and not localhost, use relative (assumes reverse proxy)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (protocol === 'https:' || (hostname !== 'localhost' && hostname !== '127.0.0.1')) {
      return '/api'; // Relative path - works if proxied
    }
  }
  
  // Dev default
  return 'http://localhost:4000';
}

/**
 * Get public base URL (for displaying gym URLs after registration)
 * Dev default: http://localhost:4000 or http://{slug}.gym.local:4000
 * Prod: https://{slug}.gympass.hu
 */
function getPublicBaseUrl() {
  return ENV.PUBLIC_BASE_URL || 'http://localhost:4000';
}

/**
 * Get tenant base domain
 * Dev default: gym.local
 * Prod: gympass.hu (or whatever domain)
 */
function getTenantBaseDomain() {
  return ENV.TENANT_BASE_DOMAIN || 'gym.local';
}

/**
 * Get protocol (for building gym URLs)
 */
function getProtocol() {
  return ENV.PROTOCOL || 'http';
}

/**
 * Get port (for building gym URLs, empty in prod)
 */
function getPort() {
  return ENV.PORT || '4000';
}

// Export config
const config = {
  apiBaseUrl: getApiBaseUrl(),
  publicBaseUrl: getPublicBaseUrl(),
  tenantBaseDomain: getTenantBaseDomain(),
  protocol: getProtocol(),
  port: getPort(),
};

// Build full gym URL helper
config.buildGymUrl = function(slug) {
  const domain = config.tenantBaseDomain;
  const protocol = config.protocol;
  const port = config.port;
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${slug}.${domain}${portPart}`;
};

config.buildStaffUrl = function(slug, staffPath) {
  // Staff web is typically on port 5173 in dev, or same domain in prod
  if (protocol === 'http' && port === '4000') {
    // Dev mode
    return `http://${slug}.${domain}:5173/${staffPath}`;
  }
  // Prod mode
  return `${protocol}://${slug}.${domain}/${staffPath}`;
};



