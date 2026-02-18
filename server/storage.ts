import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  projects,
  questions,
  responses,
  answers,
  roadmapItems,
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
  type ProjectWithQuestions,
  type ResponseWithAnswers,
} from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<ProjectWithQuestions | undefined>;
  getProjectBySlug(slug: string): Promise<ProjectWithQuestions | undefined>;
  createProject(project: InsertProject, questionsList: InsertQuestion[]): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  getResponses(): Promise<(FeedbackResponse & { answers: Answer[] })[]>;
  getResponsesByProject(projectId: string): Promise<ResponseWithAnswers[]>;
  createResponse(response: InsertResponse, answersList: Omit<InsertAnswer, "responseId">[]): Promise<FeedbackResponse>;
  getOrCreateWidgetQuestions(projectId: string): Promise<{ ratingId: string; categoryId: string; messageId: string }>;
  getRoadmapItemsByProject(projectId: string): Promise<RoadmapItem[]>;
  createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem>;
  upvoteRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(projects.createdAt);
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

  async getResponses(): Promise<(FeedbackResponse & { answers: Answer[] })[]> {
    const allResponses = await db.select().from(responses).orderBy(responses.submittedAt);
    const allAnswers = await db.select().from(answers);
    return allResponses.map((r) => ({
      ...r,
      answers: allAnswers.filter((a) => a.responseId === r.id),
    }));
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
}

export const storage = new DatabaseStorage();
