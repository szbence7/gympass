import Stripe from 'stripe';
import { env } from '../utils/env';
import { updateGymSubscription, getGymById } from '../db/registry';
import { buildPublicBaseUrl } from '../utils/urlBuilder';

if (!env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe integration will not work.');
}

const stripe = env.STRIPE_SECRET_KEY 
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null;

export interface CreateCheckoutSessionParams {
  registrationSessionId: string;
  gymSlug: string;
  gymName: string;
  adminEmail: string;
}

/**
 * Create a Stripe Checkout Session for gym subscription
 */
export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  // In production, Stripe is required
  if (env.NODE_ENV === 'production') {
    if (!stripe) {
      throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is required in production.');
    }
    
    if (!env.STRIPE_PRICE_ID) {
      throw new Error('STRIPE_PRICE_ID not configured. Required in production.');
    }
  } else {
    // In development, Stripe is optional - return a dev-mode response
    if (!stripe || !env.STRIPE_PRICE_ID) {
      console.warn('⚠️ Stripe not configured in development. Returning dev-mode checkout URL.');
      // Store fake checkout session ID for dev mode
      const { updateRegistrationSessionStripeSessionId } = require('../db/registrationSessions');
      updateRegistrationSessionStripeSessionId(params.registrationSessionId, 'dev-mode-checkout');
      
      // Trigger dev-mode webhook immediately to create gym
      // This simulates the payment success
      setTimeout(async () => {
        try {
          const mockSession = {
            id: 'dev-mode-checkout',
            metadata: { registrationSessionId: params.registrationSessionId },
            subscription: null,
            customer: null,
            customer_email: params.adminEmail,
          };
          await handleCheckoutSessionCompleted(mockSession);
        } catch (err) {
          console.error('Dev-mode webhook simulation failed:', err);
        }
      }, 1000);
      
      // Return a dev-mode URL that simulates successful payment
      return `${buildPublicBaseUrl()}/registration/success?session_id=dev-mode-checkout&registration_session_id=${params.registrationSessionId}`;
    }
  }
  
  const { registrationSessionId, gymSlug, gymName, adminEmail } = params;
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    customer_email: adminEmail,
    metadata: {
      registrationSessionId,
      gymSlug,
      gymName,
    },
    subscription_data: {
      metadata: {
        registrationSessionId,
        gymSlug,
      },
    },
    // Redirect back to our hosted success/cancel pages (served by backend, proxied in prod)
    success_url: `${buildPublicBaseUrl()}/registration/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${buildPublicBaseUrl()}/registration/cancel?session_id=${registrationSessionId}`,
  });
  
  // Store Stripe checkout session ID in registration session
  const { updateRegistrationSessionStripeSessionId } = require('../db/registrationSessions');
  updateRegistrationSessionStripeSessionId(registrationSessionId, session.id);
  
  return session.url || '';
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // In production, Stripe is required
  if (env.NODE_ENV === 'production') {
    if (!stripe) {
      throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is required in production.');
    }
  } else {
    // In development, skip webhook handling if Stripe is not configured
    if (!stripe) {
      console.warn('⚠️ Stripe not configured in development. Skipping webhook event.');
      return;
    }
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Handle dev-mode checkout (no real Stripe session)
  if (session.id === 'dev-mode-checkout' || !stripe) {
    const registrationSessionId = session.metadata?.registrationSessionId;
    if (!registrationSessionId) {
      console.error('No registrationSessionId in dev-mode session');
      return;
    }
    
    const { 
      getRegistrationSessionById, 
      markRegistrationSessionCompleted 
    } = require('../db/registrationSessions');
    
    const registrationSession = getRegistrationSessionById(registrationSessionId);
    if (!registrationSession) {
      console.error(`Registration session not found: ${registrationSessionId}`);
      return;
    }
    
    // Create gym for dev mode
    await createGymFromRegistrationSession(registrationSession);
    markRegistrationSessionCompleted(registrationSessionId);
    console.log(`✅ Gym ${registrationSession.slug} created in dev-mode (no payment)`);
    return;
  }
  
  const registrationSessionId = session.metadata?.registrationSessionId;
  
  if (!registrationSessionId) {
    console.error('No registrationSessionId in checkout session metadata');
    return;
  }
  
  const { 
    getRegistrationSessionById, 
    getRegistrationSessionByStripeSessionId,
    markRegistrationSessionCompleted 
  } = require('../db/registrationSessions');
  
  // Try to find by Stripe session ID if metadata is missing
  let registrationSession = getRegistrationSessionById(registrationSessionId);
  if (!registrationSession) {
    registrationSession = getRegistrationSessionByStripeSessionId(session.id);
  }
  
  if (!registrationSession) {
    console.error(`Registration session not found: ${registrationSessionId} or ${session.id}`);
    return;
  }
  
  // Check if session is expired
  if (registrationSession.expires_at < Date.now()) {
    console.error(`Registration session expired: ${registrationSessionId}`);
    return;
  }
  
  // Check if already completed
  if (registrationSession.status !== 'PENDING_PAYMENT') {
    console.log(`Registration session already processed: ${registrationSessionId} (status: ${registrationSession.status})`);
    return;
  }
  
  // Create the gym (this is the first time we create it)
  const gymResult = await createGymFromRegistrationSession(registrationSession);
  
  // Subscription should be created now
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  
  // Get subscription details and update gym
  if (stripe && subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    updateGymSubscription(gymResult.gym.id, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      current_period_end: (subscription as any).current_period_end,
      plan_id: subscription.items.data[0]?.price.id || undefined,
      billing_email: session.customer_email || session.customer_details?.email || undefined,
      status: 'ACTIVE', // Activate gym after successful payment
    });
    
    console.log(`✅ Gym ${registrationSession.slug} created and activated with subscription ${subscriptionId}`);
  }
  
  // Mark registration session as completed
  markRegistrationSessionCompleted(registrationSessionId);
}

