import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

function parseStripeDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    return new Date(value * 1000);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

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

    let event: any;
    try {
      event = JSON.parse(payload.toString());
    } catch (parseErr: any) {
      console.error('Failed to parse webhook payload:', parseErr.message);
      throw parseErr;
    }

    const eventType = event.type;
    const data = event.data?.object;

    console.log(`Stripe webhook received: ${eventType}`);

    if (!data) {
      console.log('Webhook: No data object in event');
      return;
    }

    try {
      if (eventType === 'checkout.session.completed') {
        await WebhookHandlers.handleCheckoutCompleted(data);
      }

      if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
        await WebhookHandlers.handleSubscriptionUpdated(data);
      }

      if (eventType === 'customer.subscription.deleted') {
        await WebhookHandlers.handleSubscriptionDeleted(data);
      }
    } catch (err: any) {
      console.error('Error processing webhook event:', err.message, err.stack);
    }
  }

  static async handleCheckoutCompleted(data: any): Promise<void> {
    const customerId = data.customer;
    const stripeSubscriptionId = data.subscription;
    const metadata = data.metadata || {};

    console.log(`Checkout completed: customer=${customerId}, subscription=${stripeSubscriptionId}, metadata=${JSON.stringify(metadata)}`);

    if (!customerId || !stripeSubscriptionId) {
      console.log('Checkout: Missing customer or subscription ID');
      return;
    }

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

    let periodStart: Date = new Date();
    let periodEnd: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      const stripe = await getUncachableStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const subAny = stripeSub as any;
      const itemData = subAny.items?.data?.[0];
      const parsedStart = parseStripeDate(subAny.current_period_start)
        || parseStripeDate(itemData?.current_period_start)
        || parseStripeDate(subAny.start_date);
      const parsedEnd = parseStripeDate(subAny.current_period_end)
        || parseStripeDate(itemData?.current_period_end);
      if (parsedStart) periodStart = parsedStart;
      if (parsedEnd) periodEnd = parsedEnd;
      console.log(`Stripe subscription retrieved: start=${periodStart.toISOString()}, end=${periodEnd.toISOString()}`);
    } catch (err: any) {
      console.error('Failed to retrieve subscription from Stripe:', err.message);
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
    const customerId = data.customer;

    console.log(`Subscription updated: id=${stripeSubId}, status=${status}, customer=${customerId}`);

    const existing = await storage.getSubscriptionByStripeId(stripeSubId);
    if (!existing) {
      console.log(`Webhook: No local subscription found for ${stripeSubId}, attempting to create from event data`);

      if (customerId && (status === 'active' || status === 'trialing')) {
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const plans = await storage.getPlans();
          const priceId = data.items?.data?.[0]?.price?.id || data.plan?.id;
          let matchedPlan = plans.find(p => p.stripePriceId === priceId);
          if (!matchedPlan) {
            const interval = data.items?.data?.[0]?.price?.recurring?.interval || data.plan?.interval;
            matchedPlan = plans.find(p => p.interval === interval);
          }
          if (!matchedPlan && plans.length > 0) {
            matchedPlan = plans[0];
          }

          if (matchedPlan) {
            const evtItemData = data.items?.data?.[0];
            const periodStart = parseStripeDate(data.current_period_start)
              || parseStripeDate(evtItemData?.current_period_start)
              || parseStripeDate(data.start_date)
              || new Date();
            const periodEnd = parseStripeDate(data.current_period_end)
              || parseStripeDate(evtItemData?.current_period_end)
              || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await storage.createSubscription({
              userId: user.id,
              planId: matchedPlan.id,
              stripeSubscriptionId: stripeSubId,
              status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd,
            });
            console.log(`Created subscription from update event for user ${user.id}: ${stripeSubId}`);
          }
        }
      }
      return;
    }

    const updateData: any = {
      status,
      cancelAtPeriodEnd,
    };

    const itemData = data.items?.data?.[0];
    const parsedStart = parseStripeDate(data.current_period_start)
      || parseStripeDate(itemData?.current_period_start)
      || parseStripeDate(data.start_date);
    const parsedEnd = parseStripeDate(data.current_period_end)
      || parseStripeDate(itemData?.current_period_end);
    if (parsedStart) updateData.currentPeriodStart = parsedStart;
    if (parsedEnd) updateData.currentPeriodEnd = parsedEnd;

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
