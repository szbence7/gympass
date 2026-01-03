import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  gymSlug: string;
}

const tenantContext = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantContext.getStore();
}

export function getCurrentGymSlug(): string {
  const context = getTenantContext();
  if (!context) {
    // Fallback to default gym for non-subdomain requests
    return 'default';
  }
  return context.gymSlug;
}

export function runWithTenant<T>(gymSlug: string, callback: () => T): T {
  return tenantContext.run({ gymSlug }, callback);
}





