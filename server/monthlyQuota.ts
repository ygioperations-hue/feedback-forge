export const LIFETIME_MONTHLY_LIMIT = 50;
export const GROWTH_MONTHLY_RESPONSE_LIMIT = 500;
export const GROWTH_PLAN_KEY = "growth_monthly";
export const LIMIT_REACHED_MESSAGE = "Monthly limit reached for this account.";

export type UsageEntitlement = {
  activated: boolean;
  basePlan: string;
  effectivePlan: string;
  responseLimit: number | null;
  aiInsightLimit: number | null;
  sharedLifetimeLimit: boolean;
  trialActive: boolean;
  trialEnded: boolean;
};

export class MonthlyLimitError extends Error {
  constructor(public readonly resetsAt: string) {
    super(LIMIT_REACHED_MESSAGE);
  }
}

export function monthWindow(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export function resolveUsageEntitlement(
  user: { role: string; planType: string; trialEndsAt?: Date | null },
  activeSubscriptionPlanKey?: string | null,
  now = new Date(),
): UsageEntitlement {
  const basePlan = user.planType;
  if (user.role === "platform_admin") {
    return { activated: true, basePlan, effectivePlan: "admin", responseLimit: null, aiInsightLimit: null, sharedLifetimeLimit: false, trialActive: false, trialEnded: false };
  }
  if (activeSubscriptionPlanKey === GROWTH_PLAN_KEY) {
    return { activated: true, basePlan, effectivePlan: "growth", responseLimit: GROWTH_MONTHLY_RESPONSE_LIMIT, aiInsightLimit: null, sharedLifetimeLimit: false, trialActive: false, trialEnded: false };
  }
  if (basePlan.startsWith("lifetime")) {
    return { activated: true, basePlan, effectivePlan: basePlan, responseLimit: LIFETIME_MONTHLY_LIMIT, aiInsightLimit: LIFETIME_MONTHLY_LIMIT, sharedLifetimeLimit: true, trialActive: false, trialEnded: false };
  }
  if (basePlan === "trial" && user.trialEndsAt && user.trialEndsAt > now) {
    return { activated: true, basePlan, effectivePlan: "trial", responseLimit: null, aiInsightLimit: null, sharedLifetimeLimit: false, trialActive: true, trialEnded: false };
  }
  const trialEnded = !!user.trialEndsAt && user.trialEndsAt <= now;
  return { activated: false, basePlan, effectivePlan: "none", responseLimit: 0, aiInsightLimit: 0, sharedLifetimeLimit: false, trialActive: false, trialEnded };
}

export function assertWithinLimit(limit: number | null, used: number, now = new Date()) {
  if (limit !== null && used >= limit) throw new MonthlyLimitError(monthWindow(now).end.toISOString());
}
