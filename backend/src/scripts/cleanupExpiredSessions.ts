import { getExpiredSessions, markRegistrationSessionExpired } from '../db/registrationSessions';

/**
 * Cleanup expired registration sessions
 * Run periodically to free up reserved slugs
 */
const expiredSessions = getExpiredSessions();

console.log(`Found ${expiredSessions.length} expired registration sessions`);

expiredSessions.forEach(session => {
  markRegistrationSessionExpired(session.id);
  console.log(`✅ Marked session ${session.id} (slug: ${session.slug}) as EXPIRED`);
});

console.log('Cleanup complete');

