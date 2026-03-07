import Stripe from 'stripe';

let stripe: Stripe | null = null;

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Add it to your environment secrets.');
  }
  return secretKey;
}

export function getStripeClient(): Stripe {
  if (stripe) return stripe;
  stripe = new Stripe(getStripeSecretKey(), {
    apiVersion: '2025-08-27.basil' as any,
  });
  return stripe;
}

export function getStripePublishableKey(): string {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not set. Add it to your environment secrets.');
  }
  return publishableKey;
}
