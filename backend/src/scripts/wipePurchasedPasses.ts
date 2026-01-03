/**
 * DEV-ONLY cleanup script: Delete ALL purchased passes from ALL gym databases
 * 
 * This script:
 * - Iterates over all gyms in the registry
 * - For each gym DB (SQLite), deletes all purchased pass records
 * - Does NOT delete users or gyms themselves
 * - Safe and idempotent (can run multiple times)
 * 
 * Usage: npm run script:wipe-purchased-passes
 */

import { listGyms } from '../db/registry';
import { getTenantDbPath, tenantDbExists } from '../db/tenantDb';
import { env } from '../utils/env';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

async function wipePurchasedPasses() {
  console.log('🧹 Starting purchased passes cleanup...\n');

  const gyms = listGyms(false); // Only active gyms
  console.log(`Found ${gyms.length} active gym(s) to process.\n`);

  let totalGymsProcessed = 0;
  let totalUserPassesDeleted = 0;
  let totalPassTokensDeleted = 0;
  let totalPassUsageLogsDeleted = 0;

  for (const gym of gyms) {
    console.log(`Processing gym: ${gym.slug} (${gym.name})`);

    if (env.DATABASE_URL) {
      // PostgreSQL mode: use schema-per-tenant
      console.log(`  ⚠️  PostgreSQL mode detected. Skipping ${gym.slug} (PostgreSQL cleanup not implemented in this script).`);
      console.log(`  💡 To clean PostgreSQL, run SQL manually per schema: ${gym.slug}`);
      continue;
    }

    // SQLite mode: file-per-tenant
    const dbPath = getTenantDbPath(gym.slug);
    
    if (!tenantDbExists(gym.slug)) {
      console.log(`  ⚠️  Database not found: ${dbPath}`);
      continue;
    }

    try {
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');

      // Delete pass usage logs first (foreign key constraint)
      let deleted = 0;
      try {
        const result = db.prepare('DELETE FROM pass_usage_logs').run();
        deleted = result.changes;
        totalPassUsageLogsDeleted += deleted;
        if (deleted > 0) {
          console.log(`  ✅ Deleted ${deleted} pass usage log(s)`);
        }
      } catch (err: any) {
        if (!err.message.includes('no such table')) {
          console.log(`  ⚠️  Error deleting pass_usage_logs: ${err.message}`);
        }
      }

      // Delete pass tokens (foreign key constraint)
      deleted = 0;
      try {
        const result = db.prepare('DELETE FROM pass_tokens').run();
        deleted = result.changes;
        totalPassTokensDeleted += deleted;
        if (deleted > 0) {
          console.log(`  ✅ Deleted ${deleted} pass token(s)`);
        }
      } catch (err: any) {
        if (!err.message.includes('no such table')) {
          console.log(`  ⚠️  Error deleting pass_tokens: ${err.message}`);
        }
      }

      // Delete user passes (main table)
      deleted = 0;
      try {
        const result = db.prepare('DELETE FROM user_passes').run();
        deleted = result.changes;
        totalUserPassesDeleted += deleted;
        if (deleted > 0) {
          console.log(`  ✅ Deleted ${deleted} user pass(es)`);
        }
      } catch (err: any) {
        if (!err.message.includes('no such table')) {
          console.log(`  ⚠️  Error deleting user_passes: ${err.message}`);
        }
      }

      db.close();
      totalGymsProcessed++;
      console.log(`  ✅ Completed ${gym.slug}\n`);
    } catch (err: any) {
      console.log(`  ❌ Error processing ${gym.slug}: ${err.message}\n`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Gyms processed: ${totalGymsProcessed}`);
  console.log(`  User passes deleted: ${totalUserPassesDeleted}`);
  console.log(`  Pass tokens deleted: ${totalPassTokensDeleted}`);
  console.log(`  Pass usage logs deleted: ${totalPassUsageLogsDeleted}`);
  console.log('\n✅ Cleanup completed!');
}

// Run if called directly
if (require.main === module) {
  wipePurchasedPasses()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

export { wipePurchasedPasses };

