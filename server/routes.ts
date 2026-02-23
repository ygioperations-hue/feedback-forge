import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertQuestionSchema, insertAnswerSchema, insertRoadmapItemSchema, insertChangelogItemSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import { requireAuth, hashPassword, verifyPassword } from "./auth";

function p(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

function widgetCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}

const publicSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many submissions. Please try again in 15 minutes." },
});

const upvoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many upvotes. Please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI summary limit reached. Please try again in an hour." },
});

const ltdRedeemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many redemption attempts. Please try again later." },
});

const ltdGenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code generation requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim();
}

function sanitize(val: string): string {
  return stripHtml(val);
}

const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 320;
const MAX_ANSWER_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_ANSWERS_PER_SUBMISSION = 50;

const createProjectBodySchema = z.object({
  project: insertProjectSchema,
  questions: z.array(z.object({
    label: z.string().min(1).max(500),
    type: z.enum(["rating", "text", "multiple_choice"]),
    required: z.boolean().default(true),
    options: z.array(z.string().max(500)).max(50).optional().default([]),
    order: z.number().int().min(0).default(0),
  })).max(50).default([]),
});

const submitFormBodySchema = z.object({
  respondentName: z.string().max(MAX_NAME_LENGTH).nullable().optional(),
  respondentEmail: z.string().max(MAX_EMAIL_LENGTH).email().nullable().optional().or(z.literal("").transform(() => null)),
  answers: z.array(z.object({
    questionId: z.string().min(1).max(100),
    value: z.string().min(1).max(MAX_ANSWER_LENGTH),
  })).min(1).max(MAX_ANSWERS_PER_SUBMISSION),
});

