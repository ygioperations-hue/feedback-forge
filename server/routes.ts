import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertQuestionSchema, insertAnswerSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

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

  app.post("/api/ai/summary", async (_req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey });
      const allResponses = await storage.getResponses();
      const projects = await storage.getProjects();

      if (allResponses.length === 0) {
        return res.status(400).json({ message: "No feedback responses to analyze" });
      }

      const responses = allResponses.slice(-100);

      const feedbackText = responses.map((r) => {
        const project = projects.find((p) => p.id === r.projectId);
        const answersText = r.answers.map((a) => a.value).join("; ");
        return `[${project?.name || "Unknown"}] ${r.respondentName || "Anonymous"}: ${answersText}`;
      }).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a feedback analyst. Analyze the following user feedback and provide a structured summary. Return valid JSON with this exact structure: { \"bullets\": [\"bullet1\", \"bullet2\", \"bullet3\"], \"insight\": \"A paragraph of overall insight\", \"topRequests\": [\"request1\", \"request2\", \"request3\"] }. The bullets should be key takeaways. The insight should be a thoughtful paragraph. The topRequests should be the most common asks or themes.",
          },
          {
            role: "user",
            content: `Here are ${responses.length} feedback responses across ${projects.length} projects:\n\n${feedbackText}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "No response from AI" });
      }

      const aiResponseSchema = z.object({
        bullets: z.array(z.string()).min(1).max(5),
        insight: z.string().min(1),
        topRequests: z.array(z.string()).min(1).max(5),
      });

      let parsed;
      try {
        parsed = aiResponseSchema.parse(JSON.parse(content));
      } catch {
        return res.status(500).json({ message: "AI returned an unexpected format. Please try again." });
      }

      res.json({
        ...parsed,
        responseCount: allResponses.length,
        projectCount: projects.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("AI summary error:", err?.message);
      res.status(500).json({ message: err?.message || "Failed to generate AI summary" });
    }
  });

  return httpServer;
}
