import { getRegistryDb } from './registry';

export interface RegistrationSession {
  id: string;
  slug: string;
  gym_name: string;
  admin_email: string;
  company_name: string;
  tax_number: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: 'PENDING_PAYMENT' | 'COMPLETED' | 'EXPIRED';
  stripe_checkout_session_id: string | null;
  admin_password: string | null;
  created_at: number;
  expires_at: number;
}

export function createRegistrationSession(params: {
  id: string;
  slug: string;
  gym_name: string;
  admin_email: string;
  company_name: string;
  tax_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}): RegistrationSession {
  const db = getRegistryDb();
  const now = Date.now();
  const expiresAt = now + (60 * 60 * 1000); // 60 minutes from now

  db.prepare(`
    INSERT INTO registration_sessions (
      id, slug, gym_name, admin_email, company_name, tax_number,
      address_line1, address_line2, city, postal_code, country,
      contact_name, contact_email, contact_phone,
      status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?)
  `).run(
    params.id,
    params.slug,
    params.gym_name,
    params.admin_email,
    params.company_name,
    params.tax_number,
    params.address_line1,
    params.address_line2 || null,
    params.city,
    params.postal_code,
    params.country,
    params.contact_name,
    params.contact_email,
    params.contact_phone,
    now,
    expiresAt
  );

  return {
    id: params.id,
    slug: params.slug,
    gym_name: params.gym_name,
    admin_email: params.admin_email,
    company_name: params.company_name,
    tax_number: params.tax_number,
    address_line1: params.address_line1,
    address_line2: params.address_line2 || null,
    city: params.city,
    postal_code: params.postal_code,
    country: params.country,
    contact_name: params.contact_name,
    contact_email: params.contact_email,
    contact_phone: params.contact_phone,
    status: 'PENDING_PAYMENT',
    stripe_checkout_session_id: null,
    admin_password: null,
    created_at: now,
    expires_at: expiresAt,
  };
}

export function getRegistrationSessionById(id: string): RegistrationSession | undefined {
  const db = getRegistryDb();
  return db.prepare('SELECT * FROM registration_sessions WHERE id = ?').get(id) as RegistrationSession | undefined;
}

export function getRegistrationSessionByStripeSessionId(stripeSessionId: string): RegistrationSession | undefined {
  const db = getRegistryDb();
  return db.prepare('SELECT * FROM registration_sessions WHERE stripe_checkout_session_id = ?').get(stripeSessionId) as RegistrationSession | undefined;
}

export function getRegistrationSessionBySlug(slug: string): RegistrationSession | undefined {
  const db = getRegistryDb();
  const now = Date.now();
  // Only return active (non-expired) PENDING_PAYMENT sessions
  return db.prepare('SELECT * FROM registration_sessions WHERE slug = ? AND status = ? AND expires_at > ?').get(slug, 'PENDING_PAYMENT', now) as RegistrationSession | undefined;
}

export function updateRegistrationSessionStripeSessionId(sessionId: string, stripeCheckoutSessionId: string): void {
  const db = getRegistryDb();
  db.prepare('UPDATE registration_sessions SET stripe_checkout_session_id = ? WHERE id = ?').run(stripeCheckoutSessionId, sessionId);
}

export function updateRegistrationSessionAdminPassword(sessionId: string, adminPassword: string): void {
  const db = getRegistryDb();
  db.prepare('UPDATE registration_sessions SET admin_password = ? WHERE id = ?').run(adminPassword, sessionId);
}

export function markRegistrationSessionCompleted(sessionId: string): void {
  const db = getRegistryDb();
  db.prepare('UPDATE registration_sessions SET status = ? WHERE id = ?').run('COMPLETED', sessionId);
}

export function markRegistrationSessionExpired(sessionId: string): void {
  const db = getRegistryDb();
  db.prepare('UPDATE registration_sessions SET status = ? WHERE id = ?').run('EXPIRED', sessionId);
}

export function getExpiredSessions(): RegistrationSession[] {
  const db = getRegistryDb();
  const now = Date.now();
  return db.prepare('SELECT * FROM registration_sessions WHERE status = ? AND expires_at < ?').all('PENDING_PAYMENT', now) as RegistrationSession[];
}

