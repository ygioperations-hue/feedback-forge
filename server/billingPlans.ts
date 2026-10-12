import { GROWTH_PLAN_KEY } from "./monthlyQuota";

export function findPlanByStripePriceId<T extends { stripePriceId: string | null }>(plans: T[], priceId?: string | null): T | undefined {
  if (!priceId) return undefined;
  return plans.find(plan => plan.stripePriceId === priceId);
}

export function stripePriceMatchesPlan(
  price: { currency?: string; unit_amount?: number | null; recurring?: { interval?: string } | null },
  plan: { price: number; interval: string },
): boolean {
  const recurringMatches = plan.interval === "lifetime"
    ? !price.recurring
    : price.recurring?.interval === plan.interval;
  return price.currency === "usd" && price.unit_amount === plan.price && recurringMatches;
}

export function checkoutConfig(plan: "growth" | "lifetime") {
  return plan === "growth"
    ? { planKey: GROWTH_PLAN_KEY, mode: "subscription" as const }
    : { planKey: "lifetime", mode: "payment" as const };
}
