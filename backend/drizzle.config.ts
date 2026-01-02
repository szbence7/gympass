import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

const isPostgres = !!process.env.DATABASE_URL;

export default {
  schema: isPostgres ? './src/db/schema-pg.ts' : './src/db/schema.ts',
  out: './drizzle',
  driver: isPostgres ? 'pg' : 'better-sqlite',
  dbCredentials: isPostgres
    ? {
        connectionString: process.env.DATABASE_URL!,
      }
    : {
        url: process.env.DATABASE_PATH || './gympass.db',
      },
} satisfies Config;
