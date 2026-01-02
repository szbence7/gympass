import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { createGym, getGymBySlug, updateGymBusinessInfo } from '../db/registry';
import { createTenantDb, getTenantDbPath } from '../db/tenantDb';
import { BadRequestError } from '../utils/errors';
import { generateTempPassword } from '../utils/password';
import { env } from '../utils/env';
import fs from 'fs';
import path from 'path';

function validateSlug(slug: string): boolean {
  // Lowercase, alphanumeric, hyphens only, 3-30 chars
  return /^[a-z0-9-]{3,30}$/.test(slug);
}

export interface CreateGymParams {
  name: string;
  slug: string;
  adminEmail: string;
  // Business/Contact info
  companyName: string;
  taxNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface CreateGymResult {
  gym: {
    id: string;
    name: string;
    slug: string;
    url: string;
    staffLoginPath: string;
  };
  adminCredentials: {
    email: string;
    password: string;
  };
}

export async function createNewGym(params: CreateGymParams): Promise<CreateGymResult> {
  const { name, slug } = params;

  // Validate slug format
  if (!validateSlug(slug)) {
    throw new BadRequestError(
      'Invalid slug. Must be 3-30 characters, lowercase letters, numbers, and hyphens only.'
    );
  }

  // Check if slug already exists
  const existing = getGymBySlug(slug);
  if (existing) {
    throw new BadRequestError(`Gym with slug "${slug}" already exists.`);
  }

  // Generate gym ID
  const gymId = uuidv4();

  // Create registry entry
  createGym(gymId, slug, name);
  
  // Update business/contact info
  updateGymBusinessInfo(gymId, {
    company_name: params.companyName,
    tax_number: params.taxNumber,
    address_line1: params.addressLine1,
    address_line2: params.addressLine2 || '',
    city: params.city,
    postal_code: params.postalCode,
    country: params.country,
    contact_name: params.contactName,
    contact_email: params.contactEmail,
    contact_phone: params.contactPhone,
  });

  // Create tenant database
  const tenantDb = createTenantDb(slug);

  // Seed tenant database with pass types
  await seedTenantDb(tenantDb, slug);

  // Create initial staff admin
  const adminPassword = generateTempPassword(12);
  const adminEmail = params.adminEmail;
  await createInitialStaffAdmin(tenantDb, adminEmail, adminPassword, name);

  // Construct gym URL
  const tenantPort =
    env.TENANT_PROTOCOL === 'https' || env.TENANT_PORT === '' || env.TENANT_PORT === '443'
      ? ''
      : `:${env.TENANT_PORT}`;
  const gymUrl = `${env.TENANT_PROTOCOL}://${slug}.${env.TENANT_BASE_DOMAIN}${tenantPort}`;
  
  // Get the created gym to retrieve staffLoginPath
  const createdGym = getGymBySlug(slug);

  return {
    gym: {
      id: gymId,
      name,
      slug,
      url: gymUrl,
      staffLoginPath: createdGym?.staff_login_path || '',
    },
    adminCredentials: {
      email: adminEmail,
      password: adminPassword,
    },
  };
}

async function seedTenantDb(tenantDb: any, slug: string) {
  // Import schema
  const { passTypes } = await import('../db/schema');
  
  // Check if pass types already exist
  const existing = tenantDb.select().from(passTypes).all();
  if (existing.length > 0) {
    console.log(`Pass types already seeded for ${slug}`);
    return;
  }

  // Seed default pass types
  const now = new Date();
  const defaultPassTypes = [
    {
      id: uuidv4(),
      code: 'WEEKLY',
      name: 'Weekly Pass',
      description: 'Valid for 7 days from purchase',
      durationDays: 7,
      totalEntries: null,
      price: 25.0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      code: 'MONTHLY',
      name: 'Monthly Pass',
      description: 'Valid for 30 days from purchase',
      durationDays: 30,
      totalEntries: null,
      price: 80.0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      code: '10ENTRY',
      name: '10-Entry Pass',
      description: '10 gym visits, no expiration',
      durationDays: null,
      totalEntries: 10,
      price: 60.0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const passType of defaultPassTypes) {
    tenantDb.insert(passTypes).values(passType).run();
  }

  console.log(`Seeded pass types for gym: ${slug}`);
}

async function createInitialStaffAdmin(tenantDb: any, email: string, password: string, gymName: string) {
  const { staffUsers } = await import('../db/schema');

  // Check if staff admin already exists
  const { eq } = await import('drizzle-orm');
  const existing = tenantDb.select().from(staffUsers).where(eq(staffUsers.email, email)).get();
  if (existing) {
    console.log(`Staff admin already exists for ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  tenantDb.insert(staffUsers).values({
    id: uuidv4(),
    email,
    password: hashedPassword,
    name: `${gymName} Admin`,
    role: 'ADMIN',
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log(`Created staff admin for gym: ${email}`);
}


