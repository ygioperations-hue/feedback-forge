import { eq, and, sql, inArray, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { assertWithinLimit, resolveUsageEntitlement, GROWTH_PLAN_KEY, type UsageEntitlement } from "./monthlyQuota";
import {
  users,
  plans,
  subscriptions,
  growthCheckoutAttempts,
  projects,
  questions,
  responses,
  monthlyUsage,
  answers,
  roadmapItems,
  changelogItems,
  ltdCodes,
  type User,
  type InsertUser,
  type Plan,
  type Subscription,
  type InsertSubscription,
  type SubscriptionWithPlan,
  type GrowthCheckoutAttempt,
  type Project,
  type InsertProject,
  type Question,
  type InsertQuestion,
  type FeedbackResponse,
  type InsertResponse,
  type Answer,
  type InsertAnswer,
  type RoadmapItem,
  type InsertRoadmapItem,
  type ChangelogItem,
  type InsertChangelogItem,
  type LtdCode,
  type ProjectWithQuestions,
  type ResponseWithAnswers,
} from "@shared/schema";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export { LIFETIME_MONTHLY_LIMIT, GROWTH_MONTHLY_RESPONSE_LIMIT, MonthlyLimitError, monthWindow } from "./monthlyQuota";
import { monthWindow } from "./monthlyQuota";

async function countMonthlyUsage(client: Pick<typeof db, "select">, userId: string, kind?: "response" | "insight", now = new Date()): Promise<number> {
  const { start, end } = monthWindow(now);
  const pendingCutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const filters = [eq(monthlyUsage.userId, userId), gte(monthlyUsage.occurredAt, start), lt(monthlyUsage.occurredAt, end),
    sql`(${monthlyUsage.status} = 'complete' OR (${monthlyUsage.status} = 'pending' AND ${monthlyUsage.occurredAt} >= ${pendingCutoff}))`];
  if (kind) filters.push(eq(monthlyUsage.kind, kind));
  const [result] = await client.select({ count: sql<number>`count(*)::int` }).from(monthlyUsage)
    .where(and(...filters));
  return result.count;
}

async function resolveEntitlement(client: any, user: User): Promise<UsageEntitlement> {
  const [active] = await client.select({ key: plans.key }).from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.userId, user.id), sql`${subscriptions.status} IN ('active', 'trialing')`))
    .orderBy(sql`${subscriptions.createdAt} DESC`).limit(1);
  return resolveUsageEntitlement(user, active?.key);
}

async function usageForEntitlement(client: any, userId: string, entitlement: UsageEntitlement, kind: "response" | "insight") {
  return countMonthlyUsage(client, userId, entitlement.sharedLifetimeLimit ? undefined : kind);
}

export interface IStorage {
  createUser(user: InsertUser & Partial<Pick<User, "planType" | "trialEndsAt">>): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  updateUserProfile(id: string, firstName: string, lastName: string): Promise<User>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  updateUserPlanType(userId: string, planType: string): Promise<User>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;

  getPlans(): Promise<Plan[]>;
  getPlanById(id: string): Promise<Plan | undefined>;
  getPlanByKey(key: string): Promise<Plan | undefined>;
  updatePlanStripePriceId(id: string, stripePriceId: string): Promise<Plan>;

