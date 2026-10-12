import test from "node:test";
import assert from "node:assert/strict";
import { reconcileStripeSubscription } from "../server/stripeSubscriptions";

const growthPlan = { id: "plan_growth", key: "growth_monthly", stripePriceId: "price_growth" };
const user = { id: "user_1", planType: "lifetime_pro" };

function fakeStorage() {
  const applied: any[] = [];
  const canceled: string[] = [];
  return {
    applied,
    canceled,
    storage: {
      getSubscriptionByStripeId: async () => undefined,
      getUserByStripeCustomerId: async () => user,
      getPlans: async () => [growthPlan],
      applyGrowthSubscription: async (subscription: any) => {
        applied.push(subscription);
        return subscription;
      },
      cancelSubscriptionAndFallback: async (id: string) => {
        canceled.push(id);
        return { id };
      },
    } as any,
  };
}

test("subscription reconciliation uses Stripe current state and exact Growth price", async () => {
  const fake = fakeStorage();
  const result = await reconcileStripeSubscription("sub_1", undefined, {
    retrieveSubscription: async () => ({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_592_000,
      items: { data: [{ price: { id: "price_growth" } }] },
    }),
    storage: fake.storage,
  });
  assert.deepEqual(result, { status: "active", recorded: true });
  assert.equal(fake.applied.length, 1);
  assert.equal(fake.applied[0].planId, "plan_growth");
});

test("unknown active Stripe prices fail so the webhook can retry", async () => {
  const fake = fakeStorage();
  await assert.rejects(
    reconcileStripeSubscription("sub_unknown", undefined, {
      retrieveSubscription: async () => ({
        customer: "cus_1",
        status: "active",
        items: { data: [{ price: { id: "price_unknown" } }] },
      }),
      storage: fake.storage,
    }),
    /unknown price/,
  );
  assert.equal(fake.applied.length, 0);
});

test("a stale webhook converges to Stripe cancellation state", async () => {
  const fake = fakeStorage();
  fake.storage.getSubscriptionByStripeId = async () => ({ id: "local_sub" });
  await reconcileStripeSubscription("sub_1", "cus_1", {
    retrieveSubscription: async () => { throw { code: "resource_missing" }; },
    storage: fake.storage,
  });
  assert.deepEqual(fake.canceled, ["sub_1"]);
  assert.equal(fake.applied.length, 0);
});
