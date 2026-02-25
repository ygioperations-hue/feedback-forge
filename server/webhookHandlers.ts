import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload.toString());
    }

    const eventType = event.type || event.data?.type;
    const data = event.data?.object;

    if (!data) return;

    try {
      if (eventType === 'checkout.session.completed') {
        await WebhookHandlers.handleCheckoutCompleted(data);
      }

      if (eventType === 'customer.subscription.updated') {
        await WebhookHandlers.handleSubscriptionUpdated(data);
      }

      if (eventType === 'customer.subscription.deleted') {
        await WebhookHandlers.handleSubscriptionDeleted(data);
      }
    } catch (err: any) {
      console.error('Error processing webhook event:', err.message);
    }
  }

  static async handleCheckoutCompleted(data: any): Promise<void> {
    const customerId = data.customer;
    const stripeSubscriptionId = data.subscription;
    const metadata = data.metadata || {};

    if (!customerId || !stripeSubscriptionId) return;

    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error(`Webhook: No user found for Stripe customer ${customerId}`);
      return;
    }

    const planId = metadata.planId;
    if (!planId) {
      console.error(`Webhook: No planId in checkout session metadata`);
      return;
    }

    const existingSub = await storage.getSubscriptionByStripeId(stripeSubscriptionId);
    if (existingSub) {
      console.log(`Subscription already exists for ${stripeSubscriptionId}, skipping creation`);
      return;
    }

    let periodStart: Date | undefined;
    let periodEnd: Date | undefined;

    try {
      const stripe = await getUncachableStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      periodStart = new Date((stripeSub as any).current_period_start * 1000);
      periodEnd = new Date((stripeSub as any).current_period_end * 1000);
    } catch (err: any) {
      console.error('Failed to retrieve subscription from Stripe:', err.message);
      periodStart = new Date();
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await storage.createSubscription({
      userId: user.id,
      planId,
      stripeSubscriptionId,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });

    console.log(`Created subscription for user ${user.id}: ${stripeSubscriptionId}`);
  }

  static async handleSubscriptionUpdated(data: any): Promise<void> {
    const stripeSubId = data.id;
    const status = data.status;
    const cancelAtPeriodEnd = data.cancel_at_period_end ?? false;

    const existing = await storage.getSubscriptionByStripeId(stripeSubId);
    if (!existing) {
      console.log(`Webhook: No local subscription found for ${stripeSubId}`);
      return;
    }

    const updateData: any = {
      status,
      cancelAtPeriodEnd,
    };

    if (data.current_period_start) {
      updateData.currentPeriodStart = new Date(data.current_period_start * 1000);
    }
    if (data.current_period_end) {
      updateData.currentPeriodEnd = new Date(data.current_period_end * 1000);
    }

    await storage.updateSubscriptionByStripeId(stripeSubId, updateData);
    console.log(`Updated subscription ${stripeSubId}: status=${status}, cancelAtPeriodEnd=${cancelAtPeriodEnd}`);
  }

  static async handleSubscriptionDeleted(data: any): Promise<void> {
    const stripeSubId = data.id;

    const existing = await storage.getSubscriptionByStripeId(stripeSubId);
    if (!existing) {
      console.log(`Webhook: No local subscription found for ${stripeSubId}`);
      return;
    }

    await storage.updateSubscriptionByStripeId(stripeSubId, {
      status: 'canceled',
      cancelAtPeriodEnd: false,
    });

    console.log(`Canceled subscription ${stripeSubId}`);
  }
}
