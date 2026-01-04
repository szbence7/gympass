/**
 * Migration script to add pass_offerings table to existing gym databases
 * Run this once to add the new table to all existing tenant databases
 */

import { env } from '../utils/env';
import fs from 'fs';
import path from 'path';

const GYMS_DIR = path.join(__dirname, '../../data/gyms');

async function migrateOfferingsTable() {
  if (env.DATABASE_URL) {
    // PostgreSQL: handled by schema creation in tenantDb.ts
    console.log('PostgreSQL mode: pass_offerings table will be created per-schema automatically');
    return;
  }

  // SQLite: migrate each gym database
  if (!fs.existsSync(GYMS_DIR)) {
    console.log('No gyms directory found, skipping migration');
    return;
  }

  const dbFiles = fs.readdirSync(GYMS_DIR).filter(f => f.endsWith('.db'));
  console.log(`Found ${dbFiles.length} gym databases to migrate`);

  const migrationSQL = `
    CREATE TABLE IF NOT EXISTS pass_offerings (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      name_hu TEXT NOT NULL,
      name_en TEXT NOT NULL,
      desc_hu TEXT NOT NULL,
      desc_en TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      behavior TEXT NOT NULL,
      duration_value INTEGER,
      duration_unit TEXT,
      visits_count INTEGER,
      expires_in_value INTEGER,
      expires_in_unit TEXT,
      never_expires INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_pass_offerings_enabled ON pass_offerings(enabled);
    CREATE INDEX IF NOT EXISTS idx_pass_offerings_template_id ON pass_offerings(template_id);
  `;

  for (const dbFile of dbFiles) {
    const dbPath = path.join(GYMS_DIR, dbFile);
    try {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      
      // Check if table already exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='pass_offerings'
      `).get();
      
      if (!tableExists) {
        db.exec(migrationSQL);
        console.log(`✓ Migrated ${dbFile}`);
      } else {
        console.log(`- ${dbFile} already has pass_offerings table`);
      }
      
      db.close();
    } catch (error: any) {
      console.error(`✗ Failed to migrate ${dbFile}:`, error.message);
    }
  }
  
  console.log('Migration complete');
}

// Run if called directly
if (require.main === module) {
  migrateOfferingsTable().catch(console.error);
}

export { migrateOfferingsTable };

