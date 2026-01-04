-- Registration sessions table
-- Stores pending registrations before payment completion
CREATE TABLE IF NOT EXISTS registration_sessions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  gym_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  tax_number TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'HU',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT', -- PENDING_PAYMENT, COMPLETED, EXPIRED
  stripe_checkout_session_id TEXT,
  admin_password TEXT, -- Temporary password for staff admin (stored after gym creation)
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registration_sessions_slug ON registration_sessions(slug);
CREATE INDEX IF NOT EXISTS idx_registration_sessions_status ON registration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_registration_sessions_stripe_session ON registration_sessions(stripe_checkout_session_id);

