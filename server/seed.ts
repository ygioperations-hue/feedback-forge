import { db } from "./storage";
import { projects, questions, responses, answers } from "@shared/schema";

export async function seedDatabase() {
  const existingProjects = await db.select().from(projects);
  if (existingProjects.length > 0) return;

  const [p1] = await db.insert(projects).values({
    name: "Website Redesign Feedback",
    description: "Help us improve our new website design by sharing your thoughts on usability, aesthetics, and overall experience.",
    slug: "website-redesign-feedback",
    status: "active",
  }).returning();

  const [p2] = await db.insert(projects).values({
    name: "Customer Support Survey",
    description: "Rate your recent experience with our customer support team.",
    slug: "customer-support-survey",
    status: "active",
  }).returning();

  const [p3] = await db.insert(projects).values({
    name: "New Feature Prioritization",
    description: "Vote on which features we should build next for our product roadmap.",
    slug: "feature-prioritization",
    status: "active",
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

  console.log("Database seeded successfully");
}
