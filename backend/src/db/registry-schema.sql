-- Registry database schema for multi-tenant SaaS
-- This DB stores gym metadata and platform admin users

CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, DELETED
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER, -- Soft delete timestamp
  
  -- Stripe subscription fields
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT, -- trialing, active, past_due, canceled, etc.
  current_period_end INTEGER, -- Unix timestamp
  plan_id TEXT,
  billing_email TEXT,
  
  -- Business/Contact info (editable only by platform admin)
  company_name TEXT,
  tax_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'HU',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Staff login secret path (per-gym, not globally unique)
  staff_login_path TEXT,
  
  -- Opening hours (JSON string)
  opening_hours TEXT
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- bcrypt hashed
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(slug);
CREATE INDEX IF NOT EXISTS idx_gyms_status ON gyms(status);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);
