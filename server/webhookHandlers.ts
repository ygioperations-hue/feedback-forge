import { getStripeClient } from "./stripeClient";
import { storage } from "./storage";
import { GROWTH_PLAN_KEY } from "./monthlyQuota";
import { reconcileStripeSubscription } from "./stripeSubscriptions";

export class WebhookSignatureError extends Error {}

function idOf(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return undefined;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) throw new Error("Stripe webhook payload must be a Buffer");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

    let event: any;
    try {
      event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      throw new WebhookSignatureError(`Webhook signature verification failed: ${error.message}`);
    }

    const data = event.data?.object;
    if (!data) return;

    switch (event.type) {
      case "checkout.session.completed":
        await WebhookHandlers.handleCheckoutCompleted(data);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await WebhookHandlers.handleSubscriptionChanged(data);
        break;
    }
  }

  static async handleCheckoutCompleted(data: any): Promise<void> {
    const customerId = idOf(data.customer);
    if (!customerId) throw new Error("Checkout session has no Stripe customer");
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) throw new Error(`No local user found for Stripe customer ${customerId}`);

    const metadata = data.metadata || {};
    if (data.mode === "payment" || metadata.plan === "lifetime") {
      const plan = metadata.planId ? await storage.getPlanById(metadata.planId) : undefined;
      if (!plan || plan.key !== "lifetime") throw new Error("Lifetime checkout metadata does not match a configured plan");
      await storage.updateUserPlanType(user.id, "lifetime_pro");

      const activeSub = await storage.getActiveSubscription(user.id);
      if (activeSub && activeSub.plan.key !== GROWTH_PLAN_KEY && activeSub.stripeSubscriptionId) {
        await getStripeClient().subscriptions.cancel(activeSub.stripeSubscriptionId);
        await storage.cancelSubscriptionAndFallback(activeSub.stripeSubscriptionId);
      }
      return;
    }

    const subscriptionId = idOf(data.subscription);
    if (!subscriptionId) throw new Error("Subscription checkout session has no subscription");
    await reconcileStripeSubscription(subscriptionId, customerId);
  }

  static async handleSubscriptionChanged(data: any): Promise<void> {
    const subscriptionId = idOf(data);
    if (!subscriptionId) throw new Error("Stripe subscription event has no subscription ID");
    await reconcileStripeSubscription(subscriptionId, idOf(data.customer));
  }
}
