import test from "node:test";
import assert from "node:assert/strict";
import { checkoutConfig, findPlanByStripePriceId, stripePriceMatchesPlan } from "../server/billingPlans";

test("Growth checkout uses the dedicated plan and recurring Stripe mode", () => {
  assert.deepEqual(checkoutConfig("growth"), { planKey: "growth_monthly", mode: "subscription" });
  assert.deepEqual(checkoutConfig("lifetime"), { planKey: "lifetime", mode: "payment" });
});

test("Stripe price setup accepts only the configured amount, currency, and recurrence", () => {
  const growth = { price: 1900, interval: "month" };
  assert.equal(stripePriceMatchesPlan({ currency: "usd", unit_amount: 1900, recurring: { interval: "month" } }, growth), true);
  assert.equal(stripePriceMatchesPlan({ currency: "usd", unit_amount: 2900, recurring: { interval: "month" } }, growth), false);
  assert.equal(stripePriceMatchesPlan({ currency: "usd", unit_amount: 1900, recurring: null }, growth), false);
  assert.equal(stripePriceMatchesPlan({ currency: "eur", unit_amount: 1900, recurring: { interval: "month" } }, growth), false);
});

test("Stripe subscription matching requires an exact price ID and never falls back by interval", () => {
  const plans = [
    { key: "growth_monthly", interval: "month", stripePriceId: "price_19" },
  ];
  assert.equal(findPlanByStripePriceId(plans, "price_19")?.key, "growth_monthly");
  assert.equal(findPlanByStripePriceId(plans, "price_unknown"), undefined);
  assert.equal(findPlanByStripePriceId(plans, null), undefined);
});
