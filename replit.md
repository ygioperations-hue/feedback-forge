# FeedbackForge

## Overview
FeedbackForge is a single-user SaaS feedback collection and management tool. Users sign up with email/password, log in, and manage feedback projects scoped to their account. Features include customizable feedback forms (rating, text, multiple choice), public form sharing via unique links, embeddable feedback widgets, centralized dashboard, AI-powered insights (OpenAI), public roadmaps with upvoting, product changelogs, pricing tiers, and lifetime deal code management.

## Authentication
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup creates a user account (first name, last name, email, password)
- All data (projects, responses, LTD codes) scoped to user via `userId`
- Password reset via 6-digit security code shown on screen (no email service needed)
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Dashboard routes protected by `requireAuth` middleware + `RequireAuth` React component
- Demo account: demo@feedbackforge.app / password123

## Recent Changes
- 2026-02-23: Reverted multi-tenant to single-user model (removed organizations table entirely)
- 2026-02-23: Simplified signup (first name, last name, email, password only)
- 2026-02-23: Password reset changed from token-in-console to 6-digit on-screen code (10 min expiry)
- 2026-02-23: Removed separate reset-password page; full reset flow on forgot-password page
- 2026-02-23: All data scoped to userId instead of organizationId
- 2026-02-23: Added draft/published status for projects
- 2026-02-23: Added response detail page (/responses/:id) with full answer display
- 2026-02-23: Added source field to questions (form/widget) to separate them in public form
- 2026-02-23: Added CORS support for widget and upvote endpoints

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter routing + TanStack Query
- Backend: Express.js with PostgreSQL (Drizzle ORM)
- Database: PostgreSQL (Neon-backed via Replit)
- Auth: bcryptjs (password hashing), express-session + connect-pg-simple (sessions), crypto (reset tokens)
- AI: OpenAI GPT-4o Mini (via OPENAI_API_KEY secret)

## Project Architecture
- `shared/schema.ts` - Drizzle schema: users, projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/auth.ts` - Session middleware (connect-pg-simple), requireAuth middleware, password hash/verify, reset token generation
- `server/storage.ts` - DatabaseStorage class with all CRUD ops, user-scoped queries
- `server/routes.ts` - REST API endpoints under /api (auth + protected + public)
- `server/seed.ts` - Seeds demo user, 3 projects with questions, responses, roadmap, changelog
- `client/src/lib/auth.tsx` - AuthProvider context, useAuth hook, RequireAuth gate component
- `client/src/pages/login.tsx` - Login page with email/password
- `client/src/pages/signup.tsx` - Signup page with first name, last name, email, password
- `client/src/pages/forgot-password.tsx` - Forgot password page (3-step: email input, code display + new password, success)
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, PublicChangelog, ResponsesList, ResponseDetail, Pricing, LtdAdmin
- `client/src/components/app-sidebar.tsx` - Sidebar with app name, user email, logout button
- `client/src/components/paywall-gate.tsx` - PaywallGate component for plan enforcement
- `client/src/lib/theme-provider.tsx` - Dark/light mode toggle

## Key API Routes

### Auth (public)
- POST /api/auth/signup - Create user, set session
- POST /api/auth/login - Verify credentials, set session
- POST /api/auth/logout - Destroy session
- GET /api/auth/me - Return current user info
- POST /api/auth/forgot-password - Generate 6-digit reset code (returned in response)
- POST /api/auth/reset-password - Validate code + email, update password

### Protected (require auth, user-scoped)
- GET /api/projects - List user's projects
- GET /api/projects/:id - Get project with questions (user-checked)
- POST /api/projects - Create project (user-scoped, paywall-checked)
- PATCH /api/projects/:id/status - Toggle project status
- DELETE /api/projects/:id - Delete project (user-checked)
- GET /api/projects/:id/responses - Responses for a project (user-checked)
- GET /api/responses - All user responses
- GET /api/responses/:id - Single response (user-checked)
- POST /api/ai/summary - Generate AI summary (user-scoped)
- POST /api/roadmap/:slug/items - Create roadmap item (user-checked)
- POST /api/changelog/:slug/items - Create changelog item (user-checked)
- GET /api/ltd/codes - List user's LTD codes
- POST /api/ltd/generate - Generate LTD code (user-scoped)
- POST /api/ltd/redeem - Redeem LTD code (user-scoped)
- GET /api/limits - Get user plan usage/limits

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
- PaywallGate component gates dashboard pages for non-activated users
- Server-side enforcement on create/submit routes

## User Preferences
- None recorded yet
