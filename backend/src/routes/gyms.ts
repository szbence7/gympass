import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { listGyms, getGymBySlug } from '../db/registry';
import { createRegistrationSession, getRegistrationSessionBySlug } from '../db/registrationSessions';
import { createCheckoutSession } from '../services/stripeService';
import { BadRequestError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../utils/env';

const router = Router();

const registerGymSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  // Business/Contact info (required)
  companyName: z.string().min(1),
  taxNumber: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1).default('HU'),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
});

// Public endpoint - no auth required
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const body = registerGymSchema.parse(req.body);

  // Validate slug format
  if (!/^[a-z0-9-]{3,30}$/.test(body.slug)) {
    throw new BadRequestError('Invalid slug. Must be 3-30 characters, lowercase letters, numbers, and hyphens only.');
  }

  // Check if slug already exists in gyms
  const existingGym = getGymBySlug(body.slug);
  if (existingGym) {
    throw new BadRequestError(`Gym with slug "${body.slug}" already exists.`);
  }

  // Clean up expired sessions for this slug
  const { getExpiredSessions, markRegistrationSessionExpired } = require('../db/registrationSessions');
  const expiredSessions = getExpiredSessions();
  expiredSessions
    .filter((s: any) => s.slug === body.slug)
    .forEach((s: any) => markRegistrationSessionExpired(s.id));

  // Check if slug is reserved in active (non-expired) pending registration sessions
  const existingSession = getRegistrationSessionBySlug(body.slug);
  if (existingSession) {
    throw new BadRequestError(`Slug "${body.slug}" is currently reserved. Please try again later or choose a different slug.`);
  }

  // CRITICAL: Create Stripe checkout session FIRST
  // Only AFTER Stripe checkout session is successfully created, we create registration_session
  // This ensures no slug reservation happens if Stripe fails
  let checkoutUrl: string;
  let stripeCheckoutSessionId: string | null = null;
  
  try {
    // Create Stripe checkout session with registration data in metadata
    // We'll create registration_session only after this succeeds
    if (env.NODE_ENV === 'production') {
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
        throw new BadRequestError('Stripe is not configured. Payment processing is required.');
      }
      
      const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        customer_email: body.adminEmail,
        metadata: {
          // Store all registration data in Stripe metadata (temporary, until we create registration_session)
          gymSlug: body.slug,
          gymName: body.name,
          adminEmail: body.adminEmail,
          companyName: body.companyName,
          taxNumber: body.taxNumber,
          addressLine1: body.addressLine1,
          addressLine2: body.addressLine2 || '',
          city: body.city,
          postalCode: body.postalCode,
          country: body.country,
          contactName: body.contactName,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
        },
        subscription_data: {
          metadata: {
            gymSlug: body.slug,
          },
        },
        success_url: `${env.PUBLIC_BASE_URL}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.PUBLIC_BASE_URL}/registration/cancel`,
      });
      
      checkoutUrl = session.url || '';
      stripeCheckoutSessionId = session.id;
    } else {
      // Development: dev-mode if Stripe not configured
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
        console.warn('⚠️ Stripe not configured in development. Using dev-mode.');
        checkoutUrl = `${env.PUBLIC_BASE_URL}/registration/success?session_id=dev-mode-checkout`;
        stripeCheckoutSessionId = 'dev-mode-checkout';
      } else {
        const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: env.STRIPE_PRICE_ID,
              quantity: 1,
            },
          ],
          customer_email: body.adminEmail,
          metadata: {
            gymSlug: body.slug,
            gymName: body.name,
            adminEmail: body.adminEmail,
            companyName: body.companyName,
            taxNumber: body.taxNumber,
            addressLine1: body.addressLine1,
            addressLine2: body.addressLine2 || '',
            city: body.city,
            postalCode: body.postalCode,
            country: body.country,
            contactName: body.contactName,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
          },
          subscription_data: {
            metadata: {
              gymSlug: body.slug,
            },
          },
          success_url: `${env.PUBLIC_BASE_URL}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.PUBLIC_BASE_URL}/registration/cancel`,
        });
        
        checkoutUrl = session.url || '';
        stripeCheckoutSessionId = session.id;
      }
    }
    
    // ONLY NOW create registration session (after Stripe checkout session is successfully created)
    // This ensures slug is only reserved if Stripe checkout was created
    const registrationSessionId = uuidv4();
    createRegistrationSession({
      id: registrationSessionId,
      slug: body.slug,
      gym_name: body.name,
      admin_email: body.adminEmail,
      company_name: body.companyName,
      tax_number: body.taxNumber,
      address_line1: body.addressLine1,
      address_line2: body.addressLine2,
      city: body.city,
      postal_code: body.postalCode,
      country: body.country,
      contact_name: body.contactName,
      contact_email: body.contactEmail,
      contact_phone: body.contactPhone,
    });
    
    // Store Stripe checkout session ID in registration session
    const { updateRegistrationSessionStripeSessionId } = require('../db/registrationSessions');
    updateRegistrationSessionStripeSessionId(registrationSessionId, stripeCheckoutSessionId);
    
    // Update Stripe checkout session metadata with registration session ID
    if (stripeCheckoutSessionId && stripeCheckoutSessionId !== 'dev-mode-checkout' && env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
      await stripe.checkout.sessions.update(stripeCheckoutSessionId, {
        metadata: {
          ...body,
          registrationSessionId: registrationSessionId,
        },
      });
    }

    res.status(200).json({
      success: true,
      checkoutUrl,
      sessionId: registrationSessionId,
      message: 'Registration session created. Please complete payment to activate your gym.',
    });
  } catch (error: any) {
    // If Stripe checkout creation fails, no registration_session is created
    // This ensures we don't leave dangling reservations
    throw error;
  }
}));

// List all gyms (for admin/debugging - could add auth later)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const gyms = listGyms();
  res.json(gyms);
}));

export default router;

