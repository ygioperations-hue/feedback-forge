import { eq, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  organizations,
  users,
  projects,
  questions,
  responses,
  answers,
  roadmapItems,
  changelogItems,
  ltdCodes,
  type Organization,
  type InsertOrganization,
  type User,
  type InsertUser,
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
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;

  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  updateUserProfile(id: string, firstName: string, lastName: string): Promise<User>;
  setResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearResetToken(userId: string): Promise<void>;

  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  updateUserStripeSubscription(userId: string, stripeSubscriptionId: string | null): Promise<User>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;

  getProjects(orgId: string): Promise<Project[]>;
  getProject(id: string): Promise<ProjectWithQuestions | undefined>;
  getProjectBySlug(slug: string): Promise<ProjectWithQuestions | undefined>;
  createProject(project: InsertProject, questionsList: InsertQuestion[]): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  updateProjectStatus(id: string, status: string): Promise<Project | undefined>;
  getResponses(orgId: string): Promise<(FeedbackResponse & { answers: Answer[] })[]>;
  getResponse(id: string): Promise<(FeedbackResponse & { answers: (Answer & { question: Question })[] }) | undefined>;
  getResponsesByProject(projectId: string): Promise<ResponseWithAnswers[]>;
  createResponse(response: InsertResponse, answersList: Omit<InsertAnswer, "responseId">[]): Promise<FeedbackResponse>;
  getOrCreateWidgetQuestions(projectId: string): Promise<{ ratingId: string; categoryId: string; messageId: string }>;
  getRoadmapItemsByProject(projectId: string): Promise<RoadmapItem[]>;
  createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem>;
  upvoteRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
  getChangelogByProject(projectId: string): Promise<ChangelogItem[]>;
  createChangelogItem(item: InsertChangelogItem): Promise<ChangelogItem>;
  generateLtdCode(orgId: string, userId: string): Promise<LtdCode>;
  getLtdCodes(orgId: string): Promise<LtdCode[]>;
  redeemLtdCode(code: string, orgId: string, userId: string): Promise<LtdCode | null>;
  getResponseCountByProject(projectId: string): Promise<number>;
  getProjectCount(orgId: string): Promise<number>;
  upgradeAllProjectsToLifetime(orgId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

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

  async updateUserStripeSubscription(userId: string, stripeSubscriptionId: string | null): Promise<User> {
    const [updated] = await db.update(users).set({ stripeSubscriptionId }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async clearResetToken(userId: string): Promise<void> {
    await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, userId));
  }

  async getProjects(orgId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.organizationId, orgId)).orderBy(projects.createdAt);
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

  async getResponses(orgId: string): Promise<(FeedbackResponse & { answers: Answer[] })[]> {
    const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, orgId));
    const projectIds = orgProjects.map((p) => p.id);
    if (projectIds.length === 0) return [];
    const allResponses = await db.select().from(responses).where(inArray(responses.projectId, projectIds)).orderBy(responses.submittedAt);
    const allAnswers = await db.select().from(answers);
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
      ? await db.select().from(questions)
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
    const allAnswers = await db.select().from(answers);
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

  async getChangelogByProject(projectId: string): Promise<ChangelogItem[]> {
    return db.select().from(changelogItems).where(eq(changelogItems.projectId, projectId)).orderBy(changelogItems.publishedAt);
  }

  async createChangelogItem(item: InsertChangelogItem): Promise<ChangelogItem> {
    const [created] = await db.insert(changelogItems).values(item).returning();
    return created;
  }

  async generateLtdCode(orgId: string, userId: string): Promise<LtdCode> {
    const code = "FF-" + Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join("-");
    const [created] = await db.insert(ltdCodes).values({ code, userId, organizationId: orgId }).returning();
    return created;
  }

  async getLtdCodes(orgId: string): Promise<LtdCode[]> {
    return db.select().from(ltdCodes).where(eq(ltdCodes.organizationId, orgId)).orderBy(ltdCodes.createdAt);
  }

  async redeemLtdCode(code: string, orgId: string, userId: string): Promise<LtdCode | null> {
    const [existing] = await db.select().from(ltdCodes).where(eq(ltdCodes.code, code));
    if (!existing || existing.isRedeemed) return null;
    const [updated] = await db.update(ltdCodes).set({ isRedeemed: true, redeemedAt: new Date(), userId, organizationId: orgId }).where(eq(ltdCodes.id, existing.id)).returning();
    return updated;
  }

  async getResponseCountByProject(projectId: string): Promise<number> {
    const result = await db.select().from(responses).where(eq(responses.projectId, projectId));
    return result.length;
  }

  async getProjectCount(orgId: string): Promise<number> {
    const result = await db.select().from(projects).where(eq(projects.organizationId, orgId));
    return result.length;
  }

  async upgradeAllProjectsToLifetime(orgId: string): Promise<void> {
    await db.update(projects).set({ plan: "lifetime" }).where(eq(projects.organizationId, orgId));
  }
}

export const storage = new DatabaseStorage();