const signupSchema = z.object({
  companyName: z.string().min(2).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

function generateOrgSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { companyName, firstName, lastName, email, password } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      let slug = generateOrgSlug(companyName);
      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg) {
        slug = slug + "-" + Math.random().toString(36).substring(2, 6);
      }

      const org = await storage.createOrganization({ name: sanitize(companyName), slug });
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: sanitize(firstName),
        lastName: sanitize(lastName),
        role: "admin",
        organizationId: org.id,
      });

      req.session.userId = user.id;
      req.session.organizationId = org.id;

      res.status(201).json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      console.error("Signup error:", err);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const org = await storage.getOrganization(user.organizationId);

      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;

      res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        organization: org ? { id: org.id, name: org.name, slug: org.slug } : null,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId || !req.session.organizationId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const org = await storage.getOrganization(req.session.organizationId);
    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      organization: org ? { id: org.id, name: org.name, slug: org.slug } : null,
    });
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjects(req.session.organizationId!);
      res.json(projects);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(p(req.params.id));
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const orgId = req.session.organizationId!;
      const allProjects = await storage.getProjects(orgId);
      const orgLtdCodes = await storage.getLtdCodes(orgId);
      const hasRedeemedCode = orgLtdCodes.some(c => c.isRedeemed);
      const hasLifetime = allProjects.some(proj => proj.plan === "lifetime" || proj.plan === "paid");
      if (!hasLifetime && !hasRedeemedCode) {
        return res.status(403).json({ message: "Account not activated. Please purchase a plan or redeem a Lifetime Deal code." });
      }

      const parsed = createProjectBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const { project, questions } = parsed.data;
      const created = await storage.createProject(
        { ...project, organizationId: orgId },
        questions.map((q) => ({ ...q, projectId: "" }))
      );
      res.status(201).json(created);
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(400).json({ message: "A project with this slug already exists" });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id/status", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(p(req.params.id));
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Project not found" });
      }
      const { status } = req.body;
      if (status !== "active" && status !== "draft") {
        return res.status(400).json({ message: "Status must be 'active' or 'draft'" });
      }
      const updated = await storage.updateProjectStatus(p(req.params.id), status);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update project status" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(p(req.params.id));
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Project not found" });
      }
      await storage.deleteProject(p(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/responses", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(p(req.params.id));
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Project not found" });
      }
      const projectResponses = await storage.getResponsesByProject(p(req.params.id));
      res.json(projectResponses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses", requireAuth, async (req, res) => {
    try {
      const responses = await storage.getResponses(req.session.organizationId!);
      res.json(responses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses/:id", requireAuth, async (req, res) => {
    try {
      const response = await storage.getResponse(p(req.params.id));
      if (!response) return res.status(404).json({ message: "Response not found" });
      const project = await storage.getProject(response.projectId);
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Response not found" });
      }
      res.json({ ...response, projectName: project?.name || "Unknown" });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.get("/api/forms/:slug", async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project) return res.status(404).json({ message: "Form not found" });
      if (project.status === "draft") return res.status(403).json({ message: "This project is not published yet" });
      res.json({
        ...project,
        questions: (project.questions || []).filter((q) => q.source !== "widget"),
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post("/api/forms/:slug/submit", publicSubmitLimiter, async (req: any, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project) return res.status(404).json({ message: "Form not found" });
      if (project.status === "draft") return res.status(403).json({ message: "This project is not published yet" });

      const parsed = submitFormBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { respondentName, respondentEmail, answers } = parsed.data;

      const sanitizedName = respondentName ? sanitize(respondentName) : null;
      const sanitizedAnswers = answers.map((a) => ({
        questionId: a.questionId,
        value: sanitize(a.value),
      }));

      const validQuestionIds = new Set(project.questions.map((q) => q.id));
      const invalidAnswers = sanitizedAnswers.filter((a) => !validQuestionIds.has(a.questionId));
      if (invalidAnswers.length > 0) {
        return res.status(400).json({ message: "Invalid question ID in submission" });
      }

      const requiredQuestions = project.questions.filter((q) => q.required);
      for (const rq of requiredQuestions) {
        const answer = sanitizedAnswers.find((a) => a.questionId === rq.id);
        if (!answer || !answer.value || answer.value.trim() === "") {
          return res.status(400).json({ message: `Answer for "${rq.label}" is required` });
        }
      }

      if (project.organizationId) {
        const orgProjects = await storage.getProjects(project.organizationId);
        const orgLtdCodes = await storage.getLtdCodes(project.organizationId);
        const hasRedeemedCode = orgLtdCodes.some(c => c.isRedeemed);
        const hasLifetime = orgProjects.some(p => p.plan === "lifetime" || p.plan === "paid");
        if (!hasLifetime && !hasRedeemedCode) {
          return res.status(403).json({ message: "Account not activated. Please purchase a plan or redeem a Lifetime Deal code." });
        }
      }

      const response = await storage.createResponse(
        { projectId: project.id, respondentName: sanitizedName || null, respondentEmail: respondentEmail || null },
        sanitizedAnswers
      );

      res.status(201).json(response);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.options("/api/widget/:slug/submit", widgetCors);
  app.post("/api/widget/:slug/submit", widgetCors, publicSubmitLimiter, async (req: any, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.status === "draft") return res.status(403).json({ message: "This project is not published yet" });

      if (project.organizationId) {
        const orgProjects = await storage.getProjects(project.organizationId);
        const orgLtdCodes = await storage.getLtdCodes(project.organizationId);
        const hasRedeemedCode = orgLtdCodes.some(c => c.isRedeemed);
        const hasLifetime = orgProjects.some(proj => proj.plan === "lifetime" || proj.plan === "paid");
        if (!hasLifetime && !hasRedeemedCode) {
          return res.status(403).json({ message: "Account not activated. Feedback collection is paused." });
        }
      }

      const widgetSchema = z.object({
        rating: z.number().int().min(1).max(5),
        category: z.enum(["Bug", "Feature", "Idea", "Other"]),
        message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        name: z.string().max(MAX_NAME_LENGTH).optional(),
        email: z.string().max(MAX_EMAIL_LENGTH).email().optional().or(z.literal("")),
      });

      const parsed = widgetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { rating, category, message, name, email } = parsed.data;
      const sanitizedMessage = sanitize(message);
      const sanitizedName = name ? sanitize(name) : null;

      if (!sanitizedMessage) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const qIds = await storage.getOrCreateWidgetQuestions(project.id);

      const response = await storage.createResponse(
        { projectId: project.id, respondentName: sanitizedName || null, respondentEmail: email?.trim() || null },
        [
          { questionId: qIds.ratingId, value: String(rating) },
          { questionId: qIds.categoryId, value: category },
          { questionId: qIds.messageId, value: sanitizedMessage },
        ]
      );

      res.status(201).json(response);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit widget feedback" });
    }
  });

  app.get("/api/roadmap/:slug", async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.status === "draft") return res.status(403).json({ message: "This project is not published yet" });
      const items = await storage.getRoadmapItemsByProject(project.id);
      res.json({ project: { id: project.id, name: project.name, description: project.description, slug: project.slug }, items });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch roadmap" });
    }
  });

  app.post("/api/roadmap/:slug/items", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Project not found" });
      }
      const parsed = insertRoadmapItemSchema.pick({ title: true, description: true, status: true, order: true }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const item = await storage.createRoadmapItem({ ...parsed.data, projectId: project.id });
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ message: "Failed to create roadmap item" });
    }
  });

  app.options("/api/roadmap/items/:id/upvote", widgetCors);
  app.post("/api/roadmap/items/:id/upvote", widgetCors, upvoteLimiter, async (req: any, res) => {
    try {
      const item = await storage.upvoteRoadmapItem(p(req.params.id));
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: "Failed to upvote" });
    }
  });

  app.post("/api/ai/summary", requireAuth, aiLimiter, async (req, res) => {
    try {
      const orgId = req.session.organizationId!;
      const allProjects = await storage.getProjects(orgId);
      const orgLtdCodes = await storage.getLtdCodes(orgId);
      const hasRedeemedCode = orgLtdCodes.some(c => c.isRedeemed);
      const hasLifetime = allProjects.some(p => p.plan === "lifetime" || p.plan === "paid");
      if (!hasLifetime && !hasRedeemedCode) {
        return res.status(403).json({ message: "AI Insights requires an active plan. Upgrade to unlock." });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey });
      const allResponses = await storage.getResponses(orgId);

      if (allResponses.length === 0) {
        return res.status(400).json({ message: "No feedback responses to analyze" });
      }

      const responsesSlice = allResponses.slice(-100);

      const feedbackText = responsesSlice.map((r) => {
        const project = allProjects.find((p) => p.id === r.projectId);
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
            content: `Here are ${responsesSlice.length} feedback responses across ${allProjects.length} projects:\n\n${feedbackText}`,
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

      let parsedAi;
      try {
        parsedAi = aiResponseSchema.parse(JSON.parse(content));
      } catch {
        return res.status(500).json({ message: "AI returned an unexpected format. Please try again." });
      }

      res.json({
        ...parsedAi,
        responseCount: allResponses.length,
        projectCount: allProjects.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("AI summary error:", err?.message);
      res.status(500).json({ message: err?.message || "Failed to generate AI summary" });
    }
  });

  app.get("/api/changelog/:slug", async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.status === "draft") return res.status(403).json({ message: "This project is not published yet" });
      const items = await storage.getChangelogByProject(project.id);
      res.json({ project: { id: project.id, name: project.name, description: project.description, slug: project.slug }, items });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch changelog" });
    }
  });

  app.post("/api/changelog/:slug/items", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(p(req.params.slug));
      if (!project || project.organizationId !== req.session.organizationId) {
        return res.status(404).json({ message: "Project not found" });
      }
      const parsed = insertChangelogItemSchema.pick({ title: true, description: true, type: true }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const item = await storage.createChangelogItem({ ...parsed.data, projectId: project.id });
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ message: "Failed to create changelog item" });
    }
  });

  app.get("/api/ltd/codes", requireAuth, async (req, res) => {
    try {
      const codes = await storage.getLtdCodes(req.session.organizationId!);
      res.json(codes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch LTD codes" });
    }
  });

  app.post("/api/ltd/generate", requireAuth, ltdGenerateLimiter, async (req, res) => {
    try {
      const code = await storage.generateLtdCode(req.session.organizationId!);
      res.status(201).json(code);
    } catch (err) {
      res.status(500).json({ message: "Failed to generate code" });
    }
  });

  app.post("/api/ltd/redeem", requireAuth, ltdRedeemLimiter, async (req, res) => {
    try {
      const schema = z.object({ code: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Code is required" });
      const orgId = req.session.organizationId!;
      const redeemed = await storage.redeemLtdCode(parsed.data.code, orgId);
      if (!redeemed) return res.status(400).json({ message: "Invalid or already redeemed code" });
      await storage.upgradeAllProjectsToLifetime(orgId);
      res.json(redeemed);
    } catch (err) {
      res.status(500).json({ message: "Failed to redeem code" });
    }
  });

  app.get("/api/limits", requireAuth, async (req, res) => {
    try {
      const orgId = req.session.organizationId!;
      const projectCount = await storage.getProjectCount(orgId);
      const orgProjects = await storage.getProjects(orgId);
      let totalResponses = 0;
      for (const p of orgProjects) {
        totalResponses += await storage.getResponseCountByProject(p.id);
      }
      const orgLtdCodes = await storage.getLtdCodes(orgId);
      const hasRedeemedCode = orgLtdCodes.some(c => c.isRedeemed);
      const hasLifetime = orgProjects.some(p => p.plan === "lifetime" || p.plan === "paid");
      const activated = hasLifetime || hasRedeemedCode;
      const plan = activated ? "lifetime" : "none";
      res.json({
        plan,
        activated,
        projectCount,
        totalResponses,
        maxProjects: activated ? null : 0,
        maxResponses: activated ? null : 0,
        canCreateProject: activated,
        canSubmitResponse: activated,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch limits" });
    }
  });

  return httpServer;
}
