import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").notNull(),
  required: boolean("required").notNull().default(true),
  options: text("options").array(),
  order: integer("order").notNull().default(0),
});

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").notNull().references(() => responses.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, submittedAt: true });
export const insertAnswerSchema = createInsertSchema(answers).omit({ id: true });

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type FeedbackResponse = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type ProjectWithQuestions = Project & { questions: Question[] };
export type ResponseWithAnswers = FeedbackResponse & { answers: Answer[] };
