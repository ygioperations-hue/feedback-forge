# FeedbackForge

## Overview
FeedbackForge is a multi-tenant feedback collection and management SaaS. Users sign up with a company name (creating an organization), log in with email/password, and manage feedback projects scoped to their organization. Features include customizable feedback forms (rating, text, multiple choice), public form sharing via unique links, embeddable feedback widgets, centralized dashboard, AI-powered insights (OpenAI), public roadmaps with upvoting, product changelogs, pricing tiers, and lifetime deal code management.

## Authentication & Multi-Tenancy
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup creates an organization + admin user; org slug generated from company name
- All data (projects, responses, LTD codes) scoped to user's organization via `organizationId`
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Dashboard routes protected by `requireAuth` middleware + `RequireAuth` React component
- Demo account: demo@feedbackforge.app / password123

## Recent Changes
- 2026-02-23: Added multi-tenant auth (organizations, users, login/signup, session-based)
- 2026-02-23: All API routes org-scoped; public routes remain unauthenticated
- 2026-02-23: Added draft/published status for projects (default: draft, publish from detail page)
- 2026-02-23: Added response detail page (/responses/:id) with full answer display
- 2026-02-23: Added source field to questions (form/widget) to separate them in public form
- 2026-02-23: Added CORS support for widget and upvote endpoints

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter routing + TanStack Query
- Backend: Express.js with PostgreSQL (Drizzle ORM)
- Database: PostgreSQL (Neon-backed via Replit)
- Auth: bcryptjs (password hashing), express-session + connect-pg-simple (sessions)
- AI: OpenAI GPT-4o Mini (via OPENAI_API_KEY secret)

## Project Architecture
- `shared/schema.ts` - Drizzle schema: organizations, users, projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/auth.ts` - Session middleware (connect-pg-simple), requireAuth middleware, password hash/verify
- `server/storage.ts` - DatabaseStorage class with all CRUD ops, org-scoped queries
- `server/routes.ts` - REST API endpoints under /api (auth + protected + public)
- `server/seed.ts` - Seeds demo org, user, 3 projects with questions, responses, roadmap, changelog
- `client/src/lib/auth.tsx` - AuthProvider context, useAuth hook, RequireAuth gate component
- `client/src/pages/login.tsx` - Login page with email/password
- `client/src/pages/signup.tsx` - Signup page with company name, subdomain preview, user details
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, PublicChangelog, ResponsesList, ResponseDetail, Pricing, LtdAdmin
- `client/src/components/app-sidebar.tsx` - Sidebar with org name, user email, logout button
- `client/src/components/paywall-gate.tsx` - PaywallGate component for plan enforcement
- `client/src/lib/theme-provider.tsx` - Dark/light mode toggle

## Key API Routes

### Auth (public)
- POST /api/auth/signup - Create org + user, set session
- POST /api/auth/login - Verify credentials, set session
- POST /api/auth/logout - Destroy session
- GET /api/auth/me - Return current user + org info

### Protected (require auth, org-scoped)
- GET /api/projects - List org's projects
- GET /api/projects/:id - Get project with questions (org-checked)
- POST /api/projects - Create project (org-scoped, paywall-checked)
- PATCH /api/projects/:id/status - Toggle project status
- DELETE /api/projects/:id - Delete project (org-checked)
- GET /api/projects/:id/responses - Responses for a project (org-checked)
- GET /api/responses - All org responses
- GET /api/responses/:id - Single response (org-checked)
- POST /api/ai/summary - Generate AI summary (org-scoped)
- POST /api/roadmap/:slug/items - Create roadmap item (org-checked)
- POST /api/changelog/:slug/items - Create changelog item (org-checked)
- GET /api/ltd/codes - List org's LTD codes
- POST /api/ltd/generate - Generate LTD code (org-scoped)
- POST /api/ltd/redeem - Redeem LTD code (org-scoped)
- GET /api/limits - Get org plan usage/limits

### Public (no auth required)
- GET /api/forms/:slug - Get form by slug
- POST /api/forms/:slug/submit - Submit feedback
- POST /api/widget/:slug/submit - Submit widget feedback
- GET /api/roadmap/:slug - Get roadmap items
- POST /api/roadmap/items/:id/upvote - Upvote roadmap item
- GET /api/changelog/:slug - Get changelog items

## Pricing & Paywall (No Free Tier)
- No free accounts: must be activated via paid plan or LTD code
- Monthly plan: $29/month (UI only, no payment processing)
- Yearly plan: $249/year (UI only, no payment processing)
- Lifetime deal: Via redeemable codes generated in LTD admin page
- PaywallGate component gates dashboard pages for non-activated orgs
- Server-side enforcement on create/submit routes

## User Preferences
- None recorded yet
