import { GROWTH_PLAN_KEY } from "./monthlyQuota";

export function planTypeForPlan(plan: { key: string; interval: string }) {
  if (plan.key === GROWTH_PLAN_KEY) return "growth";
  return plan.interval === "year" ? "yearly" : "monthly";
}

export function findPlanByStripePriceId<T extends { stripePriceId: string | null }>(plans: T[], priceId?: string | null): T | undefined {
  if (!priceId) return undefined;
  return plans.find(plan => plan.stripePriceId === priceId);
}

export function checkoutConfig(plan: "growth" | "lifetime") {
  return plan === "growth"
    ? { planKey: GROWTH_PLAN_KEY, mode: "subscription" as const }
    : { planKey: "lifetime", mode: "payment" as const };
}