  getActiveSubscription(userId: string): Promise<SubscriptionWithPlan | undefined>;
  getLatestSubscription(userId: string): Promise<SubscriptionWithPlan | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscriptionByStripeId(stripeSubId: string, data: Partial<Pick<Subscription, "status" | "currentPeriodStart" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "planId">>): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubId: string): Promise<Subscription | undefined>;
  claimGrowthCheckout(userId: string, expiresAt: Date): Promise<{ attempt?: GrowthCheckoutAttempt; created: boolean; activeSubscription: boolean }>;
  setGrowthCheckoutSession(userId: string, attemptId: string, stripeSessionId: string): Promise<GrowthCheckoutAttempt | undefined>;
  clearGrowthCheckout(userId: string): Promise<void>;
  applyGrowthSubscription(sub: InsertSubscription): Promise<Subscription>;
  cancelSubscriptionAndFallback(stripeSubId: string): Promise<Subscription | undefined>;

  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<ProjectWithQuestions | undefined>;
  getProjectBySlug(slug: string): Promise<ProjectWithQuestions | undefined>;
  createProject(project: InsertProject, questionsList: InsertQuestion[]): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  updateProjectStatus(id: string, status: string): Promise<Project | undefined>;
  getResponses(userId: string): Promise<(FeedbackResponse & { answers: Answer[] })[]>;
  getResponse(id: string): Promise<(FeedbackResponse & { answers: (Answer & { question: Question })[] }) | undefined>;
  getResponsesByProject(projectId: string): Promise<ResponseWithAnswers[]>;
  createResponse(response: InsertResponse, answersList: Omit<InsertAnswer, "responseId">[], ownerId?: string): Promise<FeedbackResponse>;
  getMonthlyUsage(userId: string): Promise<number>;
  getMonthlyUsageBreakdown(userId: string): Promise<{ responses: number; insights: number; total: number }>;
  getUsageEntitlement(userId: string): Promise<UsageEntitlement | undefined>;
  reserveInsightRun(userId: string): Promise<string>;
  completeInsightRun(id: string): Promise<void>;
  releaseInsightRun(id: string): Promise<void>;
  getOrCreateWidgetQuestions(projectId: string): Promise<{ ratingId: string; categoryId: string; messageId: string }>;
  getRoadmapItemsByProject(projectId: string): Promise<RoadmapItem[]>;
  createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem>;
  upvoteRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
  updateRoadmapItem(id: string, data: Partial<InsertRoadmapItem>): Promise<RoadmapItem | undefined>;
  deleteRoadmapItem(id: string): Promise<boolean>;
  getRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
  getQuestion(id: string): Promise<Question | undefined>;
  updateQuestion(id: string, data: Partial<Pick<InsertQuestion, 'label' | 'options' | 'required' | 'order'>>): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<boolean>;
  addQuestionToProject(projectId: string, question: Omit<InsertQuestion, 'projectId'>): Promise<Question>;
  getChangelogByProject(projectId: string): Promise<ChangelogItem[]>;
  createChangelogItem(item: InsertChangelogItem): Promise<ChangelogItem>;
  getChangelogItem(id: string): Promise<ChangelogItem | undefined>;
  updateChangelogItem(id: string, data: Partial<InsertChangelogItem>): Promise<ChangelogItem | undefined>;
  deleteChangelogItem(id: string): Promise<boolean>;
  generateLtdCode(userId: string, tier?: string): Promise<LtdCode>;
  getLtdCodes(userId: string): Promise<LtdCode[]>;
  redeemLtdCode(code: string, userId: string): Promise<LtdCode | null>;
  getResponseCountByProject(projectId: string): Promise<number>;
  getProjectCount(userId: string): Promise<number>;
  upgradeAllProjectsToLifetime(userId: string): Promise<void>;

  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  getAllLtdCodes(): Promise<(LtdCode & { redeemerEmail?: string | null })[]>;
  deleteLtdCode(id: string): Promise<boolean>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    lifetimeUsers: number;
    totalProjects: number;
    totalFeedback: number;
    mrr: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getMonthlyUsage(userId: string): Promise<number> {
    return countMonthlyUsage(db, userId);
  }

  async getMonthlyUsageBreakdown(userId: string) {
    const [responsesUsed, insightsUsed] = await Promise.all([
      countMonthlyUsage(db, userId, "response"),
      countMonthlyUsage(db, userId, "insight"),
    ]);
    return { responses: responsesUsed, insights: insightsUsed, total: responsesUsed + insightsUsed };
  }

  async getUsageEntitlement(userId: string): Promise<UsageEntitlement | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user ? resolveEntitlement(db, user) : undefined;
  }

  async reserveInsightRun(userId: string): Promise<string> {
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("User not found");
      const entitlement = await resolveEntitlement(tx, user);
      const used = await usageForEntitlement(tx, userId, entitlement, "insight");
      assertWithinLimit(entitlement.aiInsightLimit, used);
      const [usage] = await tx.insert(monthlyUsage).values({ userId, kind: "insight", status: "pending" }).returning({ id: monthlyUsage.id });
      return usage.id;
    });
  }

  async completeInsightRun(id: string): Promise<void> {
    const [usage] = await db.update(monthlyUsage).set({ status: "complete" })
      .where(and(eq(monthlyUsage.id, id), eq(monthlyUsage.status, "pending"), gte(monthlyUsage.occurredAt, new Date(Date.now() - 30 * 60 * 1000))))
      .returning({ id: monthlyUsage.id });
    if (!usage) throw new Error("AI summary took too long. Please try again.");
  }

  async releaseInsightRun(id: string): Promise<void> {
    await db.delete(monthlyUsage).where(and(eq(monthlyUsage.id, id), eq(monthlyUsage.kind, "insight")));
  }
  async createUser(user: InsertUser & Partial<Pick<User, "planType" | "trialEndsAt">>): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  async updateUserProfile(id: string, firstName: string, lastName: string): Promise<User> {
    const [updated] = await db.update(users).set({ firstName, lastName }).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const [updated] = await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserPlanType(userId: string, planType: string): Promise<User> {
    const [updated] = await db.update(users).set({ planType }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }


  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.price);
  }

  async getPlanById(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async getPlanByKey(key: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.key, key));
    return plan;
  }

  async updatePlanStripePriceId(id: string, stripePriceId: string): Promise<Plan> {
    const [updated] = await db.update(plans).set({ stripePriceId }).where(eq(plans.id, id)).returning();
    return updated;
  }

  async getActiveSubscription(userId: string): Promise<SubscriptionWithPlan | undefined> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          sql`${subscriptions.status} IN ('active', 'trialing')`
        )
      );
    if (results.length === 0) return undefined;
    const sub = results[0];
    const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId));
    if (!plan) return undefined;
    return { ...sub, plan };
  }

  async getLatestSubscription(userId: string): Promise<SubscriptionWithPlan | undefined> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(sql`${subscriptions.createdAt} DESC`)
      .limit(1);
    if (results.length === 0) return undefined;
    const sub = results[0];
    const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId));
    if (!plan) return undefined;
    return { ...sub, plan };
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    return db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, sub.userId)).for("update");
      const [created] = await tx.insert(subscriptions).values(sub)
        .onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            planId: sub.planId,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          },
        }).returning();
      return created;
    });
  }

  async updateSubscriptionByStripeId(
    stripeSubId: string,
    data: Partial<Pick<Subscription, "status" | "currentPeriodStart" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "planId">>
  ): Promise<Subscription | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
      if (!existing) return undefined;
      await tx.select({ id: users.id }).from(users).where(eq(users.id, existing.userId)).for("update");
      const [updated] = await tx.update(subscriptions).set(data).where(eq(subscriptions.stripeSubscriptionId, stripeSubId)).returning();
      return updated;
    });
  }

  async getSubscriptionByStripeId(stripeSubId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
    return sub;
  }

  async claimGrowthCheckout(userId: string, expiresAt: Date) {
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("User not found");

      const [active] = await tx.select({ id: subscriptions.id }).from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), sql`${subscriptions.status} IN ('active', 'trialing')`))
        .limit(1);
      if (active) {
        const [attempt] = await tx.select().from(growthCheckoutAttempts).where(eq(growthCheckoutAttempts.userId, userId));
        return { attempt, created: false, activeSubscription: true };
      }

      const [existing] = await tx.select().from(growthCheckoutAttempts).where(eq(growthCheckoutAttempts.userId, userId));
      if (existing && existing.expiresAt > new Date()) {
        return { attempt: existing, created: false, activeSubscription: false };
      }
      if (existing) await tx.delete(growthCheckoutAttempts).where(eq(growthCheckoutAttempts.userId, userId));

      const [attempt] = await tx.insert(growthCheckoutAttempts).values({ userId, expiresAt }).returning();
      return { attempt, created: true, activeSubscription: false };
    });
  }

  async setGrowthCheckoutSession(userId: string, attemptId: string, stripeSessionId: string) {
    const [attempt] = await db.update(growthCheckoutAttempts).set({ stripeSessionId })
      .where(and(eq(growthCheckoutAttempts.userId, userId), eq(growthCheckoutAttempts.attemptId, attemptId)))
      .returning();
    return attempt;
  }

  async clearGrowthCheckout(userId: string): Promise<void> {
    await db.delete(growthCheckoutAttempts).where(eq(growthCheckoutAttempts.userId, userId));
  }

  async applyGrowthSubscription(sub: InsertSubscription): Promise<Subscription> {
    const stripeSubId = sub.stripeSubscriptionId;
    if (!stripeSubId) throw new Error("Growth subscription requires a Stripe subscription ID");
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, sub.userId)).for("update");
      if (!user) throw new Error("User not found");
      const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
      if (existing && existing.userId !== sub.userId) {
        throw new Error("Stripe subscription belongs to a different local user");
      }
      const [saved] = await tx.insert(subscriptions).values(sub)
        .onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            planId: sub.planId,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          },
        }).returning();
      if (!user.planType.startsWith("lifetime")) {
        let planType = ["active", "trialing"].includes(saved.status) ? "growth" : "none";
        if (planType === "none") {
          const [otherActive] = await tx.select({ id: subscriptions.id }).from(subscriptions)
            .where(and(
              eq(subscriptions.userId, user.id),
              sql`${subscriptions.stripeSubscriptionId} <> ${stripeSubId}`,
              sql`${subscriptions.status} IN ('active', 'trialing')`,
            )).limit(1);
          if (otherActive) planType = "growth";
        }
        await tx.update(users).set({ planType }).where(eq(users.id, user.id));
      }
      await tx.delete(growthCheckoutAttempts).where(eq(growthCheckoutAttempts.userId, user.id));
      return saved;
    });
  }

  async cancelSubscriptionAndFallback(stripeSubId: string): Promise<Subscription | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
      if (!existing) return undefined;
      const [user] = await tx.select().from(users).where(eq(users.id, existing.userId)).for("update");
      const [updated] = await tx.update(subscriptions).set({ status: "canceled", cancelAtPeriodEnd: false })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubId)).returning();
      if (user && !user.planType.startsWith("lifetime")) {
        const [otherActive] = await tx.select({ id: subscriptions.id }).from(subscriptions)
          .where(and(
            eq(subscriptions.userId, user.id),
            sql`${subscriptions.stripeSubscriptionId} <> ${stripeSubId}`,
            sql`${subscriptions.status} IN ('active', 'trialing')`,
          )).limit(1);
        await tx.update(users).set({ planType: otherActive ? "growth" : "none" }).where(eq(users.id, user.id));
      }
      await tx.delete(growthCheckoutAttempts).where(eq(growthCheckoutAttempts.userId, existing.userId));
      return updated;
    });
  }

  async getProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(projects.createdAt);
  }

  async getProject(id: string): Promise<ProjectWithQuestions | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;
    const qs = await db.select().from(questions).where(eq(questions.projectId, id)).orderBy(questions.order);
    return { ...project, questions: qs };
  }

  async getProjectBySlug(slug: string): Promise<ProjectWithQuestions | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug));
    if (!project) return undefined;
    const qs = await db.select().from(questions).where(eq(questions.projectId, project.id)).orderBy(questions.order);
    return { ...project, questions: qs };
  }

  async createProject(project: InsertProject, questionsList: InsertQuestion[]): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    if (questionsList.length > 0) {
      await db.insert(questions).values(
        questionsList.map((q) => ({ ...q, projectId: created.id }))
      );
    }
    return created;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async updateProjectStatus(id: string, status: string): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set({ status }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async getResponses(userId: string): Promise<(FeedbackResponse & { answers: Answer[] })[]> {
    const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId));
    const projectIds = userProjects.map((p) => p.id);
    if (projectIds.length === 0) return [];
    const allResponses = await db.select().from(responses).where(inArray(responses.projectId, projectIds)).orderBy(responses.submittedAt);
    if (allResponses.length === 0) return [];
    const responseIds = allResponses.map((r) => r.id);
    const allAnswers = await db.select().from(answers).where(inArray(answers.responseId, responseIds));
    return allResponses.map((r) => ({
      ...r,
      answers: allAnswers.filter((a) => a.responseId === r.id),
    }));
  }

  async getResponse(id: string): Promise<(FeedbackResponse & { answers: (Answer & { question: Question })[] }) | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.id, id));
    if (!response) return undefined;
    const responseAnswers = await db.select().from(answers).where(eq(answers.responseId, id));
    const questionIds = responseAnswers.map((a) => a.questionId);
    const qs = questionIds.length > 0
      ? await db.select().from(questions).where(inArray(questions.id, questionIds))
      : [];
    const qMap = new Map(qs.map((q) => [q.id, q]));
    return {
      ...response,
      answers: responseAnswers.map((a) => ({
        ...a,
        question: qMap.get(a.questionId) || { id: a.questionId, projectId: response.projectId, label: "Unknown", type: "text", required: false, options: null, order: 0, source: "form" },
      })),
    };
  }

  async getResponsesByProject(projectId: string): Promise<ResponseWithAnswers[]> {
    const projectResponses = await db.select().from(responses).where(eq(responses.projectId, projectId)).orderBy(responses.submittedAt);
    const responseIds = projectResponses.map((r) => r.id);
    if (responseIds.length === 0) return [];
    const allAnswers = await db.select().from(answers).where(inArray(answers.responseId, responseIds));
    return projectResponses.map((r) => ({
      ...r,
      answers: allAnswers.filter((a) => a.responseId === r.id),
    }));
  }

  async createResponse(response: InsertResponse, answersList: Omit<InsertAnswer, "responseId">[], ownerId?: string): Promise<FeedbackResponse> {
    return db.transaction(async (tx) => {
      if (ownerId) {
        const [user] = await tx.select().from(users).where(eq(users.id, ownerId)).for("update");
        if (!user) throw new Error("User not found");
        const entitlement = await resolveEntitlement(tx, user);
        const used = await usageForEntitlement(tx, ownerId, entitlement, "response");
        assertWithinLimit(entitlement.responseLimit, used);
      }
      const [created] = await tx.insert(responses).values(response).returning();
      if (answersList.length) {
        await tx.insert(answers).values(answersList.map((a) => ({ ...a, responseId: created.id })));
      }
      if (ownerId) {
        await tx.insert(monthlyUsage).values({ userId: ownerId, kind: "response", responseId: created.id, occurredAt: created.submittedAt });
      }
      return created;
    });
  }

  async getOrCreateWidgetQuestions(projectId: string): Promise<{ ratingId: string; categoryId: string; messageId: string }> {
    const existing = await db.select().from(questions).where(eq(questions.projectId, projectId));

    const widgetLabels = {
      rating: "Widget Rating",
      category: "Widget Category",
      message: "Widget Message",
    };

    let ratingQ = existing.find((q) => q.label === widgetLabels.rating && q.type === "rating");
    let categoryQ = existing.find((q) => q.label === widgetLabels.category && q.type === "multiple_choice");
    let messageQ = existing.find((q) => q.label === widgetLabels.message && q.type === "text");

    if (!ratingQ) {
      const [created] = await db.insert(questions).values({
        projectId,
        label: widgetLabels.rating,
        type: "rating",
        required: true,
        options: [],
        order: 900,
        source: "widget",
      }).returning();
      ratingQ = created;
    }

    if (!categoryQ) {
      const [created] = await db.insert(questions).values({
        projectId,
        label: widgetLabels.category,
        type: "multiple_choice",
        required: true,
        options: ["Bug", "Feature", "Idea", "Other"],
        order: 901,
        source: "widget",
      }).returning();
      categoryQ = created;
    }

    if (!messageQ) {
      const [created] = await db.insert(questions).values({
        projectId,
        label: widgetLabels.message,
        type: "text",
        required: true,
        options: [],
        order: 902,
        source: "widget",
      }).returning();
      messageQ = created;
    }

    return { ratingId: ratingQ.id, categoryId: categoryQ.id, messageId: messageQ.id };
  }

  async getRoadmapItemsByProject(projectId: string): Promise<RoadmapItem[]> {
    return db.select().from(roadmapItems).where(eq(roadmapItems.projectId, projectId)).orderBy(roadmapItems.order);
  }

  async createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem> {
    const [created] = await db.insert(roadmapItems).values(item).returning();
    return created;
  }

  async upvoteRoadmapItem(id: string): Promise<RoadmapItem | undefined> {
    const [updated] = await db.update(roadmapItems).set({ upvotes: sql`${roadmapItems.upvotes} + 1` }).where(eq(roadmapItems.id, id)).returning();
    return updated;
  }

  async updateRoadmapItem(id: string, data: Partial<InsertRoadmapItem>): Promise<RoadmapItem | undefined> {
    const [updated] = await db.update(roadmapItems).set(data).where(eq(roadmapItems.id, id)).returning();
    return updated;
  }

  async deleteRoadmapItem(id: string): Promise<boolean> {
    const result = await db.delete(roadmapItems).where(eq(roadmapItems.id, id)).returning();
    return result.length > 0;
  }

  async getRoadmapItem(id: string): Promise<RoadmapItem | undefined> {
    const [item] = await db.select().from(roadmapItems).where(eq(roadmapItems.id, id));
    return item;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [item] = await db.select().from(questions).where(eq(questions.id, id));
    return item;
  }

  async updateQuestion(id: string, data: Partial<Pick<InsertQuestion, 'label' | 'options' | 'required' | 'order'>>): Promise<Question | undefined> {
    const [updated] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return updated;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const result = await db.delete(questions).where(eq(questions.id, id)).returning();
    return result.length > 0;
  }

  async addQuestionToProject(projectId: string, question: Omit<InsertQuestion, 'projectId'>): Promise<Question> {
    const [created] = await db.insert(questions).values({ ...question, projectId }).returning();
    return created;
  }

  async getChangelogByProject(projectId: string): Promise<ChangelogItem[]> {
    return db.select().from(changelogItems).where(eq(changelogItems.projectId, projectId)).orderBy(changelogItems.publishedAt);
  }

  async createChangelogItem(item: InsertChangelogItem): Promise<ChangelogItem> {
    const [created] = await db.insert(changelogItems).values(item).returning();
    return created;
  }

  async getChangelogItem(id: string): Promise<ChangelogItem | undefined> {
    const [item] = await db.select().from(changelogItems).where(eq(changelogItems.id, id));
    return item;
  }

  async updateChangelogItem(id: string, data: Partial<InsertChangelogItem>): Promise<ChangelogItem | undefined> {
    const [updated] = await db.update(changelogItems).set(data).where(eq(changelogItems.id, id)).returning();
    return updated;
  }

  async deleteChangelogItem(id: string): Promise<boolean> {
    const result = await db.delete(changelogItems).where(eq(changelogItems.id, id)).returning();
    return result.length > 0;
  }

  async generateLtdCode(userId: string, tier: string = "pro"): Promise<LtdCode> {
    const prefix = tier === "starter" ? "FS" : "FP";
    const code = prefix + "-" + Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join("-");
    const [created] = await db.insert(ltdCodes).values({ code, userId, tier }).returning();
    return created;
  }

  async getLtdCodes(userId: string): Promise<LtdCode[]> {
    return db.select().from(ltdCodes).where(eq(ltdCodes.userId, userId)).orderBy(ltdCodes.createdAt);
  }

  async redeemLtdCode(code: string, userId: string): Promise<LtdCode | null> {
    const [existing] = await db.select().from(ltdCodes).where(eq(ltdCodes.code, code));
    if (!existing || existing.isRedeemed) return null;
    const [updated] = await db.update(ltdCodes).set({ isRedeemed: true, redeemedAt: new Date(), userId }).where(eq(ltdCodes.id, existing.id)).returning();
    return updated;
  }

  async getResponseCountByProject(projectId: string): Promise<number> {
    const result = await db.select().from(responses).where(eq(responses.projectId, projectId));
    return result.length;
  }

  async getProjectCount(userId: string): Promise<number> {
    const result = await db.select().from(projects).where(eq(projects.userId, userId));
    return result.length;
  }

  async upgradeAllProjectsToLifetime(userId: string): Promise<void> {
    await db.update(projects).set({ plan: "lifetime" }).where(eq(projects.userId, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async deleteUser(id: string): Promise<void> {
    const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, id));
    const projectIds = userProjects.map(p => p.id);

    if (projectIds.length > 0) {
      const projectResponses = await db.select({ id: responses.id }).from(responses).where(inArray(responses.projectId, projectIds));
      const responseIds = projectResponses.map(r => r.id);

      if (responseIds.length > 0) {
        await db.delete(answers).where(inArray(answers.responseId, responseIds));
        await db.delete(responses).where(inArray(responses.id, responseIds));
      }

      await db.delete(roadmapItems).where(inArray(roadmapItems.projectId, projectIds));
      await db.delete(changelogItems).where(inArray(changelogItems.projectId, projectIds));
      await db.delete(questions).where(inArray(questions.projectId, projectIds));
      await db.delete(projects).where(eq(projects.userId, id));
    }

    await db.delete(subscriptions).where(eq(subscriptions.userId, id));
    await db.delete(ltdCodes).where(eq(ltdCodes.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllLtdCodes(): Promise<(LtdCode & { redeemerEmail?: string | null })[]> {
    const allCodes = await db.select().from(ltdCodes).orderBy(ltdCodes.createdAt);
    const result: (LtdCode & { redeemerEmail?: string | null })[] = [];
    for (const code of allCodes) {
      let redeemerEmail: string | null = null;
      if (code.isRedeemed && code.userId) {
        const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, code.userId));
        redeemerEmail = user?.email || null;
      }
      result.push({ ...code, redeemerEmail });
    }
    return result;
  }

  async deleteLtdCode(id: string): Promise<boolean> {
    const [code] = await db.select().from(ltdCodes).where(eq(ltdCodes.id, id));
    if (!code || code.isRedeemed) return false;
    await db.delete(ltdCodes).where(eq(ltdCodes.id, id));
    return true;
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    lifetimeUsers: number;
    totalProjects: number;
    totalFeedback: number;
    mrr: number;
  }> {
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const lifetimeUsers = allUsers.filter(u => u.planType?.startsWith('lifetime')).length;

    const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, 'active'));
    const activeSubscriptions = activeSubs.length;

    const allProjects = await db.select().from(projects);
    const totalProjects = allProjects.length;

    const allResponses = await db.select().from(responses);
    const totalFeedback = allResponses.length;

    let mrr = 0;
    for (const sub of activeSubs) {
      const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId));
      if (plan) {
        if (plan.interval === 'month') {
          mrr += plan.price;
        } else if (plan.interval === 'year') {
          mrr += Math.round(plan.price / 12);
        }
      }
    }

    return { totalUsers, activeSubscriptions, lifetimeUsers, totalProjects, totalFeedback, mrr };
  }
}

export const storage = new DatabaseStorage();
