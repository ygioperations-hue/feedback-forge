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

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured. Webhooks cannot be processed without signature verification.');
    }

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    const eventType = event.type;
    const data = event.data?.object;

    console.log(`Stripe webhook: ${eventType}`);

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
    const mode = data.mode;

    console.log(`Checkout completed: customer=${customerId}, subscription=${stripeSubscriptionId}, mode=${mode}`);

    if (!customerId) {
      console.log('Checkout: Missing customer ID');
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

    if (mode === 'payment' || metadata.plan === 'lifetime') {
      console.log(`Lifetime payment completed for user ${user.id}`);
      await storage.updateUserPlanType(user.id, 'lifetime_pro');

      try {
        const activeSub = await storage.getActiveSubscription(user.id);
        if (activeSub && activeSub.stripeSubscriptionId) {
          const stripe = await getUncachableStripeClient();
          await stripe.subscriptions.cancel(activeSub.stripeSubscriptionId);
          await storage.updateSubscriptionByStripeId(activeSub.stripeSubscriptionId, { status: 'canceled' });
          console.log(`Canceled existing subscription ${activeSub.stripeSubscriptionId} after lifetime purchase`);
        }
      } catch (cancelErr: any) {
        console.error('Failed to cancel existing subscription after lifetime purchase:', cancelErr.message);
      }

      return;
    }

    if (!stripeSubscriptionId) {
      console.log('Checkout: Missing subscription ID for subscription-mode checkout');
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

    if (!user.planType?.startsWith('lifetime')) {
      const plan = await storage.getPlanById(planId);
      if (plan) {
        const newPlanType = plan.interval === 'year' ? 'yearly' : 'monthly';
        await storage.updateUserPlanType(user.id, newPlanType);
      }
    }
  }

  static async handleSubscriptionUpdated(data: any): Promise<void> {
    const stripeSubId = data.id;
    const status = data.status;
    const cancelAtPeriodEnd = data.cancel_at_period_end ?? false;
    const customerId = data.customer;

    

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

            if (!user.planType?.startsWith('lifetime')) {
              const newPlanType = matchedPlan.interval === 'year' ? 'yearly' : 'monthly';
              await storage.updateUserPlanType(user.id, newPlanType);
            }
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

    const priceId = itemData?.price?.id || data.plan?.id;
    if (priceId) {
      const plans = await storage.getPlans();
      const matchedPlan = plans.find(p => p.stripePriceId === priceId);
      if (matchedPlan && matchedPlan.id !== existing.planId) {
        updateData.planId = matchedPlan.id;
      }
    }

    await storage.updateSubscriptionByStripeId(stripeSubId, updateData);

    if (customerId && updateData.planId) {
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user && !user.planType?.startsWith('lifetime')) {
        const plans = await storage.getPlans();
        const newPlan = plans.find(p => p.id === updateData.planId);
        if (newPlan) {
          const newPlanType = newPlan.interval === 'year' ? 'yearly' : 'monthly';
          await storage.updateUserPlanType(user.id, newPlanType);
        }
      }
    }
  }

  static async handleSubscriptionDeleted(data: any): Promise<void> {
    const stripeSubId = data.id;
    const customerId = data.customer;

    const existing = await storage.getSubscriptionByStripeId(stripeSubId);
    if (!existing) {
      console.log(`Webhook: No local subscription found for ${stripeSubId}`);
      return;
    }

    await storage.updateSubscriptionByStripeId(stripeSubId, {
      status: 'canceled',
      cancelAtPeriodEnd: false,
    });

    if (customerId) {
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user && !user.planType?.startsWith('lifetime')) {
        await storage.updateUserPlanType(user.id, 'none');
      }
    }
  }
}
