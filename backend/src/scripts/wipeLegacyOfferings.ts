/**
 * DEV-ONLY cleanup script: Remove legacy/dummy pass offerings from all gym databases
 * 
 * This script:
 * - Iterates over all gyms in the registry
 * - For each gym DB (SQLite), deletes legacy/dummy offerings
 * - Identifies legacy offerings by:
 *   - Old templateIds that are no longer in the global templates list
 *   - Dummy price patterns (e.g., 2500 HUF = ~25 USD)
 *   - Known dummy names (Weekly, Monthly, etc.)
 * - Does NOT delete user-created custom passes
 * 
 * Usage: npm run script:wipe-legacy-offerings
 */

import { listGyms } from '../db/registry';
import { getTenantDbPath, tenantDbExists } from '../db/tenantDb';
import { env } from '../utils/env';
import Database from 'better-sqlite3';
import { GLOBAL_PASS_TEMPLATES } from '../passes/globalTemplates';

// Template IDs that are valid (from global templates)
const VALID_TEMPLATE_IDS = new Set(GLOBAL_PASS_TEMPLATES.map(t => t.templateId));

// Known dummy/legacy patterns
const DUMMY_NAME_PATTERNS = [
  'Weekly',
  'weekly',
  'WEEKLY',
  'Month',
  'month',
  'MONTH',
  '10 visits',
  '10 Visits',
  '10 VISITS',
];

async function wipeLegacyOfferings() {
  console.log('🧹 Starting legacy offerings cleanup...\n');

  const gyms = listGyms(false); // Only active gyms
  console.log(`Found ${gyms.length} active gym(s) to process.\n`);

  let totalGymsProcessed = 0;
  let totalOfferingsDeleted = 0;

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

      // Get all offerings
      let offerings: any[] = [];
      try {
        offerings = db.prepare('SELECT * FROM pass_offerings').all() as any[];
      } catch (err: any) {
        if (err.message.includes('no such table')) {
          console.log(`  ⚠️  pass_offerings table does not exist, skipping`);
          db.close();
          continue;
        }
        throw err;
      }

      let deleted = 0;
      for (const offering of offerings) {
        let shouldDelete = false;
        let reason = '';

        // Check 1: Invalid templateId (not in current global templates)
        if (offering.template_id && !VALID_TEMPLATE_IDS.has(offering.template_id)) {
          shouldDelete = true;
          reason = `invalid templateId: ${offering.template_id}`;
        }
        // Check 2: Dummy name patterns
        else if (DUMMY_NAME_PATTERNS.some(pattern => 
          (offering.name_hu && offering.name_hu.includes(pattern)) ||
          (offering.name_en && offering.name_en.includes(pattern))
        )) {
          shouldDelete = true;
          reason = `dummy name pattern`;
        }
        // Check 3: Dummy price (2500 HUF = ~25 USD, common dummy price)
        else if (offering.price_cents === 250000 || offering.price_cents === 2500) {
          // Only delete if it's also a template-based offering (not custom)
          if (offering.template_id && !offering.is_custom) {
            shouldDelete = true;
            reason = `dummy price: ${offering.price_cents} HUF`;
          }
        }

        if (shouldDelete) {
          try {
            db.prepare('DELETE FROM pass_offerings WHERE id = ?').run(offering.id);
            deleted++;
            console.log(`  🗑️  Deleted offering "${offering.name_hu || offering.name_en}" (${reason})`);
          } catch (err: any) {
            console.log(`  ⚠️  Error deleting offering ${offering.id}: ${err.message}`);
          }
        }
      }

      totalOfferingsDeleted += deleted;
      db.close();
      totalGymsProcessed++;
      console.log(`  ✅ Completed ${gym.slug} (deleted ${deleted} offering(s))\n`);
    } catch (err: any) {
      console.log(`  ❌ Error processing ${gym.slug}: ${err.message}\n`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Gyms processed: ${totalGymsProcessed}`);
  console.log(`  Legacy offerings deleted: ${totalOfferingsDeleted}`);
  console.log('\n✅ Cleanup completed!');
}

// Run if called directly
if (require.main === module) {
  wipeLegacyOfferings()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

export { wipeLegacyOfferings };

