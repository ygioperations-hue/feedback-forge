import test from "node:test";
import assert from "node:assert/strict";

test("monthly usage integration (requires TEST_DATABASE_URL with the app schema)", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { db, storage, ensureMonthlyUsage, ensureGrowthPlan, MonthlyLimitError, monthWindow } = await import("../server/storage");
  const { users, projects, questions, responses, monthlyUsage } = await import("../shared/schema");
  const { eq, sql } = await import("drizzle-orm");
  await ensureGrowthPlan();
  await ensureMonthlyUsage();

  const key = crypto.randomUUID();
  const [user] = await db.insert(users).values({ email: `${key}@example.test`, password: "test", firstName: "Quota", lastName: "Test", planType: "lifetime_pro" }).returning();
  const [projectA] = await db.insert(projects).values({ name: "A", slug: `quota-a-${key}`, userId: user.id, status: "active" }).returning();
  const [projectB] = await db.insert(projects).values({ name: "B", slug: `quota-b-${key}`, userId: user.id, status: "active" }).returning();
  const [question] = await db.insert(questions).values({ projectId: projectA.id, label: "Feedback", type: "text" }).returning();
  const response = (projectId = projectA.id, answerId = question.id) =>
    storage.createResponse({ projectId }, [{ questionId: answerId, value: "Feedback" }], user.id);

  try {
    // Existing responses are included by the idempotent backfill.
    const [legacy] = await db.insert(responses).values({ projectId: projectA.id }).returning();
    await ensureMonthlyUsage();
    await ensureMonthlyUsage();
    assert.equal(await storage.getMonthlyUsage(user.id), 1);
    const [backfilled] = await db.select({ count: sql<number>`count(*)::int` }).from(monthlyUsage).where(eq(monthlyUsage.responseId, legacy.id));
    assert.equal(backfilled.count, 1);

    // Failed answer insertion rolls back both response and allowance.
    await assert.rejects(response(projectA.id, crypto.randomUUID()));
    assert.equal(await storage.getMonthlyUsage(user.id), 1);

    for (let i = 1; i < 48; i++) await response();
    assert.equal(await storage.getMonthlyUsage(user.id), 48);
    const insight = await storage.reserveInsightRun(user.id);
    assert.equal(await storage.getMonthlyUsage(user.id), 49);
    await storage.releaseInsightRun(insight);
    assert.equal(await storage.getMonthlyUsage(user.id), 48);

    const staleInsight = await storage.reserveInsightRun(user.id);
    await db.update(monthlyUsage).set({ occurredAt: new Date(Date.now() - 31 * 60 * 1000) }).where(eq(monthlyUsage.id, staleInsight));
    assert.equal(await storage.getMonthlyUsage(user.id), 48);
    await assert.rejects(storage.completeInsightRun(staleInsight));
    await storage.releaseInsightRun(staleInsight);

    const competing = await Promise.allSettled([response(), storage.reserveInsightRun(user.id), response()]);
    assert.equal(competing.filter((result) => result.status === "fulfilled").length, 2);
    assert.equal(competing.filter((result) => result.status === "rejected" && result.reason instanceof MonthlyLimitError).length, 1);
    assert.equal(await storage.getMonthlyUsage(user.id), 50);
    for (const result of competing) {
      if (result.status === "fulfilled" && typeof result.value === "string") await storage.completeInsightRun(result.value);
    }
    await assert.rejects(response(), MonthlyLimitError);
    await assert.rejects(storage.reserveInsightRun(user.id), MonthlyLimitError);

    // Deleting a project cannot refund consumed allowance.
    await db.delete(projects).where(eq(projects.id, projectA.id));
    assert.equal(await storage.getMonthlyUsage(user.id), 50);
    await assert.rejects(storage.createResponse({ projectId: projectB.id }, [], user.id), MonthlyLimitError);

    // A previous month's usage is excluded at the UTC boundary.
    const { start } = monthWindow();
    await db.update(monthlyUsage).set({ occurredAt: new Date(start.getTime() - 1) }).where(eq(monthlyUsage.userId, user.id));
    assert.equal(await storage.getMonthlyUsage(user.id), 0);
    await storage.createResponse({ projectId: projectB.id }, [], user.id);
    assert.equal(await storage.getMonthlyUsage(user.id), 1);

    await db.update(users).set({ planType: "trial", trialEndsAt: new Date(Date.now() + 86400_000) }).where(eq(users.id, user.id));
    await db.update(monthlyUsage).set({ occurredAt: new Date() }).where(eq(monthlyUsage.userId, user.id));
    await storage.createResponse({ projectId: projectB.id }, [], user.id);
    await db.update(users).set({ planType: "lifetime_pro", role: "platform_admin" }).where(eq(users.id, user.id));
    await storage.createResponse({ projectId: projectB.id }, [], user.id);
  } finally {
    await db.delete(users).where(eq(users.id, user.id));
  }
});

