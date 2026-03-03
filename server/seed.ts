import { db } from "./storage";
import { users, plans, projects, questions, responses, answers, roadmapItems, changelogItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  const existingPlans = await db.select().from(plans);
  if (existingPlans.length === 0) {
    await db.insert(plans).values([
      { name: "Monthly", price: 2900, interval: "month" },
      { name: "Yearly", price: 24900, interval: "year" },
    ]);
    console.log("Plans seeded: Monthly ($29/mo), Yearly ($249/yr)");
  }

  const existingProjects = await db.select().from(projects);
  if (existingProjects.length > 0) return;

  const existingUsers = await db.select().from(users);
  let userId: string;

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
  } else {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const [user] = await db.insert(users).values({
      email: "demo@feedbackforge.app",
      password: hashedPassword,
      firstName: "Demo",
      lastName: "User",
      role: "platform_admin",
      planType: "lifetime_pro",
    }).returning();
    userId = user.id;
  }

  const [p1] = await db.insert(projects).values({
    name: "Website Redesign Feedback",
    description: "Help us improve our new website design by sharing your thoughts on usability, aesthetics, and overall experience.",
    slug: "website-redesign-feedback",
    status: "active",
    userId,
  }).returning();

  const [p2] = await db.insert(projects).values({
    name: "Customer Support Survey",
    description: "Rate your recent experience with our customer support team.",
    slug: "customer-support-survey",
    status: "active",
    userId,
  }).returning();

  const [p3] = await db.insert(projects).values({
    name: "New Feature Prioritization",
    description: "Vote on which features we should build next for our product roadmap.",
    slug: "feature-prioritization",
    status: "active",
    userId,
  }).returning();

  const [q1a] = await db.insert(questions).values({ projectId: p1.id, label: "How would you rate the overall design?", type: "rating", required: true, order: 0 }).returning();
  const [q1b] = await db.insert(questions).values({ projectId: p1.id, label: "What did you like most about the new design?", type: "text", required: true, order: 1 }).returning();
  const [q1c] = await db.insert(questions).values({ projectId: p1.id, label: "How easy was it to navigate?", type: "rating", required: true, order: 2 }).returning();
  const [q1d] = await db.insert(questions).values({ projectId: p1.id, label: "Which section needs the most improvement?", type: "multiple_choice", required: false, options: ["Homepage", "Product Pages", "Checkout", "Account Settings"], order: 3 }).returning();

  const [q2a] = await db.insert(questions).values({ projectId: p2.id, label: "How satisfied were you with the support you received?", type: "rating", required: true, order: 0 }).returning();
  const [q2b] = await db.insert(questions).values({ projectId: p2.id, label: "How would you describe the response time?", type: "multiple_choice", required: true, options: ["Very Fast", "Reasonable", "Slow", "Very Slow"], order: 1 }).returning();
  const [q2c] = await db.insert(questions).values({ projectId: p2.id, label: "Any additional comments about your experience?", type: "text", required: false, order: 2 }).returning();

  const [q3a] = await db.insert(questions).values({ projectId: p3.id, label: "How important is dark mode to you?", type: "rating", required: true, order: 0 }).returning();
  const [q3b] = await db.insert(questions).values({ projectId: p3.id, label: "Which feature would you use most?", type: "multiple_choice", required: true, options: ["API Integrations", "Advanced Analytics", "Team Collaboration", "Mobile App"], order: 1 }).returning();
  const [q3c] = await db.insert(questions).values({ projectId: p3.id, label: "What feature are we missing?", type: "text", required: false, order: 2 }).returning();

  const [r1] = await db.insert(responses).values({ projectId: p1.id, respondentName: "Sarah Chen", respondentEmail: "sarah.chen@example.com" }).returning();
  await db.insert(answers).values([
    { responseId: r1.id, questionId: q1a.id, value: "5" },
    { responseId: r1.id, questionId: q1b.id, value: "The clean typography and consistent color palette really stand out. Navigation feels intuitive." },
    { responseId: r1.id, questionId: q1c.id, value: "4" },
    { responseId: r1.id, questionId: q1d.id, value: "Product Pages" },
  ]);

  const [r2] = await db.insert(responses).values({ projectId: p1.id, respondentName: "Marcus Rivera", respondentEmail: "m.rivera@example.com" }).returning();
  await db.insert(answers).values([
    { responseId: r2.id, questionId: q1a.id, value: "4" },
    { responseId: r2.id, questionId: q1b.id, value: "The mobile responsiveness is excellent. Pages load quickly and images are well optimized." },
    { responseId: r2.id, questionId: q1c.id, value: "5" },
    { responseId: r2.id, questionId: q1d.id, value: "Checkout" },
  ]);

  const [r3] = await db.insert(responses).values({ projectId: p1.id, respondentName: "Emily Watkins" }).returning();
  await db.insert(answers).values([
    { responseId: r3.id, questionId: q1a.id, value: "3" },
    { responseId: r3.id, questionId: q1b.id, value: "The footer redesign is a big improvement over the old site." },
    { responseId: r3.id, questionId: q1c.id, value: "3" },
  ]);

  const [r4] = await db.insert(responses).values({ projectId: p2.id, respondentName: "David Park", respondentEmail: "dpark@example.com" }).returning();
  await db.insert(answers).values([
    { responseId: r4.id, questionId: q2a.id, value: "5" },
    { responseId: r4.id, questionId: q2b.id, value: "Very Fast" },
    { responseId: r4.id, questionId: q2c.id, value: "Agent was incredibly helpful and resolved my issue in under 5 minutes. Great work!" },
  ]);

  const [r5] = await db.insert(responses).values({ projectId: p2.id, respondentName: "Lisa Kowalski" }).returning();
  await db.insert(answers).values([
    { responseId: r5.id, questionId: q2a.id, value: "2" },
    { responseId: r5.id, questionId: q2b.id, value: "Slow" },
    { responseId: r5.id, questionId: q2c.id, value: "Had to wait a long time for a response and the first solution didn't work." },
  ]);

  const [r6] = await db.insert(responses).values({ projectId: p3.id, respondentName: "Alex Johnson", respondentEmail: "alex.j@example.com" }).returning();
  await db.insert(answers).values([
    { responseId: r6.id, questionId: q3a.id, value: "5" },
    { responseId: r6.id, questionId: q3b.id, value: "Advanced Analytics" },
    { responseId: r6.id, questionId: q3c.id, value: "A Slack integration for real-time notifications would be amazing." },
  ]);

  const existingRoadmap = await db.select().from(roadmapItems);
  if (existingRoadmap.length === 0) {
    await db.insert(roadmapItems).values([
      { projectId: p1.id, title: "Responsive mobile navigation", description: "Redesign the navigation menu to work seamlessly on mobile devices with a hamburger menu and smooth transitions.", status: "completed", upvotes: 24, order: 0 },
      { projectId: p1.id, title: "Dark mode support", description: "Add a dark color scheme that respects user system preferences and can be toggled manually.", status: "in_progress", upvotes: 42, order: 1 },
      { projectId: p1.id, title: "Accessibility audit", description: "Conduct a full WCAG 2.1 AA compliance audit and fix all issues found.", status: "planned", upvotes: 18, order: 2 },
      { projectId: p1.id, title: "Performance optimization", description: "Improve Lighthouse scores by lazy loading images, code splitting, and optimizing critical rendering path.", status: "planned", upvotes: 31, order: 3 },
      { projectId: p1.id, title: "Search functionality", description: "Add full-text search across all pages with instant results and filters.", status: "under_review", upvotes: 15, order: 4 },
      { projectId: p3.id, title: "API Integrations", description: "Build REST API endpoints for third-party integrations with webhooks support.", status: "in_progress", upvotes: 37, order: 0 },
      { projectId: p3.id, title: "Advanced Analytics Dashboard", description: "Real-time charts and KPIs with customizable date ranges and export options.", status: "planned", upvotes: 29, order: 1 },
      { projectId: p3.id, title: "Team Collaboration", description: "Invite team members, assign roles, and add commenting on feedback responses.", status: "planned", upvotes: 22, order: 2 },
      { projectId: p3.id, title: "Mobile App (iOS & Android)", description: "Native mobile apps for on-the-go feedback collection and management.", status: "under_review", upvotes: 45, order: 3 },
    ]);
  }

  const existingChangelog = await db.select().from(changelogItems);
  if (existingChangelog.length === 0) {
    await db.insert(changelogItems).values([
      { projectId: p1.id, title: "Launched new homepage design", description: "Completely redesigned the homepage with a modern layout, improved hero section, and better call-to-action placement.", type: "feature", publishedAt: new Date("2026-02-10") },
      { projectId: p1.id, title: "Fixed mobile navigation bug", description: "Resolved an issue where the mobile menu would not close after selecting a link.", type: "bugfix", publishedAt: new Date("2026-02-12") },
      { projectId: p1.id, title: "Improved page load speed", description: "Optimized images and implemented lazy loading, reducing page load time by 40%.", type: "improvement", publishedAt: new Date("2026-02-15") },
      { projectId: p1.id, title: "Added dark mode toggle", description: "Users can now switch between light and dark themes from the header.", type: "feature", publishedAt: new Date("2026-02-17") },
      { projectId: p3.id, title: "API v2 released", description: "New REST API with rate limiting, webhooks, and improved documentation.", type: "feature", publishedAt: new Date("2026-02-14") },
      { projectId: p3.id, title: "Dashboard performance update", description: "Charts now load 3x faster with server-side rendering and data caching.", type: "improvement", publishedAt: new Date("2026-02-16") },
    ]);
  }

  console.log("Database seeded successfully (demo@feedbackforge.app / password123)");

  const adminEmail = "ygi.operations@gmail.com";
  const existingAdmin = await db.select().from(users).where(
    eq(users.email, adminEmail)
  );
  if (existingAdmin.length === 0) {
    const adminHash = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      email: adminEmail,
      password: adminHash,
      firstName: "Admin",
      lastName: "User",
      role: "platform_admin",
      planType: "lifetime_pro",
    });
    console.log(`Admin account created: ${adminEmail}`);
  }
}
