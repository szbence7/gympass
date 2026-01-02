import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { createCheckoutSession, handleWebhookEvent, handleCheckoutSessionCompleted, stripe } from '../services/stripeService';
import { env } from '../utils/env';
import { BadRequestError } from '../utils/errors';

const router = Router();

/**
 * Create Stripe Checkout Session for gym subscription
 * POST /api/stripe/create-checkout-session
 * Body: { registrationSessionId, gymSlug, gymName, adminEmail }
 */
router.post('/create-checkout-session', asyncHandler(async (req: Request, res: Response) => {
  const { registrationSessionId, gymSlug, gymName, adminEmail } = req.body;
  
  if (!registrationSessionId || !gymSlug || !gymName || !adminEmail) {
    throw new BadRequestError('Missing required fields');
  }
  
  const checkoutUrl = await createCheckoutSession({
    registrationSessionId,
    gymSlug,
    gymName,
    adminEmail,
  });
  
  res.json({ url: checkoutUrl });
}));

/**
 * Stripe webhook endpoint
 * POST /api/stripe/webhook
 * This endpoint receives events from Stripe
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // Handle dev-mode checkout (simulate webhook)
  const isDevMode = req.query.dev_mode === 'true' || req.body.dev_mode;
  if (isDevMode && env.NODE_ENV !== 'production') {
    const { registrationSessionId } = req.body;
    if (registrationSessionId) {
      try {
        // Simulate checkout.session.completed event
        const mockSession = {
          id: 'dev-mode-checkout',
          metadata: { registrationSessionId },
          subscription: null,
          customer: null,
          customer_email: null,
        };
        await handleCheckoutSessionCompleted(mockSession as any);
        return res.json({ received: true, dev_mode: true });
      } catch (err: any) {
        console.error(`Dev-mode webhook error: ${err.message}`);
        return res.status(500).send(`Webhook handler error: ${err.message}`);
      }
    }
  }
  
  const sig = req.headers['stripe-signature'] as string;
  
  if (!sig || !env.STRIPE_WEBHOOK_SECRET || !stripe) {
    console.error('Webhook signature or secret missing');
    return res.status(400).send('Webhook Error: Missing signature or secret');
  }
  
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook handler error: ${err.message}`);
    res.status(500).send(`Webhook handler error: ${err.message}`);
  }
});

export default router;



