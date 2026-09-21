import test from "node:test";
import assert from "node:assert/strict";
import { assertWithinLimit, resolveUsageEntitlement, monthWindow, MonthlyLimitError } from "../server/monthlyQuota";

const lifetime = { role: "customer", planType: "lifetime_pro" };

test("50-use and 500-response boundaries allow the final slot and block the next", () => {
  assert.doesNotThrow(() => assertWithinLimit(50, 49));
  assert.throws(() => assertWithinLimit(50, 50), MonthlyLimitError);
  assert.doesNotThrow(() => assertWithinLimit(500, 499));
  assert.throws(() => assertWithinLimit(500, 500), MonthlyLimitError);
});

test("entitlement matrix preserves lifetime, Growth, trial, legacy, none, and admin behavior", () => {
  const growth = resolveUsageEntitlement(lifetime, "growth_monthly");
  assert.deepEqual([growth.effectivePlan, growth.responseLimit, growth.aiInsightLimit, growth.basePlan], ["growth", 500, null, "lifetime_pro"]);
  const ltd = resolveUsageEntitlement(lifetime);
  assert.deepEqual([ltd.responseLimit, ltd.aiInsightLimit, ltd.sharedLifetimeLimit], [50, 50, true]);
  assert.equal(resolveUsageEntitlement({ role: "customer", planType: "lifetime_starter" }).responseLimit, 50);
  assert.equal(resolveUsageEntitlement({ role: "customer", planType: "monthly" }, "legacy_monthly").responseLimit, null);
  assert.equal(resolveUsageEntitlement({ role: "customer", planType: "yearly" }, "legacy_yearly").responseLimit, null);
  assert.equal(resolveUsageEntitlement({ role: "customer", planType: "trial", trialEndsAt: new Date(Date.now() + 60_000) }).activated, true);
  assert.equal(resolveUsageEntitlement({ role: "customer", planType: "trial", trialEndsAt: new Date(Date.now() - 60_000) }).activated, false);
  assert.equal(resolveUsageEntitlement({ role: "customer", planType: "none" }).activated, false);
  assert.equal(resolveUsageEntitlement({ role: "platform_admin", planType: "lifetime_pro" }).responseLimit, null);
});

test("calendar window uses UTC and moves correctly across year boundaries", () => {
  const december = monthWindow(new Date("2026-12-31T23:59:59.999Z"));
  assert.equal(december.start.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(december.end.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(monthWindow(december.end).start.toISOString(), december.end.toISOString());
  assert.throws(
    () => assertWithinLimit(50, 50, new Date("2026-12-31T23:59:59.999Z")),
    (error: unknown) => error instanceof MonthlyLimitError && error.resetsAt === "2027-01-01T00:00:00.000Z",
  );
});
