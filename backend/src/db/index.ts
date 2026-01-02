import { env } from '../utils/env';
import { getCurrentGymSlug } from './tenantContext';
import { getTenantDb } from './tenantDb';

// Conditional imports based on DATABASE_URL
let legacyDb: any;
let schema: any;

if (env.DATABASE_URL) {
  // PostgreSQL mode
  const { drizzle } = require('drizzle-orm/postgres-js');
  const postgres = require('postgres');
  const connection = postgres(env.DATABASE_URL);
  schema = require('./schema-pg');
  legacyDb = drizzle(connection, { schema });
} else {
  // SQLite mode (dev default)
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const sqlite = new Database(env.DATABASE_PATH);
  sqlite.pragma('journal_mode = WAL');
  schema = require('./schema');
  legacyDb = drizzle(sqlite, { schema });
}

// Legacy: Keep for backward compatibility (only used if no tenant context)
export const db = legacyDb;

// Tenant-aware DB getter - use this in all route handlers
export function getDb() {
  const gymSlug = getCurrentGymSlug();
  return getTenantDb(gymSlug);
}

export { schema };
