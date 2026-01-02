import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getRegistrationSessionByStripeSessionId, getRegistrationSessionById } from '../db/registrationSessions';
import { getGymBySlug } from '../db/registry';
import { buildTenantUrl } from '../utils/urlBuilder';

const router = Router();

/**
 * Get registration session details after payment
 * Used by success.html to display gym credentials
 */
router.get('/success-data', asyncHandler(async (req: Request, res: Response) => {
  const { session_id, registration_session_id } = req.query;
  
  if (!session_id && !registration_session_id) {
    return res.status(400).json({
      error: {
        code: 'MISSING_SESSION_ID',
        message: 'Missing session_id or registration_session_id',
      },
    });
  }
  
  // Handle dev-mode
  if (session_id === 'dev-mode-checkout' && registration_session_id) {
    const session = getRegistrationSessionById(registration_session_id as string);
    if (!session) {
      return res.status(404).json({
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Registration session not found',
        },
      });
    }
    
    // Check if gym was created (webhook should have processed it)
    const gym = getGymBySlug(session.slug);
    if (!gym) {
      return res.status(202).json({
        status: 'PROCESSING',
        message: 'Gym is being created. Please refresh in a moment.',
      });
    }
    
    // Return gym details (credentials are in the gym creation, but we need to get them from the session)
    // For now, return basic info - credentials should be shown via a different mechanism
    return res.json({
      success: true,
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        url: buildTenantUrl(gym.slug),
        staffLoginPath: gym.staff_login_path,
      },
      message: 'Gym created successfully! Check your email for admin credentials.',
    });
  }
  
  // Handle real Stripe session
  const registrationSession = session_id 
    ? getRegistrationSessionByStripeSessionId(session_id as string)
    : getRegistrationSessionById(registration_session_id as string);
  
  if (!registrationSession) {
    return res.status(404).json({
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Registration session not found',
      },
    });
  }
  
  // Check if gym was created
  const gym = getGymBySlug(registrationSession.slug);
  if (!gym) {
    return res.status(202).json({
      status: 'PROCESSING',
      message: 'Gym is being created. Please refresh in a moment.',
    });
  }
  
    res.json({
      success: true,
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        url: buildTenantUrl(gym.slug),
        staffLoginPath: gym.staff_login_path,
      },
      adminEmail: registrationSession.admin_email,
      message: 'Gym created successfully! Admin credentials were sent to your email.',
    });
}));

export default router;

