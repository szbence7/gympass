import { env } from '../utils/env';
import path from 'path';
import fs from 'fs';

const GYMS_DIR = path.join(__dirname, '../../data/gyms');
const tenantDbCache = new Map<string, any>();

export function getTenantDbPath(gymSlug: string): string {
  return path.join(GYMS_DIR, `${gymSlug}.db`);
}

export function tenantDbExists(gymSlug: string): boolean {
  if (env.DATABASE_URL) {
    // PostgreSQL: schema-per-tenant - always return true, schema will be created if needed
    return true;
  }
  return fs.existsSync(getTenantDbPath(gymSlug));
}

export function createTenantDb(gymSlug: string): any {
  // Check cache first
  if (tenantDbCache.has(gymSlug)) {
    return tenantDbCache.get(gymSlug)!;
  }

  if (env.DATABASE_URL) {
    // PostgreSQL mode: use schema-per-tenant (async operations handled separately)
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');
    const connection = postgres(env.DATABASE_URL);
    const schema = require('./schema-pg');
    
    // Create schema if it doesn't exist (async, non-blocking)
    connection.unsafe(`CREATE SCHEMA IF NOT EXISTS "${gymSlug}"`).then(() => {
      connection.unsafe(`SET search_path TO "${gymSlug}"`);
    }).catch(() => {});
    
    const db = drizzle(connection, { schema });
    
    // Run migrations for this schema (async, non-blocking)
    runPostgresMigrations(connection, gymSlug, schema).catch((err: any) => {
      console.error(`Failed to migrate schema ${gymSlug}:`, err);
    });
    
    tenantDbCache.set(gymSlug, { db, connection, schemaName: gymSlug });
    console.log(`Created tenant DB schema for gym: ${gymSlug} (PostgreSQL)`);
    
    return db;
  } else {
    // SQLite mode: file-per-tenant
    const Database = require('better-sqlite3');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    
    const dbPath = getTenantDbPath(gymSlug);
    
    // Ensure gyms directory exists
    if (!fs.existsSync(GYMS_DIR)) {
      fs.mkdirSync(GYMS_DIR, { recursive: true });
    }

    // Create SQLite database
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');

    // Run migrations (schema initialization)
    const migrationPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(migrationPath)) {
      const schema = fs.readFileSync(migrationPath, 'utf-8');
      sqlite.exec(schema);
    }

    console.log(`Created tenant DB for gym: ${gymSlug} at ${dbPath}`);

    // Create drizzle instance
    const db = drizzle(sqlite);
    
    // Cache it
    tenantDbCache.set(gymSlug, db);
    
    return db;
  }
}

export function getTenantDb(gymSlug: string): any {
  // Check cache first
  if (tenantDbCache.has(gymSlug)) {
    const cached = tenantDbCache.get(gymSlug)!;
    if (env.DATABASE_URL) {
      // For PostgreSQL, ensure search_path is set (async, but we'll handle it in getDb)
      return cached;
    }
    return cached;
  }

  if (env.DATABASE_URL) {
    // PostgreSQL mode: connect to schema (async operations handled separately)
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');
    const connection = postgres(env.DATABASE_URL);
    const schema = require('./schema-pg');
    
    // Create schema if it doesn't exist (async, but we'll do it lazily)
    connection.unsafe(`CREATE SCHEMA IF NOT EXISTS "${gymSlug}"`).then(() => {
      connection.unsafe(`SET search_path TO "${gymSlug}"`);
    }).catch(() => {});
    
    const db = drizzle(connection, { schema });
    
    // Run migrations if needed (async, non-blocking)
    runPostgresMigrations(connection, gymSlug, schema).catch((err: any) => {
      console.error(`Failed to migrate schema ${gymSlug}:`, err);
    });
    
    tenantDbCache.set(gymSlug, { db, connection, schemaName: gymSlug });
    return db;
  } else {
    // SQLite mode (synchronous - dev default)
    if (!tenantDbExists(gymSlug)) {
      throw new Error(`Tenant database not found for gym: ${gymSlug}`);
    }

    const Database = require('better-sqlite3');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    
    const dbPath = getTenantDbPath(gymSlug);
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');

    // Check if tables exist, if not, run schema initialization
    const tablesExist = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `).get();
    
    if (!tablesExist) {
      // Tables don't exist, run schema initialization
      const migrationPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(migrationPath)) {
        const schema = fs.readFileSync(migrationPath, 'utf-8');
        sqlite.exec(schema);
        console.log(`Initialized schema for tenant DB: ${gymSlug}`);
      }
    }

    const db = drizzle(sqlite);
    
    // Cache it
    tenantDbCache.set(gymSlug, db);
    
    return db;
  }
}


async function runPostgresMigrations(connection: any, schemaName: string, schema: any) {
  // Check if tables exist in this schema
  const tables = await connection`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ${schemaName}
  `;
  
  if (tables.length === 0) {
    // Run migrations using raw SQL
    await connection.unsafe(`
      SET search_path TO "${schemaName}";
      
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS staff_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STAFF',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS pass_types (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        duration_days INTEGER,
        total_entries INTEGER,
        price REAL NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS user_passes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        pass_type_id TEXT NOT NULL REFERENCES pass_types(id),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        purchased_at TIMESTAMP NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP,
        total_entries INTEGER,
        remaining_entries INTEGER,
        wallet_serial_number TEXT NOT NULL UNIQUE,
        qr_token_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_passes_user_id ON user_passes(user_id);
      
      CREATE TABLE IF NOT EXISTS pass_tokens (
        id TEXT PRIMARY KEY,
        user_pass_id TEXT NOT NULL REFERENCES user_passes(id),
        token TEXT NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_pass_tokens_token ON pass_tokens(token);
      
      CREATE TABLE IF NOT EXISTS pass_usage_logs (
        id TEXT PRIMARY KEY,
        user_pass_id TEXT NOT NULL REFERENCES user_passes(id),
        staff_user_id TEXT REFERENCES staff_users(id),
        action TEXT NOT NULL,
        consumed_entries INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_pass_usage_logs_user_pass_id ON pass_usage_logs(user_pass_id);
    `);
    
    console.log(`✅ Migrated schema ${schemaName} (PostgreSQL)`);
  }
}

export function clearTenantDbCache() {
  tenantDbCache.clear();
}
