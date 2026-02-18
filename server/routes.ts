import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertQuestionSchema, insertAnswerSchema } from "@shared/schema";
import { z } from "zod";

const createProjectBodySchema = z.object({
  project: insertProjectSchema,
  questions: z.array(z.object({
    label: z.string().min(1),
    type: z.enum(["rating", "text", "multiple_choice"]),
    required: z.boolean().default(true),
    options: z.array(z.string()).optional().default([]),
    order: z.number().int().min(0).default(0),
  })).default([]),
});

const submitFormBodySchema = z.object({
  respondentName: z.string().nullable().optional(),
  respondentEmail: z.string().email().nullable().optional().or(z.literal("").transform(() => null)),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    value: z.string().min(1),
  })),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const parsed = createProjectBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const { project, questions } = parsed.data;
      const created = await storage.createProject(project, questions.map((q) => ({ ...q, projectId: "" })));
      res.status(201).json(created);
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(400).json({ message: "A project with this slug already exists" });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/responses", async (req, res) => {
    try {
      const responses = await storage.getResponsesByProject(req.params.id);
      res.json(responses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses", async (_req, res) => {
    try {
      const responses = await storage.getResponses();
      res.json(responses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/forms/:slug", async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(req.params.slug);
      if (!project) return res.status(404).json({ message: "Form not found" });
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post("/api/forms/:slug/submit", async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(req.params.slug);
      if (!project) return res.status(404).json({ message: "Form not found" });

      const parsed = submitFormBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { respondentName, respondentEmail, answers } = parsed.data;

      const requiredQuestions = project.questions.filter((q) => q.required);
      for (const rq of requiredQuestions) {
        const answer = answers.find((a) => a.questionId === rq.id);
        if (!answer || !answer.value || answer.value.trim() === "") {
          return res.status(400).json({ message: `Answer for "${rq.label}" is required` });
        }
      }

      const response = await storage.createResponse(
        { projectId: project.id, respondentName: respondentName || null, respondentEmail: respondentEmail || null },
        answers.map((a) => ({ questionId: a.questionId, value: a.value }))
      );

      res.status(201).json(response);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  return httpServer;
}