test("Growth counts responses only and falls back to retained Lifetime (requires TEST_DATABASE_URL)", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { db, storage, ensureGrowthPlan, MonthlyLimitError } = await import("../server/storage");
  const { users, projects, monthlyUsage, subscriptions } = await import("../shared/schema");
  const { eq, sql } = await import("drizzle-orm");
  await ensureGrowthPlan();
  const growthPlan = await storage.getPlanByKey("growth_monthly");
  assert.ok(growthPlan);

  const key = crypto.randomUUID();
  const [user] = await db.insert(users).values({ email: `${key}@growth.test`, password: "test", firstName: "Growth", lastName: "Test", planType: "lifetime_pro" }).returning();
  const [projectA] = await db.insert(projects).values({ name: "Growth A", slug: `growth-a-${key}`, userId: user.id, status: "active" }).returning();
  const [projectB] = await db.insert(projects).values({ name: "Growth B", slug: `growth-b-${key}`, userId: user.id, status: "active" }).returning();
  const subscriptionId = `sub_${key}`;

  try {
    // A response collected before upgrading still counts in the same UTC month.
    await storage.createResponse({ projectId: projectA.id }, [], user.id);
    await storage.createSubscription({ userId: user.id, planId: growthPlan.id, stripeSubscriptionId: subscriptionId, status: "active", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000), cancelAtPeriodEnd: false });
    await storage.createSubscription({ userId: user.id, planId: growthPlan.id, stripeSubscriptionId: subscriptionId, status: "active", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000), cancelAtPeriodEnd: false });
    const [subscriptionCount] = await db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
    assert.equal(subscriptionCount.count, 1);
    const entitlement = await storage.getUsageEntitlement(user.id);
    assert.deepEqual([entitlement?.effectivePlan, entitlement?.responseLimit, entitlement?.aiInsightLimit], ["growth", 500, null]);

    // One pre-upgrade/current-month response plus 498 ledger rows leaves one response slot.
    await db.insert(monthlyUsage).values(Array.from({ length: 498 }, () => ({ userId: user.id, kind: "response", status: "complete" })));
    for (let i = 0; i < 8; i++) {
      const insight = await storage.reserveInsightRun(user.id);
      await storage.completeInsightRun(insight);
    }
    const finalResponse = await storage.createResponse({ projectId: projectB.id }, [], user.id);
    assert.ok(finalResponse.id);
    await assert.rejects(storage.createResponse({ projectId: projectB.id }, [], user.id), MonthlyLimitError);

    // AI remains available after 500 responses.
    const insight = await storage.reserveInsightRun(user.id);
    await storage.completeInsightRun(insight);

    // Concurrent requests cannot exceed the response boundary.
    await db.delete(monthlyUsage).where(eq(monthlyUsage.userId, user.id));
    await db.insert(monthlyUsage).values(Array.from({ length: 499 }, () => ({ userId: user.id, kind: "response", status: "complete" })));
    const competing = await Promise.allSettled([
      storage.createResponse({ projectId: projectA.id }, [], user.id),
      storage.createResponse({ projectId: projectB.id }, [], user.id),
    ]);
    assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(competing.filter(result => result.status === "rejected" && result.reason instanceof MonthlyLimitError).length, 1);

    // Scheduled cancellation keeps Growth until Stripe marks the subscription inactive.
    await storage.updateSubscriptionByStripeId(subscriptionId, { cancelAtPeriodEnd: true });
    assert.equal((await storage.getUsageEntitlement(user.id))?.effectivePlan, "growth");
    await storage.updateSubscriptionByStripeId(subscriptionId, { cancelAtPeriodEnd: false });
    assert.equal((await storage.getUsageEntitlement(user.id))?.effectivePlan, "growth");

    // Ending Growth restores the retained Lifetime combined cap immediately.
    await storage.updateSubscriptionByStripeId(subscriptionId, { status: "canceled", cancelAtPeriodEnd: false });
    assert.equal((await storage.getUsageEntitlement(user.id))?.effectivePlan, "lifetime_pro");
    await assert.rejects(storage.reserveInsightRun(user.id), MonthlyLimitError);
  } finally {
    await db.delete(users).where(eq(users.id, user.id));
  }
});
