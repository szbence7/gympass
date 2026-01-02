import { env } from '../utils/env';

async function runMigrations() {
  if (env.DATABASE_URL) {
    // PostgreSQL migrations
    const postgres = require('postgres');
    const connection = postgres(env.DATABASE_URL);
    
    console.log('Running PostgreSQL migrations...');
    
    // Create public schema tables (for legacy/default gym)
    await connection.unsafe(`
      CREATE SCHEMA IF NOT EXISTS "public";
      SET search_path TO "public";
      
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
    
    await connection.end();
    console.log('PostgreSQL migrations completed successfully!');
  } else {
    // SQLite migrations (existing code)
    const { sql } = require('drizzle-orm');
    const Database = require('better-sqlite3');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    
    const sqlite = new Database(env.DATABASE_PATH);
    const db = drizzle(sqlite);

    console.log('Running SQLite migrations...');
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        is_blocked INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.run(sql`
      CREATE TABLE IF NOT EXISTS staff_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STAFF',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    db.run(sql`
      CREATE TABLE IF NOT EXISTS pass_types (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        duration_days INTEGER,
        total_entries INTEGER,
        price REAL NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    db.run(sql`
      CREATE TABLE IF NOT EXISTS user_passes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        pass_type_id TEXT NOT NULL REFERENCES pass_types(id),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        purchased_at INTEGER NOT NULL,
        valid_from INTEGER NOT NULL,
        valid_until INTEGER,
        total_entries INTEGER,
        remaining_entries INTEGER,
        wallet_serial_number TEXT NOT NULL UNIQUE,
        qr_token_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_passes_user_id ON user_passes(user_id)`);

    db.run(sql`
      CREATE TABLE IF NOT EXISTS pass_tokens (
        id TEXT PRIMARY KEY,
        user_pass_id TEXT NOT NULL REFERENCES user_passes(id),
        token TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    db.run(sql`CREATE INDEX IF NOT EXISTS idx_pass_tokens_token ON pass_tokens(token)`);

    db.run(sql`
      CREATE TABLE IF NOT EXISTS pass_usage_logs (
        id TEXT PRIMARY KEY,
        user_pass_id TEXT NOT NULL REFERENCES user_passes(id),
        staff_user_id TEXT REFERENCES staff_users(id),
        action TEXT NOT NULL,
        consumed_entries INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    db.run(sql`CREATE INDEX IF NOT EXISTS idx_pass_usage_logs_user_pass_id ON pass_usage_logs(user_pass_id)`);

    sqlite.close();
    console.log('SQLite migrations completed successfully!');
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
