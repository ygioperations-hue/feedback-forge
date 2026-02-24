# FeedbackForge

## Overview
FeedbackForge is a multi-tenant SaaS feedback collection and management tool. Each signup creates a new organization with subdomain generation from company name. Features include customizable feedback forms (rating, text, multiple choice), public form sharing via unique links, embeddable feedback widgets, centralized dashboard, AI-powered insights (OpenAI GPT-4o Mini), public roadmaps with upvoting, product changelogs, Stripe payment integration for subscription plans, and lifetime deal code management.

## Authentication & Multi-Tenancy
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup creates an organization (from company name) + admin user in one step
- Organization slug generated from company name (lowercase, hyphenated, unique)
- Session stores both userId and organizationId
- All data (projects, responses, LTD codes) scoped to organizationId
- Password reset via 6-digit security code shown on screen (no email service needed)
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Dashboard routes protected by `requireAuth` middleware + `RequireAuth` React component
- Demo account: demo@feedbackforge.app / password123 (org: "Demo Company", slug: "demo-company")

## Recent Changes
- 2026-02-24: Re-implemented multi-tenant model with organizations table
- 2026-02-24: Signup now creates org + user, generates subdomain slug from company name
- 2026-02-24: All data scoped to organizationId (projects, responses, LTD codes)
- 2026-02-24: Auth context returns both user and organization objects
- 2026-02-24: Sidebar shows organization name with Building2 icon
- 2026-02-24: Signup page includes company name field with subdomain preview
- 2026-02-24: Stripe billing integration (checkout, portal, webhook sync)
- 2026-02-24: Seed creates demo organization "Demo Company" with slug "demo-company"
- 2026-02-23: Added landing page at "/" with features, how-it-works, pricing, testimonials, CTA sections
- 2026-02-23: Password reset changed from token-in-console to 6-digit on-screen code (10 min expiry)
- 2026-02-23: Added draft/published status for projects
- 2026-02-23: Added source field to questions (form/widget) to separate them in public form
- 2026-02-23: Added CORS support for widget and upvote endpoints

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter routing + TanStack Query
- Backend: Express.js with PostgreSQL (Drizzle ORM)
- Database: PostgreSQL (Neon-backed via Replit)
- Auth: bcryptjs (password hashing), express-session + connect-pg-simple (sessions), crypto (reset tokens)
- Payments: Stripe (checkout, subscriptions, billing portal, webhooks)
- AI: OpenAI GPT-4o Mini (via OPENAI_API_KEY secret)

## Project Architecture
- `shared/schema.ts` - Drizzle schema: organizations, users, projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/auth.ts` - Session middleware (connect-pg-simple), requireAuth middleware, password hash/verify, reset token generation
- `server/storage.ts` - DatabaseStorage class with all CRUD ops, organization-scoped queries
- `server/routes.ts` - REST API endpoints under /api (auth + protected + public)
- `server/stripeClient.ts` - Stripe client initialization
- `server/webhookHandlers.ts` - Stripe webhook event handlers
- `server/seed.ts` - Seeds demo organization, user, 3 projects with questions, responses, roadmap, changelog
- `client/src/lib/auth.tsx` - AuthProvider context with user+organization, useAuth hook, RequireAuth gate component
- `client/src/pages/login.tsx` - Login page with email/password
- `client/src/pages/signup.tsx` - Signup page with company name, subdomain preview, first/last name, email, password
- `client/src/pages/forgot-password.tsx` - Forgot password page (3-step: email input, code display + new password, success)
- `client/src/pages/landing.tsx` - Public landing page with hero, features, how-it-works, pricing, testimonials, CTA
- `client/src/pages/billing.tsx` - Subscription management, payment history, billing portal
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, PublicChangelog, ResponsesList, ResponseDetail, Pricing, LtdAdmin, Profile
- `client/src/components/app-sidebar.tsx` - Sidebar with app name, org name, user name, logout button
- `client/src/components/paywall-gate.tsx` - PaywallGate component for plan enforcement
- `client/src/lib/theme-provider.tsx` - Dark/light mode toggle

## Key API Routes

### Auth (public)
- POST /api/auth/signup - Create organization + user, set session (requires companyName, firstName, lastName, email, password)
- POST /api/auth/login - Verify credentials, set session (returns user + organization)
- POST /api/auth/logout - Destroy session
- GET /api/auth/me - Return current user + organization info
- POST /api/auth/forgot-password - Generate 6-digit reset code (returned in response)
- POST /api/auth/reset-password - Validate code + email, update password

### Protected (require auth, organization-scoped)
- PATCH /api/auth/profile - Update user first/last name
- PATCH /api/auth/password - Change password (requires current password)
- GET /api/projects - List organization's projects
- GET /api/projects/:id - Get project with questions (org-checked)
- POST /api/projects - Create project (org-scoped, paywall-checked)
- PATCH /api/projects/:id/status - Toggle project status (org-checked)
- DELETE /api/projects/:id - Delete project (org-checked)
- GET /api/projects/:id/responses - Responses for a project (org-checked)
- GET /api/responses - All organization responses
- GET /api/responses/:id - Single response (org-checked via project)
- POST /api/ai/summary - Generate AI summary (org-scoped)
- POST /api/roadmap/:slug/items - Create roadmap item (org-checked)
- POST /api/changelog/:slug/items - Create changelog item (org-checked)
- GET /api/ltd/codes - List organization's LTD codes
- POST /api/ltd/generate - Generate LTD code (org-scoped)
- POST /api/ltd/redeem - Redeem LTD code (org-scoped)
- GET /api/limits - Get org plan usage/limits
- POST /api/billing/checkout - Create Stripe checkout session
- GET /api/billing/status - Get current subscription status
- GET /api/billing/history - Get payment history
- POST /api/billing/portal - Create Stripe billing portal session

### Public (no auth required)
- GET /api/forms/:slug - Get form by slug
- POST /api/forms/:slug/submit - Submit feedback
- POST /api/widget/:slug/submit - Submit widget feedback
- GET /api/roadmap/:slug - Get roadmap items
- POST /api/roadmap/items/:id/upvote - Upvote roadmap item
- GET /api/changelog/:slug - Get changelog items
- GET /api/billing/config - Get Stripe publishable key

## Pricing & Paywall (No Free Tier)
- No free accounts: must be activated via paid plan or LTD code
- Monthly plan: $29/month (Stripe Hosted Checkout)
- Yearly plan: $249/year (Stripe Hosted Checkout)
- Lifetime deal: Via redeemable codes generated in LTD admin page
- PaywallGate component gates dashboard pages for non-activated users
- Server-side enforcement on create/submit routes
- Stripe webhook syncs subscription status to PostgreSQL

## User Preferences
- None recorded yet
