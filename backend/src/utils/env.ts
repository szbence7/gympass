import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || '4000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  DATABASE_PATH: process.env.DATABASE_PATH || './gympass.db',
  /**
   * Database connection URL.
   * - If set: Use PostgreSQL (production) with schema-per-tenant
   * - If not set: Use SQLite (development default) with file-per-tenant
   * Example: postgresql://user:password@localhost:5432/gympass
   */
  DATABASE_URL: process.env.DATABASE_URL,
  /**
   * Public base URL for the SaaS site (used for Stripe redirects, registration portal, etc.)
   * - Dev default: http://localhost:4000
   * - Prod example: https://gymgo.hu
   */
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:4000',
  /**
   * Tenant base domain used for gym subdomains.
   * - Dev default: gympass.local (use /etc/hosts for slug.gympass.local)
   * - Prod example: gymgo.hu
   */
  TENANT_BASE_DOMAIN: process.env.TENANT_BASE_DOMAIN || 'gympass.local',
  /**
   * Tenant URL protocol/port used when returning gym URLs (e.g. after registration).
   * In prod you typically want https and no explicit port.
   */
  TENANT_PROTOCOL: process.env.TENANT_PROTOCOL || 'http',
  TENANT_PORT: process.env.TENANT_PORT || '4000',
  WALLET_TEAM_ID: process.env.WALLET_TEAM_ID || 'YOUR_TEAM_ID',
  WALLET_PASS_TYPE_ID: process.env.WALLET_PASS_TYPE_ID || 'pass.com.yourdomain.gympass',
  WALLET_ORG_NAME: process.env.WALLET_ORG_NAME || 'Gym Name',
  WALLET_CERT_P12_PATH: process.env.WALLET_CERT_P12_PATH || './certs/signerCert.p12',
  WALLET_CERT_P12_PASSWORD: process.env.WALLET_CERT_P12_PASSWORD || '',
  WALLET_WWDR_CERT_PATH: process.env.WALLET_WWDR_CERT_PATH || './certs/wwdr.pem',
  WALLET_DEV_UNSIGNED: process.env.WALLET_DEV_UNSIGNED === 'true',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || '',
  
  // CORS
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || '', // Comma-separated list for prod
};
