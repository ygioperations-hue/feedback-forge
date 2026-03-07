import { eq, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  plans,
  subscriptions,
  projects,
  questions,
  responses,
  answers,
  roadmapItems,
  changelogItems,
  ltdCodes,
  type User,
  type InsertUser,
  type Plan,
  type InsertPlan,
  type Subscription,
  type InsertSubscription,
  type SubscriptionWithPlan,
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

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  updateUserProfile(id: string, firstName: string, lastName: string): Promise<User>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  updateUserPlanType(userId: string, planType: string): Promise<User>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;

  getPlans(): Promise<Plan[]>;
  getPlanById(id: string): Promise<Plan | undefined>;
  getPlanByInterval(interval: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlanStripePriceId(id: string, stripePriceId: string): Promise<Plan>;

  getActiveSubscription(userId: string): Promise<SubscriptionWithPlan | undefined>;
  getLatestSubscription(userId: string): Promise<SubscriptionWithPlan | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscriptionByStripeId(stripeSubId: string, data: Partial<Pick<Subscription, "status" | "currentPeriodStart" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "planId">>): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubId: string): Promise<Subscription | undefined>;

  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<ProjectWithQuestions | undefined>;
  getProjectBySlug(slug: string): Promise<ProjectWithQuestions | undefined>;
  createProject(project: InsertProject, questionsList: InsertQuestion[]): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  updateProjectStatus(id: string, status: string): Promise<Project | undefined>;
  getResponses(userId: string): Promise<(FeedbackResponse & { answers: Answer[] })[]>;
  getResponse(id: string): Promise<(FeedbackResponse & { answers: (Answer & { question: Question })[] }) | undefined>;
  getResponsesByProject(projectId: string): Promise<ResponseWithAnswers[]>;
  createResponse(response: InsertResponse, answersList: Omit<InsertAnswer, "responseId">[]): Promise<FeedbackResponse>;
  getOrCreateWidgetQuestions(projectId: string): Promise<{ ratingId: string; categoryId: string; messageId: string }>;
  getRoadmapItemsByProject(projectId: string): Promise<RoadmapItem[]>;
  createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem>;
  upvoteRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
  updateRoadmapItem(id: string, data: Partial<InsertRoadmapItem>): Promise<RoadmapItem | undefined>;
  deleteRoadmapItem(id: string): Promise<boolean>;
  getRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
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
  async createUser(user: InsertUser): Promise<User> {
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

  async getPlanByInterval(interval: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.interval, interval));
    return plan;
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(plan).returning();
    return created;
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
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async updateSubscriptionByStripeId(
    stripeSubId: string,
    data: Partial<Pick<Subscription, "status" | "currentPeriodStart" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "planId">>
  ): Promise<Subscription | undefined> {
    const [updated] = await db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
      .returning();
    return updated;
  }

  async getSubscriptionByStripeId(stripeSubId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
    return sub;
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

  async createResponse(response: InsertResponse, answersList: Omit<InsertAnswer, "responseId">[]): Promise<FeedbackResponse> {
    const [created] = await db.insert(responses).values(response).returning();
    if (answersList.length > 0) {
      await db.insert(answers).values(
        answersList.map((a) => ({ ...a, responseId: created.id }))
      );
    }
    return created;
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
