import { storage } from './storage';
import { getUncachableStripeClient } from './stripeClient';

export async function ensureStripePrices() {
  try {
    const stripe = await getUncachableStripeClient();
    const allPlans = await storage.getPlans();

    if (allPlans.length === 0) {
      console.log('No plans found in database, skipping Stripe price setup');
      return;
    }

    const plansNeedingPrices = allPlans.filter(p => !p.stripePriceId);
    if (plansNeedingPrices.length === 0) {
      console.log('All plans already have Stripe price IDs');
      return;
    }

    const existingProducts = await stripe.products.search({ query: "name:'FeedbackForge'" });
    let productId: string;

    if (existingProducts.data.length > 0) {
      productId = existingProducts.data[0].id;
      console.log(`Using existing Stripe product: ${productId}`);
    } else {
      const product = await stripe.products.create({
        name: 'FeedbackForge',
        description: 'Feedback collection and management tool with AI-powered insights',
        metadata: { app: 'feedbackforge' },
      });
      productId = product.id;
      console.log(`Created Stripe product: ${productId}`);
    }

    for (const plan of plansNeedingPrices) {
      const existingPrices = await stripe.prices.list({
        product: productId,
        active: true,
      });

      const isOneTime = plan.interval === 'lifetime';
      const existingPrice = existingPrices.data.find(
        p => isOneTime
          ? (p.unit_amount === plan.price && !p.recurring)
          : (p.unit_amount === plan.price && p.recurring?.interval === plan.interval)
      );

      if (existingPrice) {
        await storage.updatePlanStripePriceId(plan.id, existingPrice.id);
        console.log(`Linked existing Stripe price ${existingPrice.id} to ${plan.name} plan`);
      } else {
        const priceParams: any = {
          product: productId,
          unit_amount: plan.price,
          currency: 'usd',
          metadata: { plan: plan.name.toLowerCase() },
        };
        if (!isOneTime) {
          priceParams.recurring = { interval: plan.interval as 'month' | 'year' };
        }
        const price = await stripe.prices.create(priceParams);
        await storage.updatePlanStripePriceId(plan.id, price.id);
        console.log(`Created Stripe price ${price.id} for ${plan.name} plan ($${plan.price / 100}${isOneTime ? ' one-time' : '/' + plan.interval})`);
      }
    }

    console.log('Stripe prices synced successfully');
  } catch (err: any) {
    console.error('Failed to ensure Stripe prices:', err?.message);
  }
}