/**
 * Helper: Create gym from registration session
 */
async function createGymFromRegistrationSession(registrationSession: any) {
  const { createNewGym } = require('../services/gymService');
  const { getGymBySlug, updateGymSubscription } = require('../db/registry');
  
  const result = await createNewGym({
    name: registrationSession.gym_name,
    slug: registrationSession.slug,
    adminEmail: registrationSession.admin_email,
    companyName: registrationSession.company_name,
    taxNumber: registrationSession.tax_number,
    addressLine1: registrationSession.address_line1,
    addressLine2: registrationSession.address_line2 || undefined,
    city: registrationSession.city,
    postalCode: registrationSession.postal_code,
    country: registrationSession.country,
    contactName: registrationSession.contact_name,
    contactEmail: registrationSession.contact_email,
    contactPhone: registrationSession.contact_phone,
  });
  
  // Activate gym after creation (for dev mode, no payment needed)
  const gym = getGymBySlug(registrationSession.slug);
  if (gym) {
    updateGymSubscription(gym.id, {
      status: 'ACTIVE', // Activate gym
    });
  }
  
  // Log admin credentials for dev/testing (not in production)
  if (env.NODE_ENV !== 'production') {
    console.log(`\n🔐 Staff Admin Credentials for ${registrationSession.slug}:`);
    console.log(`   Email: ${result.adminCredentials.email}`);
    console.log(`   Password: ${result.adminCredentials.password}`);
    console.log(`   Staff Login Path: /staff/${result.gym.staffLoginPath}\n`);
  }
  
  return result;
}

/**
 * Handle subscription updates (renewals, status changes)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const registrationSessionId = subscription.metadata?.registrationSessionId;
  const gymSlug = subscription.metadata?.gymSlug;
  
  if (!registrationSessionId && !gymSlug) {
    console.error('No registrationSessionId or gymSlug in subscription metadata');
    return;
  }
  
  // Find gym by slug (since we might not have gymId in old metadata)
  let gymId: string | undefined;
  if (gymSlug) {
    const gym = getGymById(gymSlug); // This won't work, need to use getGymBySlug
    const { getGymBySlug } = require('../db/registry');
    const gymBySlug = getGymBySlug(gymSlug);
    if (gymBySlug) {
      gymId = gymBySlug.id;
    }
  }
  
  if (!gymId) {
    console.error(`Gym not found for subscription update: ${registrationSessionId || gymSlug}`);
    return;
  }
  
  updateGymSubscription(gymId, {
    subscription_status: subscription.status,
    current_period_end: (subscription as any).current_period_end,
    plan_id: subscription.items.data[0]?.price.id || undefined,
  });
  
  console.log(`✅ Subscription updated for gym ${gymId}: ${subscription.status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const registrationSessionId = subscription.metadata?.registrationSessionId;
  const gymSlug = subscription.metadata?.gymSlug;
  
  if (!registrationSessionId && !gymSlug) {
    console.error('No registrationSessionId or gymSlug in subscription metadata');
    return;
  }
  
  // Find gym by slug
  let gymId: string | undefined;
  if (gymSlug) {
    const { getGymBySlug } = require('../db/registry');
    const gym = getGymBySlug(gymSlug);
    if (gym) {
      gymId = gym.id;
    }
  }
  
  if (!gymId) {
    console.error(`Gym not found for subscription deletion: ${registrationSessionId || gymSlug}`);
    return;
  }
  
  updateGymSubscription(gymId, {
    subscription_status: 'canceled',
  });
  
  console.log(`✅ Subscription canceled for gym ${gymId}`);
}

/**
 * Handle failed payments
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!stripe || !subscriptionId) return;
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const registrationSessionId = subscription.metadata?.registrationSessionId;
  const gymSlug = subscription.metadata?.gymSlug;
  
  if (!registrationSessionId && !gymSlug) {
    console.error('No registrationSessionId or gymSlug in subscription metadata');
    return;
  }
  
  // Find gym by slug
  let gymId: string | undefined;
  if (gymSlug) {
    const { getGymBySlug } = require('../db/registry');
    const gym = getGymBySlug(gymSlug);
    if (gym) {
      gymId = gym.id;
    }
  }
  
  if (!gymId) {
    console.error(`Gym not found for payment failure: ${registrationSessionId || gymSlug}`);
    return;
  }
  
  updateGymSubscription(gymId, {
    subscription_status: 'past_due',
  });
  
  console.log(`⚠️ Payment failed for gym ${gymId}`);
}

export { stripe, handleCheckoutSessionCompleted };

