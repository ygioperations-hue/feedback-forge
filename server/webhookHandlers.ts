import { getStripeSync } from './stripeClient';
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

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const rawEvent = JSON.parse(payload.toString());
      const eventType = rawEvent.type;
      const data = rawEvent.data?.object;

      if (!data) return;

      if (eventType === 'checkout.session.completed') {
        const customerId = data.customer;
        const subscriptionId = data.subscription;
        if (customerId && subscriptionId) {
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUserStripeSubscription(user.id, subscriptionId);
            console.log(`Updated subscription for user ${user.id}: ${subscriptionId}`);
          }
        }
      }

      if (eventType === 'customer.subscription.deleted') {
        const customerId = data.customer;
        if (customerId) {
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUserStripeSubscription(user.id, null);
            console.log(`Cleared subscription for user ${user.id}`);
          }
        }
      }

      if (eventType === 'customer.subscription.updated') {
        const customerId = data.customer;
        const subscriptionId = data.id;
        const status = data.status;
        if (customerId) {
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            if (status === 'active' || status === 'trialing') {
              await storage.updateUserStripeSubscription(user.id, subscriptionId);
            } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
              await storage.updateUserStripeSubscription(user.id, null);
            }
            console.log(`Subscription ${eventType} for user ${user.id}: ${status}`);
          }
        }
      }
    } catch (err: any) {
      console.error('Error processing webhook event for user update:', err.message);
    }
  }
}
