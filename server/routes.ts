import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertQuestionSchema, insertAnswerSchema, insertRoadmapItemSchema, insertChangelogItemSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import { requireAuth, requirePlatformAdmin, requireActivePlan, hashPassword, verifyPassword, setUserLookup } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
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
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

async function isUserActivated(userId: string): Promise<{ activated: boolean; plan: string }> {
  const user = await storage.getUserById(userId);
  if (!user) return { activated: false, plan: "none" };

  if (user.role === "platform_admin") {
    return { activated: true, plan: "lifetime_pro" };
  }

  if (user.planType !== "none") {
    return { activated: true, plan: user.planType };
  }

  return { activated: false, plan: "none" };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setUserLookup((id: string) => storage.getUserById(id));

  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { firstName, lastName, email, password } = parsed.data;

      const existingUser = await storage.getUserByEmail(email.toLowerCase().trim());
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: sanitize(firstName),
        lastName: sanitize(lastName),
      });

      req.session.userId = user.id;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({ message: "Failed to create account" });
        }
        res.status(201).json({
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, planType: user.planType },
        });
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

      req.session.userId = user.id;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({ message: "Failed to log in" });
        }
        res.json({
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, planType: user.planType },
        });
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
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, planType: user.planType },
    });
  });


  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        firstName: z.string().min(1, "First name is required").max(100),
        lastName: z.string().min(1, "Last name is required").max(100),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const updated = await storage.updateUserProfile(
        req.session.userId!,
        parsed.data.firstName.trim(),
        parsed.data.lastName.trim()
      );

      res.json({
        user: { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName },
      });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/auth/password", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const valid = await verifyPassword(parsed.data.currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(parsed.data.newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const uid = req.session.userId!;
      const projectsList = await storage.getProjects(uid);
      res.json(projectsList);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(p(req.params.id));
      if (!project || project.userId !== req.session.userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const uid = req.session.userId!;
      const { activated, plan } = await isUserActivated(uid);

      if (!activated) {
        return res.status(403).json({ message: "Account not activated. Please purchase a plan or redeem a Lifetime Deal code." });
      }

      if (plan === "lifetime_starter") {
        const existingProjects = await storage.getProjectsByUserId(uid);
        if (existingProjects.length >= 3) {
          return res.status(403).json({ message: "Starter Lifetime plan is limited to 3 projects. Upgrade to Pro Lifetime for unlimited projects." });
        }
      }

      const parsed = createProjectBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const { project, questions } = parsed.data;
      const created = await storage.createProject(
        { ...project, userId: uid },
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
      if (!project || project.userId !== req.session.userId) {
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
      if (!project || project.userId !== req.session.userId) {
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
      if (!project || project.userId !== req.session.userId) {
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
      const uid = req.session.userId!;
      const allResponses = await storage.getResponses(uid);
      res.json(allResponses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses/:id", requireAuth, async (req, res) => {
    try {
      const response = await storage.getResponse(p(req.params.id));
      if (!response) return res.status(404).json({ message: "Response not found" });
      const project = await storage.getProject(response.projectId);
      if (!project || project.userId !== req.session.userId) {
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

      if (project.userId) {
        const { activated } = await isUserActivated(project.userId);
        if (!activated) {
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

      if (project.userId) {
        const { activated } = await isUserActivated(project.userId);
        if (!activated) {
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
      if (!project || project.userId !== req.session.userId) {
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
      const uid = req.session.userId!;
      const { activated } = await isUserActivated(uid);
      if (!activated) {
        return res.status(403).json({ message: "AI Insights requires an active plan. Upgrade to unlock." });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey });
      const allProjects = await storage.getProjects(uid);
      const allResponses = await storage.getResponses(uid);

      if (allResponses.length === 0) {
        return res.status(400).json({ message: "No feedback responses to analyze" });
      }

      const responsesSlice = allResponses.slice(-100);

      const feedbackText = responsesSlice.map((r) => {
        const proj = allProjects.find((pp) => pp.id === r.projectId);
        const answersText = r.answers.map((a) => a.value).join("; ");
        return `[${proj?.name || "Unknown"}] ${r.respondentName || "Anonymous"}: ${answersText}`;
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
      if (!project || project.userId !== req.session.userId) {
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

  app.get("/api/plans", async (_req, res) => {
    try {
      const allPlans = await storage.getPlans();
      res.json(allPlans.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        interval: p.interval,
      })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.get("/api/billing/config", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err) {
      console.error("Failed to get Stripe config:", err);
      res.status(500).json({ message: "Failed to get payment configuration" });
    }
  });

  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === "platform_admin") {
        return res.status(403).json({ message: "Platform admins do not need a subscription" });
      }

      const schema = z.object({ plan: z.enum(["monthly", "yearly"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const activeSub = await storage.getActiveSubscription(user.id);
      if (activeSub) {
        return res.status(400).json({ message: "You already have an active subscription. Please cancel your current plan before subscribing to a new one." });
      }

      const interval = parsed.data.plan === "monthly" ? "month" : "year";
      const dbPlan = await storage.getPlanByInterval(interval);
      if (!dbPlan || !dbPlan.stripePriceId) {
        return res.status(400).json({ message: "No price found for selected plan. Please try again later." });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId: user.id },
        });
        await storage.updateUserStripeCustomerId(user.id, customer.id);
        customerId = customer.id;
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: dbPlan.stripePriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/#pricing`,
        metadata: { userId: user.id, planId: dbPlan.id, plan: parsed.data.plan },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err?.message);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/billing/verify-checkout", requireAuth, async (req, res) => {
    try {
      const schema = z.object({ sessionId: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);

      if (session.customer !== user.stripeCustomerId) {
        return res.status(403).json({ message: "Session does not belong to this user" });
      }

      if (session.payment_status !== "paid") {
        return res.status(400).json({ message: "Payment not completed" });
      }

      const stripeSubscriptionId = session.subscription as string;
      if (!stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription found in session" });
      }

      const existingSub = await storage.getSubscriptionByStripeId(stripeSubscriptionId);
      if (existingSub) {
        return res.json({ message: "Subscription already active", status: "active" });
      }

      const metadata = session.metadata || {};
      const planId = metadata.planId;
      if (!planId) {
        return res.status(400).json({ message: "No plan information in session" });
      }

      let periodStart: Date = new Date();
      let periodEnd: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const subAny = stripeSub as any;
        const itemData = subAny.items?.data?.[0];
        const parsedStart = subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : null;
        const parsedEnd = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : null;
        if (parsedStart) periodStart = parsedStart;
        if (parsedEnd) periodEnd = parsedEnd;
      } catch (err: any) {
        console.error("Failed to retrieve subscription details:", err.message);
      }

      await storage.createSubscription({
        userId: user.id,
        planId,
        stripeSubscriptionId,
        status: "active",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });

      if (!user.planType?.startsWith("lifetime")) {
        const plan = await storage.getPlanById(planId);
        if (plan) {
          const newPlanType = plan.interval === "year" ? "yearly" : "monthly";
          await storage.updateUserPlanType(user.id, newPlanType);
        }
      }

      res.json({ message: "Subscription activated", status: "active" });
    } catch (err: any) {
      console.error("Verify checkout error:", err?.message);
      res.status(500).json({ message: "Failed to verify checkout session" });
    }
  });

  app.get("/api/billing/status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const sub = await storage.getLatestSubscription(user.id);
      if (!sub) {
        return res.json({ subscription: null });
      }

      res.json({
        subscription: {
          id: sub.id,
          status: sub.status,
          planName: sub.plan.name,
          planPrice: sub.plan.price,
          interval: sub.plan.interval,
          currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
      });
    } catch (err) {
      console.error("Billing status error:", err);
      res.status(500).json({ message: "Failed to fetch billing status" });
    }
  });

  app.get("/api/billing/history", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      if (!user.stripeCustomerId) {
        return res.json({ payments: [] });
      }

      try {
        const stripe = await getUncachableStripeClient();
        const paymentIntents = await stripe.paymentIntents.list({
          customer: user.stripeCustomerId,
          limit: 50,
        });

        const payments = paymentIntents.data.map((pi: any) => ({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: pi.created,
        }));

        res.json({ payments });
      } catch (stripeErr: any) {
        console.error("Stripe payment history error:", stripeErr?.message);
        res.json({ payments: [] });
      }
    } catch (err) {
      console.error("Payment history error:", err);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  app.post("/api/billing/switch", requireAuth, async (req, res) => {
    try {
      const schema = z.object({ plan: z.enum(["monthly", "yearly"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const activeSub = await storage.getActiveSubscription(user.id);
      if (!activeSub || !activeSub.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to switch" });
      }

      if (activeSub.cancelAtPeriodEnd) {
        return res.status(400).json({ message: "Cannot switch plans while subscription is scheduled for cancellation. Please reactivate first." });
      }

      const newInterval = parsed.data.plan === "monthly" ? "month" : "year";
      if (activeSub.plan.interval === newInterval) {
        return res.status(400).json({ message: "You are already on this plan" });
      }

      const newPlan = await storage.getPlanByInterval(newInterval);
      if (!newPlan || !newPlan.stripePriceId) {
        return res.status(400).json({ message: "Target plan not found" });
      }

      const stripe = await getUncachableStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(activeSub.stripeSubscriptionId) as any;
      const subscriptionItemId = stripeSub.items?.data?.[0]?.id;

      if (!subscriptionItemId) {
        return res.status(500).json({ message: "Could not find subscription item to update" });
      }

      await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
        items: [{ id: subscriptionItemId, price: newPlan.stripePriceId }],
        proration_behavior: 'create_prorations',
      } as any);

      await storage.updateSubscriptionByStripeId(activeSub.stripeSubscriptionId, {
        planId: newPlan.id,
      });

      res.json({ message: `Switched to ${newPlan.name} plan successfully` });
    } catch (err: any) {
      console.error("Switch plan error:", err?.message);
      res.status(500).json({ message: "Failed to switch plan" });
    }
  });

  app.post("/api/billing/cancel", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const activeSub = await storage.getActiveSubscription(user.id);
      if (!activeSub || !activeSub.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to cancel" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await storage.updateSubscriptionByStripeId(activeSub.stripeSubscriptionId, {
        cancelAtPeriodEnd: true,
      });

      res.json({ message: "Subscription will be canceled at the end of the current billing period" });
    } catch (err: any) {
      console.error("Cancel subscription error:", err?.message);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post("/api/billing/reactivate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const activeSub = await storage.getActiveSubscription(user.id);
      if (!activeSub || !activeSub.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription to reactivate" });
      }

      if (!activeSub.cancelAtPeriodEnd) {
        return res.status(400).json({ message: "Subscription is not scheduled for cancellation" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      await storage.updateSubscriptionByStripeId(activeSub.stripeSubscriptionId, {
        cancelAtPeriodEnd: false,
      });

      res.json({ message: "Subscription reactivated successfully" });
    } catch (err: any) {
      console.error("Reactivate subscription error:", err?.message);
      res.status(500).json({ message: "Failed to reactivate subscription" });
    }
  });

  app.post("/api/ltd/redeem", requireAuth, ltdRedeemLimiter, async (req, res) => {
    try {
      const schema = z.object({ code: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Code is required" });
      const uid = req.session.userId!;
      const redeemed = await storage.redeemLtdCode(parsed.data.code, uid);
      if (!redeemed) return res.status(400).json({ message: "Invalid or already redeemed code" });
      await storage.upgradeAllProjectsToLifetime(uid);
      const planType = redeemed.tier === "starter" ? "lifetime_starter" : "lifetime_pro";
      await storage.updateUserPlanType(uid, planType);
      res.json(redeemed);
    } catch (err) {
      res.status(500).json({ message: "Failed to redeem code" });
    }
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  });

  app.get("/api/admin/stats", requireAuth, requirePlatformAdmin, adminLimiter, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/users", requireAuth, requirePlatformAdmin, adminLimiter, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithCounts = await Promise.all(allUsers.map(async (u) => {
        const projectCount = await storage.getProjectCount(u.id);
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          planType: u.planType,
          projectCount,
          createdAt: u.createdAt,
        };
      }));
      res.json(usersWithCounts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requirePlatformAdmin, adminLimiter, async (req, res) => {
    try {
      const targetId = p(req.params.id);
      if (targetId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const targetUser = await storage.getUserById(targetId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      await storage.deleteUser(targetId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/ltd/codes", requireAuth, requirePlatformAdmin, adminLimiter, async (_req, res) => {
    try {
      const codes = await storage.getAllLtdCodes();
      res.json(codes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch LTD codes" });
    }
  });

  app.post("/api/admin/ltd/generate", requireAuth, requirePlatformAdmin, ltdGenerateLimiter, async (req, res) => {
    try {
      const uid = req.session.userId!;
      const schema = z.object({ tier: z.enum(["starter", "pro"]).default("pro") });
      const parsed = schema.safeParse(req.body || {});
      const tier = parsed.success ? parsed.data.tier : "pro";
      const code = await storage.generateLtdCode(uid, tier);
      res.status(201).json(code);
    } catch (err) {
      res.status(500).json({ message: "Failed to generate code" });
    }
  });

  app.delete("/api/admin/ltd/codes/:id", requireAuth, requirePlatformAdmin, adminLimiter, async (req, res) => {
    try {
      const deleted = await storage.deleteLtdCode(p(req.params.id));
      if (!deleted) return res.status(400).json({ message: "Cannot delete: code not found or already redeemed" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete LTD code" });
    }
  });

  app.get("/api/limits", requireAuth, async (req, res) => {
    try {
      const uid = req.session.userId!;
      const user = await storage.getUserById(uid);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const projectCount = await storage.getProjectCount(uid);
      const userProjects = await storage.getProjects(uid);
      let totalResponses = 0;
      for (const proj of userProjects) {
        totalResponses += await storage.getResponseCountByProject(proj.id);
      }

      const { activated, plan } = await isUserActivated(uid);

      const maxProjects = !activated ? 0 : (plan === "lifetime_starter" ? 3 : null);
      res.json({
        plan,
        activated,
        projectCount,
        totalResponses,
        maxProjects,
        maxResponses: activated ? null : 0,
        canCreateProject: activated && (maxProjects === null || projectCount < maxProjects),
        canSubmitResponse: activated,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch limits" });
    }
  });

  return httpServer;
}
