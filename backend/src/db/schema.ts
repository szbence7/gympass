import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('USER'),
  isBlocked: integer('is_blocked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const staffUsers = sqliteTable('staff_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('STAFF'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const passTypes = sqliteTable('pass_types', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  durationDays: integer('duration_days'),
  totalEntries: integer('total_entries'),
  price: real('price').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const passOfferings = sqliteTable('pass_offerings', {
  id: text('id').primaryKey(),
  templateId: text('template_id'),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  nameHu: text('name_hu').notNull(),
  nameEn: text('name_en').notNull(),
  descHu: text('desc_hu').notNull(),
  descEn: text('desc_en').notNull(),
  priceCents: integer('price_cents').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  behavior: text('behavior').notNull(), // 'DURATION' | 'VISITS'
  durationValue: integer('duration_value'),
  durationUnit: text('duration_unit'), // 'day' | 'week' | 'month'
  visitsCount: integer('visits_count'),
  expiresInValue: integer('expires_in_value'),
  expiresInUnit: text('expires_in_unit'), // 'day' | 'week' | 'month' | 'year'
  neverExpires: integer('never_expires', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userPasses = sqliteTable('user_passes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  passTypeId: text('pass_type_id').notNull().references(() => passTypes.id),
  offeringId: text('offering_id'), // Reference to pass_offerings (nullable for backward compatibility)
  status: text('status').notNull().default('ACTIVE'),
  purchasedAt: integer('purchased_at', { mode: 'timestamp' }).notNull(),
  validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
  validUntil: integer('valid_until', { mode: 'timestamp' }),
  totalEntries: integer('total_entries'),
  remainingEntries: integer('remaining_entries'),
  walletSerialNumber: text('wallet_serial_number').notNull().unique(),
  qrTokenId: text('qr_token_id'),
  // Store localized names/descriptions at purchase time for display consistency
  purchasedNameHu: text('purchased_name_hu'),
  purchasedNameEn: text('purchased_name_en'),
  purchasedDescHu: text('purchased_desc_hu'),
  purchasedDescEn: text('purchased_desc_en'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const passTokens = sqliteTable('pass_tokens', {
  id: text('id').primaryKey(),
  userPassId: text('user_pass_id').notNull().references(() => userPasses.id),
  token: text('token').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const passUsageLogs = sqliteTable('pass_usage_logs', {
  id: text('id').primaryKey(),
  userPassId: text('user_pass_id').notNull().references(() => userPasses.id),
  staffUserId: text('staff_user_id').references(() => staffUsers.id),
  action: text('action').notNull(),
  consumedEntries: integer('consumed_entries').notNull().default(0),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StaffUser = typeof staffUsers.$inferSelect;
export type NewStaffUser = typeof staffUsers.$inferInsert;
export type PassType = typeof passTypes.$inferSelect;
export type NewPassType = typeof passTypes.$inferInsert;
export type PassOffering = typeof passOfferings.$inferSelect;
export type NewPassOffering = typeof passOfferings.$inferInsert;
export type UserPass = typeof userPasses.$inferSelect;
export type NewUserPass = typeof userPasses.$inferInsert;
export type PassToken = typeof passTokens.$inferSelect;
export type NewPassToken = typeof passTokens.$inferInsert;
export type PassUsageLog = typeof passUsageLogs.$inferSelect;
export type NewPassUsageLog = typeof passUsageLogs.$inferInsert;
