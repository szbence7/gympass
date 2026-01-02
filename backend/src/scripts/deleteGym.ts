import { getRegistryDb, getGymBySlug } from '../db/registry';
import { getTenantDbPath } from '../db/tenantDb';
import fs from 'fs';
import path from 'path';

/**
 * HARD DELETE a gym and all related data
 * This permanently removes the gym record from the database
 * Usage: npx tsx src/scripts/deleteGym.ts herkules
 */
const gymSlug = process.argv[2];

if (!gymSlug) {
  console.error('Usage: npx tsx src/scripts/deleteGym.ts <gym-slug>');
  process.exit(1);
}

const gym = getGymBySlug(gymSlug);

if (!gym) {
  console.log(`Gym "${gymSlug}" not found.`);
  process.exit(0);
}

console.log(`Deleting gym: ${gym.name} (${gymSlug})...`);

// HARD DELETE: Permanently remove the gym record from database
const db = getRegistryDb();
db.prepare('DELETE FROM gyms WHERE id = ?').run(gym.id);
console.log('✅ Gym record permanently deleted from database');

// Delete tenant database file
const tenantDbPath = getTenantDbPath(gymSlug);
if (fs.existsSync(tenantDbPath)) {
  fs.unlinkSync(tenantDbPath);
  // Also delete WAL and SHM files if they exist
  if (fs.existsSync(`${tenantDbPath}-wal`)) {
    fs.unlinkSync(`${tenantDbPath}-wal`);
  }
  if (fs.existsSync(`${tenantDbPath}-shm`)) {
    fs.unlinkSync(`${tenantDbPath}-shm`);
  }
  console.log('✅ Tenant database file deleted');
} else {
  console.log('⚠️  Tenant database file not found (may have been deleted already)');
}

console.log(`✅ Gym "${gymSlug}" permanently deleted`);

