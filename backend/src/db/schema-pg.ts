import { pgTable, text, integer, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('USER'),
  isBlocked: boolean('is_blocked').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const staffUsers = pgTable('staff_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('STAFF'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const passTypes = pgTable('pass_types', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  durationDays: integer('duration_days'),
  totalEntries: integer('total_entries'),
  price: real('price').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const userPasses = pgTable('user_passes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  passTypeId: text('pass_type_id').notNull().references(() => passTypes.id),
  status: text('status').notNull().default('ACTIVE'),
  purchasedAt: timestamp('purchased_at', { mode: 'date' }).notNull(),
  validFrom: timestamp('valid_from', { mode: 'date' }).notNull(),
  validUntil: timestamp('valid_until', { mode: 'date' }),
  totalEntries: integer('total_entries'),
  remainingEntries: integer('remaining_entries'),
  walletSerialNumber: text('wallet_serial_number').notNull().unique(),
  qrTokenId: text('qr_token_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const passTokens = pgTable('pass_tokens', {
  id: text('id').primaryKey(),
  userPassId: text('user_pass_id').notNull().references(() => userPasses.id),
  token: text('token').notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

export const passUsageLogs = pgTable('pass_usage_logs', {
  id: text('id').primaryKey(),
  userPassId: text('user_pass_id').notNull().references(() => userPasses.id),
  staffUserId: text('staff_user_id').references(() => staffUsers.id),
  action: text('action').notNull(),
  consumedEntries: integer('consumed_entries').notNull().default(0),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StaffUser = typeof staffUsers.$inferSelect;
export type NewStaffUser = typeof staffUsers.$inferInsert;
export type PassType = typeof passTypes.$inferSelect;
export type NewPassType = typeof passTypes.$inferInsert;
export type UserPass = typeof userPasses.$inferSelect;
export type NewUserPass = typeof userPasses.$inferInsert;
export type PassToken = typeof passTokens.$inferSelect;
export type NewPassToken = typeof passTokens.$inferInsert;
export type PassUsageLog = typeof passUsageLogs.$inferSelect;
export type NewPassUsageLog = typeof passUsageLogs.$inferInsert;

