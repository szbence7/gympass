import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const REGISTRY_DB_PATH = path.join(__dirname, '../../data/registry.db');

let registryDb: Database.Database | null = null;

export function getRegistryDb(): Database.Database {
  if (!registryDb) {
    // Ensure data directory exists
    const dataDir = path.dirname(REGISTRY_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    registryDb = new Database(REGISTRY_DB_PATH);
    registryDb.pragma('journal_mode = WAL');

    // Initialize schema
    const schemaPath = path.join(__dirname, 'registry-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Migration: Add missing columns if they don't exist (for existing DBs)
    try {
      const tableInfo = registryDb.pragma('table_info(gyms)') as Array<{ name: string }>;
      const hasStatus = tableInfo.some(col => col.name === 'status');
      const hasCompanyName = tableInfo.some(col => col.name === 'company_name');
      
      if (!hasStatus && tableInfo.length > 0) {
        // Table exists but missing status column - add it
        registryDb.exec(`
          ALTER TABLE gyms ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
          ALTER TABLE gyms ADD COLUMN deleted_at INTEGER;
          ALTER TABLE gyms ADD COLUMN stripe_customer_id TEXT;
          ALTER TABLE gyms ADD COLUMN stripe_subscription_id TEXT;
          ALTER TABLE gyms ADD COLUMN subscription_status TEXT;
          ALTER TABLE gyms ADD COLUMN current_period_end INTEGER;
          ALTER TABLE gyms ADD COLUMN plan_id TEXT;
        `);
        console.log('✅ Migrated registry.db schema (added status + subscription fields)');
      }
      
      if (!hasCompanyName && tableInfo.length > 0) {
        // Table exists but missing business/contact fields - add them
        registryDb.exec(`
          ALTER TABLE gyms ADD COLUMN company_name TEXT;
          ALTER TABLE gyms ADD COLUMN tax_number TEXT;
          ALTER TABLE gyms ADD COLUMN address_line1 TEXT;
          ALTER TABLE gyms ADD COLUMN address_line2 TEXT;
          ALTER TABLE gyms ADD COLUMN city TEXT;
          ALTER TABLE gyms ADD COLUMN postal_code TEXT;
          ALTER TABLE gyms ADD COLUMN country TEXT DEFAULT 'HU';
          ALTER TABLE gyms ADD COLUMN contact_name TEXT;
          ALTER TABLE gyms ADD COLUMN contact_email TEXT;
          ALTER TABLE gyms ADD COLUMN contact_phone TEXT;
          ALTER TABLE gyms ADD COLUMN staff_login_path TEXT;
        `);
        console.log('✅ Migrated registry.db schema (added business/contact fields)');
      }
      
      const hasStaffLoginPath = tableInfo.some(col => col.name === 'staff_login_path');
      if (!hasStaffLoginPath && tableInfo.length > 0 && hasCompanyName) {
        // Table exists, has business fields, but missing staff_login_path - add it
        registryDb.exec(`ALTER TABLE gyms ADD COLUMN staff_login_path TEXT;`);
        console.log('✅ Migrated registry.db schema (added staff_login_path)');
      }
      
      const hasBillingEmail = tableInfo.some(col => col.name === 'billing_email');
      if (!hasBillingEmail && tableInfo.length > 0) {
        // Add billing_email for Stripe integration
        registryDb.exec(`ALTER TABLE gyms ADD COLUMN billing_email TEXT;`);
        console.log('✅ Migrated registry.db schema (added billing_email)');
      }
      
      const hasOpeningHours = tableInfo.some(col => col.name === 'opening_hours');
      if (!hasOpeningHours && tableInfo.length > 0) {
        // Add opening_hours for gym opening hours
        registryDb.exec(`ALTER TABLE gyms ADD COLUMN opening_hours TEXT;`);
        console.log('✅ Migrated registry.db schema (added opening_hours)');
        
        // Set default opening hours for existing gyms
        const defaultHours = JSON.stringify({
          mon: { open: "06:00", close: "22:00", closed: false },
          tue: { open: "06:00", close: "22:00", closed: false },
          wed: { open: "06:00", close: "22:00", closed: false },
          thu: { open: "06:00", close: "22:00", closed: false },
          fri: { open: "06:00", close: "22:00", closed: false },
          sat: { open: "08:00", close: "20:00", closed: false },
          sun: { open: "08:00", close: "20:00", closed: false }
        });
        registryDb.prepare('UPDATE gyms SET opening_hours = ? WHERE opening_hours IS NULL').run(defaultHours);
        console.log('✅ Set default opening hours for existing gyms');
      }
    } catch (e) {
      // Table doesn't exist yet, will be created by schema.sql
    }
    
    // Now run the full schema (CREATE TABLE IF NOT EXISTS + indexes)
    registryDb.exec(schema);

    // Initialize registration sessions schema
    const registrationSessionsSchemaPath = path.join(__dirname, 'registration-sessions-schema.sql');
    if (fs.existsSync(registrationSessionsSchemaPath)) {
      const registrationSessionsSchema = fs.readFileSync(registrationSessionsSchemaPath, 'utf-8');
      registryDb.exec(registrationSessionsSchema);
    }

    console.log('Registry DB initialized:', REGISTRY_DB_PATH);
  }

  return registryDb;
}

export interface Gym {
  id: string;
  slug: string;
  name: string;
  status: string; // ACTIVE, BLOCKED, DELETED, PENDING
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: number | null;
  plan_id: string | null;
  billing_email: string | null;
  // Business/Contact info (editable only by platform admin)
  company_name: string | null;
  tax_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  // Staff login secret path (per-gym, not globally unique)
  staff_login_path: string | null;
  // Opening hours (JSON string, parsed when needed)
  opening_hours: string | null;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export function listGyms(includeDeleted = false): Gym[] {
  const db = getRegistryDb();
  const query = includeDeleted 
    ? 'SELECT * FROM gyms ORDER BY created_at DESC'
    : 'SELECT * FROM gyms WHERE status != ? ORDER BY created_at DESC';
  
  return includeDeleted
    ? db.prepare(query).all() as Gym[]
    : db.prepare(query).all('DELETED') as Gym[];
}

// Alias for public API compatibility
export const getAllGyms = listGyms;

export function getGymBySlug(slug: string): Gym | undefined {
  const db = getRegistryDb();
  return db.prepare('SELECT * FROM gyms WHERE slug = ?').get(slug) as Gym | undefined;
}

export function createGym(id: string, slug: string, name: string, status: string = 'PENDING'): Gym {
  const db = getRegistryDb();
  const now = Date.now();
  const staffLoginPath = generateStaffLoginPath();
  
  db.prepare(`
    INSERT INTO gyms (id, slug, name, status, staff_login_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, slug, name, status, staffLoginPath, now, now);

  return { 
    id, 
    slug, 
    name, 
    status,
    created_at: now, 
    updated_at: now,
    deleted_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    current_period_end: null,
    plan_id: null,
    billing_email: null,
    company_name: null,
    tax_number: null,
    address_line1: null,
    address_line2: null,
    city: null,
    postal_code: null,
    country: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    staff_login_path: staffLoginPath,
  };
}

export function getGymById(id: string): Gym | undefined {
  const db = getRegistryDb();
  return db.prepare('SELECT * FROM gyms WHERE id = ?').get(id) as Gym | undefined;
}

export function updateGymStatus(id: string, status: string): void {
  const db = getRegistryDb();
  const now = Date.now();
  db.prepare('UPDATE gyms SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
}

export function softDeleteGym(id: string): void {
  const db = getRegistryDb();
  const now = Date.now();
  db.prepare('UPDATE gyms SET status = ?, deleted_at = ?, updated_at = ? WHERE id = ?')
    .run('DELETED', now, now, id);
}

// Platform Admin functions
export function getPlatformAdminByEmail(email: string): PlatformAdmin | undefined {
  const db = getRegistryDb();
  return db.prepare('SELECT * FROM platform_admins WHERE email = ?').get(email) as PlatformAdmin | undefined;
}

export function createPlatformAdmin(id: string, email: string, password: string, name: string): PlatformAdmin {
  const db = getRegistryDb();
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO platform_admins (id, email, password, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email, password, name, now, now);

  return { id, email, password, name, created_at: now, updated_at: now };
}

// Update gym business/contact info (platform admin only)
export interface GymBusinessInfo {
  company_name?: string;
  tax_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export function updateGymBusinessInfo(id: string, info: GymBusinessInfo): void {
  const db = getRegistryDb();
  const now = Date.now();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(info).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = ?');
  values.push(now, id);
  
  db.prepare(`UPDATE gyms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// Update gym subscription data (called from Stripe webhook)
export function updateGymSubscription(
  gymId: string, 
  data: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_status?: string;
    current_period_end?: number;
    plan_id?: string;
    billing_email?: string;
    status?: string; // Can update gym status (PENDING -> ACTIVE on successful payment)
  }
): void {
  const db = getRegistryDb();
  const now = Date.now();
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = ?');
  values.push(now, gymId);
  
  db.prepare(`UPDATE gyms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// Generate staff login path (12-15 chars, base62)
function generateStaffLoginPath(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 12 + Math.floor(Math.random() * 4); // 12-15 chars
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Set staff login path for a gym
export function setStaffLoginPath(id: string, path: string): void {
  const db = getRegistryDb();
  const now = Date.now();
  db.prepare('UPDATE gyms SET staff_login_path = ?, updated_at = ? WHERE id = ?').run(path, now, id);
}

// Update opening hours for a gym
export function updateGymOpeningHours(id: string, openingHours: string): void {
  const db = getRegistryDb();
  const now = Date.now();
  db.prepare('UPDATE gyms SET opening_hours = ?, updated_at = ? WHERE id = ?').run(openingHours, now, id);
}

// Backfill staff login paths for existing gyms (idempotent)
export function backfillStaffLoginPaths(): void {
  const db = getRegistryDb();
  const gymsWithoutPath = db.prepare('SELECT * FROM gyms WHERE staff_login_path IS NULL').all() as Gym[];
  
  gymsWithoutPath.forEach(gym => {
    const path = generateStaffLoginPath();
    setStaffLoginPath(gym.id, path);
    console.log(`✅ Generated staff login path for gym: ${gym.slug} -> /${path}`);
  });
}

// Seed dummy business info for existing gyms (idempotent)
export function seedDummyBusinessInfo(): void {
  const db = getRegistryDb();
  
  const gymsToSeed = [
    { slug: 'default', companyName: 'Default Gym Kft.', taxNumber: '11111111-1-11' },
    { slug: 'hanker', companyName: 'Hanker Fitness Kft.', taxNumber: '12345678-1-42' },
  ];
  
  gymsToSeed.forEach(({ slug, companyName, taxNumber }) => {
    const gym = db.prepare('SELECT * FROM gyms WHERE slug = ?').get(slug) as Gym | undefined;
    
    if (gym && !gym.company_name) {
      updateGymBusinessInfo(gym.id, {
        company_name: companyName,
        tax_number: taxNumber,
        address_line1: 'Dummy Street 1',
        address_line2: '',
        city: 'Budapest',
        postal_code: '1000',
        country: 'HU',
        contact_name: 'Dummy Contact',
        contact_email: `contact@${slug}.example`,
        contact_phone: '+36 30 123 4567',
      });
      console.log(`✅ Seeded business info for gym: ${slug}`);
    }
  });
}

export { generateStaffLoginPath };


