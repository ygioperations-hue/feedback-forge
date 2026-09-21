import test from "node:test";
import assert from "node:assert/strict";
import { checkoutConfig, findPlanByStripePriceId, planTypeForPlan } from "../server/billingPlans";

test("Growth and legacy subscriptions map to distinct account plan types", () => {
  assert.equal(planTypeForPlan({ key: "growth_monthly", interval: "month" }), "growth");
  assert.equal(planTypeForPlan({ key: "legacy_monthly", interval: "month" }), "monthly");
  assert.equal(planTypeForPlan({ key: "legacy_yearly", interval: "year" }), "yearly");
});

test("Growth checkout uses the dedicated plan and recurring Stripe mode", () => {
  assert.deepEqual(checkoutConfig("growth"), { planKey: "growth_monthly", mode: "subscription" });
  assert.deepEqual(checkoutConfig("lifetime"), { planKey: "lifetime", mode: "payment" });
});

test("Stripe subscription matching requires an exact price ID and never falls back by interval", () => {
  const plans = [
    { key: "legacy_monthly", interval: "month", stripePriceId: "price_29" },
    { key: "growth_monthly", interval: "month", stripePriceId: "price_19" },
  ];
  assert.equal(findPlanByStripePriceId(plans, "price_19")?.key, "growth_monthly");
  assert.equal(findPlanByStripePriceId(plans, "price_unknown"), undefined);
  assert.equal(findPlanByStripePriceId(plans, null), undefined);
});
