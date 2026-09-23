import { storage } from "./storage";
import { getStripeClient } from "./stripeClient";
import { findPlanByStripePriceId } from "./billingPlans";
import { GROWTH_PLAN_KEY } from "./monthlyQuota";

type ReconciliationStorage = Pick<typeof storage,
  | "getSubscriptionByStripeId"
  | "getUserByStripeCustomerId"
  | "getPlans"
  | "applyGrowthSubscription"
  | "cancelSubscriptionAndFallback"
>;

export type SubscriptionReconciliationDependencies = {
  retrieveSubscription: (subscriptionId: string) => Promise<any>;
  storage: ReconciliationStorage;
};

export type SubscriptionReconciliationResult = { status: string; recorded: boolean };

export function isStripeMissingResource(error: unknown): boolean {
  const value = error as { code?: string; statusCode?: number; raw?: { code?: string } };
  return value?.code === "resource_missing" || value?.raw?.code === "resource_missing" || value?.statusCode === 404;
}

function stripeId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return undefined;
}

function stripeDate(value: unknown): Date | undefined {
  return typeof value === "number" ? new Date(value * 1000) : undefined;
}

export async function reconcileStripeSubscription(
  subscriptionId: string,
  hintedCustomerId?: string,
  dependencies?: SubscriptionReconciliationDependencies,
): Promise<SubscriptionReconciliationResult> {
  const deps = dependencies ?? {
    retrieveSubscription: (id: string) => getStripeClient().subscriptions.retrieve(id),
    storage,
  };

  let remote: any;
  try {
    remote = await deps.retrieveSubscription(subscriptionId);
  } catch (error) {
    if (!isStripeMissingResource(error)) throw error;
    const canceled = await deps.storage.cancelSubscriptionAndFallback(subscriptionId);
    return { status: "canceled", recorded: !!canceled };
  }

  const status = String(remote.status || "incomplete");
  const active = status === "active" || status === "trialing";
  const existing = await deps.storage.getSubscriptionByStripeId(subscriptionId);
  const item = remote.items?.data?.[0];
  const priceId = stripeId(item?.price) || stripeId(remote.plan);
  const plans = await deps.storage.getPlans();
  const matchedPlan = findPlanByStripePriceId(plans, priceId);

  if (active && (!matchedPlan || matchedPlan.key !== GROWTH_PLAN_KEY)) {
    throw new Error(`Active Stripe subscription ${subscriptionId} has an unknown price`);
  }

  if (!matchedPlan) {
    if (existing) await deps.storage.cancelSubscriptionAndFallback(subscriptionId);
    return { status, recorded: !!existing };
  }

  const customerId = stripeId(remote.customer) || hintedCustomerId;
  if (!customerId) throw new Error(`Stripe subscription ${subscriptionId} has no customer`);
  const user = await deps.storage.getUserByStripeCustomerId(customerId);
  if (!user) throw new Error(`No local user found for Stripe customer ${customerId}`);

  const periodStart = stripeDate(remote.current_period_start)
    || stripeDate(item?.current_period_start)
    || stripeDate(remote.start_date)
    || new Date();
  const periodEnd = stripeDate(remote.current_period_end)
    || stripeDate(item?.current_period_end)
    || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await deps.storage.applyGrowthSubscription({
    userId: user.id,
    planId: matchedPlan.id,
    stripeSubscriptionId: subscriptionId,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: remote.cancel_at_period_end ?? false,
  });

  return { status, recorded: true };
}
