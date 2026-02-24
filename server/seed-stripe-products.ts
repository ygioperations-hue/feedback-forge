import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "name:'FeedbackForge'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping creation');
    for (const p of existingProducts.data) {
      const prices = await stripe.prices.list({ product: p.id, active: true });
      console.log(`  Product: ${p.name} (${p.id})`);
      for (const price of prices.data) {
        console.log(`    Price: ${price.id} - $${(price.unit_amount || 0) / 100}/${price.recurring?.interval}`);
      }
    }
    return;
  }

  const product = await stripe.products.create({
    name: 'FeedbackForge',
    description: 'Feedback collection and management tool with AI-powered insights',
    metadata: {
      app: 'feedbackforge',
    },
  });
  console.log(`Created product: ${product.id}`);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 2900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'monthly' },
  });
  console.log(`Created monthly price: ${monthlyPrice.id} ($29/month)`);

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 24900,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'yearly' },
  });
  console.log(`Created yearly price: ${yearlyPrice.id} ($249/year)`);

  console.log('\nDone! Products and prices created in Stripe.');
  console.log('They will be synced to the database automatically via webhooks.');
}

createProducts().catch(console.error);
