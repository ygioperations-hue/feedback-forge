# FeedbackForge

## Overview
FeedbackForge is a single-user SaaS feedback collection and management tool. Users sign up with email/password (no company name or organization). All data is scoped to the user's userId. Features include customizable feedback forms (rating, text, multiple choice), public form sharing via unique links, embeddable feedback widgets, centralized dashboard, AI-powered insights (OpenAI GPT-4o Mini), public roadmaps with upvoting, product changelogs, Stripe payment integration for subscription plans, and lifetime deal code management.

## Authentication (Single-User)
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup requires: firstName, lastName, email, password (no company name, no organization)
- Session stores userId only
- All data (projects, responses, LTD codes) scoped to userId
- Password reset via 6-digit security code shown on screen (no email service needed)
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Dashboard routes protected by `requireAuth` middleware + `RequireAuth` React component
- Demo account: demo@feedbackforge.app / password123

## Recent Changes
- 2026-02-25: Replaced stripe.* external tables with local plans + subscriptions tables
- 2026-02-25: Plans table stores pricing (Monthly $29/mo, Yearly $249/yr) with Stripe price IDs
- 2026-02-25: Subscriptions table tracks user subscriptions (status, period dates, cancelAtPeriodEnd)
- 2026-02-25: Removed stripeSubscriptionId from users table (moved to subscriptions table)
- 2026-02-25: Removed stripe-replit-sync dependency from index.ts (no more runMigrations/syncBackfill)
- 2026-02-25: Added server/stripe-setup.ts for auto-creating Stripe products/prices on startup
- 2026-02-25: Added isUserActivated() helper for paywall checks (replaces repeated stripe.subscriptions SQL)
- 2026-02-25: Billing history now uses Stripe API directly (stripe.paymentIntents.list)
- 2026-02-25: Added GET /api/plans public endpoint
- 2026-02-25: Removed multi-tenant/organization architecture entirely
- 2026-02-25: Signup simplified to firstName, lastName, email, password only
- 2026-02-25: All data scoped to userId (no organizationId)
- 2026-02-24: Stripe billing integration (checkout, portal, webhook sync)
- 2026-02-23: Added landing page at "/" with features, how-it-works, pricing, testimonials, CTA sections

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter routing + TanStack Query
- Backend: Express.js with PostgreSQL (Drizzle ORM)
- Database: PostgreSQL (Neon-backed via Replit)
- Auth: bcryptjs (password hashing), express-session + connect-pg-simple (sessions), crypto (reset tokens)
- Payments: Stripe (checkout, subscriptions, billing portal, webhooks) — plans/subscriptions stored locally
- AI: OpenAI GPT-4o Mini (via OPENAI_API_KEY secret)

## Project Architecture
- `shared/schema.ts` - Drizzle schema: users, plans, subscriptions, projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/auth.ts` - Session middleware (connect-pg-simple), requireAuth middleware, password hash/verify, reset token generation
- `server/storage.ts` - DatabaseStorage class with all CRUD ops, userId-scoped queries, plan/subscription methods
- `server/routes.ts` - REST API endpoints under /api (auth + protected + public), isUserActivated() helper
- `server/stripeClient.ts` - Stripe client initialization (via Replit connector)
- `server/stripe-setup.ts` - Auto-creates Stripe product/prices on startup, links stripePriceId to plans table
- `server/webhookHandlers.ts` - Stripe webhook handlers: checkout.session.completed, subscription.updated, subscription.deleted → writes to subscriptions table
- `server/seed.ts` - Seeds plans (Monthly/Yearly), demo user, 3 projects with questions, responses, roadmap, changelog
- `client/src/lib/auth.tsx` - AuthProvider context with user, useAuth hook, RequireAuth gate component
- `client/src/pages/login.tsx` - Login page with email/password
- `client/src/pages/signup.tsx` - Signup page with first/last name, email, password
- `client/src/pages/forgot-password.tsx` - Forgot password page (3-step: email input, code display + new password, success)
- `client/src/pages/landing.tsx` - Public landing page with hero, features, how-it-works, pricing, testimonials, CTA
- `client/src/pages/billing.tsx` - Subscription management, payment history, billing portal
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, PublicChangelog, ResponsesList, ResponseDetail, Pricing, LtdAdmin, Profile
- `client/src/components/app-sidebar.tsx` - Sidebar with app name, user name, logout button
- `client/src/components/paywall-gate.tsx` - PaywallGate component for plan enforcement
- `client/src/lib/theme-provider.tsx` - Dark/light mode toggle

## Key API Routes

### Auth (public)
- POST /api/auth/signup - Create user, set session (requires firstName, lastName, email, password)
- POST /api/auth/login - Verify credentials, set session (returns user)
- POST /api/auth/logout - Destroy session
- GET /api/auth/me - Return current user info
- POST /api/auth/forgot-password - Generate 6-digit reset code (returned in response)
- POST /api/auth/reset-password - Validate code + email, update password

### Protected (require auth, userId-scoped)
- PATCH /api/auth/profile - Update user first/last name
- PATCH /api/auth/password - Change password (requires current password)
- GET /api/projects - List user's projects
- GET /api/projects/:id - Get project with questions (userId-checked)
- POST /api/projects - Create project (userId-scoped, paywall-checked via isUserActivated)
- PATCH /api/projects/:id/status - Toggle project status (userId-checked)
- DELETE /api/projects/:id - Delete project (userId-checked)
- GET /api/projects/:id/responses - Responses for a project (userId-checked)
- GET /api/responses - All user responses
- GET /api/responses/:id - Single response (userId-checked via project)
- POST /api/ai/summary - Generate AI summary (paywall-checked via isUserActivated)
- POST /api/roadmap/:slug/items - Create roadmap item (userId-checked)
- POST /api/changelog/:slug/items - Create changelog item (userId-checked)
- GET /api/ltd/codes - List user's LTD codes
- POST /api/ltd/generate - Generate LTD code (userId-scoped)
- POST /api/ltd/redeem - Redeem LTD code (userId-scoped)
- GET /api/limits - Get user plan usage/limits (uses isUserActivated)
- POST /api/billing/checkout - Create Stripe checkout session (uses plans table for stripePriceId)
- GET /api/billing/status - Get subscription from local subscriptions table (joined with plans)
- GET /api/billing/history - Get payment history (via Stripe API directly)
- POST /api/billing/cancel - Cancel subscription at period end (sets cancel_at_period_end in Stripe + local DB)
- POST /api/billing/reactivate - Undo cancellation (clears cancel_at_period_end in Stripe + local DB)

### Public (no auth required)
- GET /api/forms/:slug - Get form by slug
- POST /api/forms/:slug/submit - Submit feedback (paywall-checked via isUserActivated)
- POST /api/widget/:slug/submit - Submit widget feedback (paywall-checked via isUserActivated)
- GET /api/roadmap/:slug - Get roadmap items
- POST /api/roadmap/items/:id/upvote - Upvote roadmap item
- GET /api/changelog/:slug - Get changelog items
- GET /api/billing/config - Get Stripe publishable key
- GET /api/plans - Get available plans (name, price, interval)

## Database Schema
- **users**: id, email, password, firstName, lastName, stripeCustomerId, resetToken, resetTokenExpiry, createdAt
- **plans**: id, name (Monthly/Yearly), price (cents), interval (month/year), stripePriceId, createdAt
- **subscriptions**: id, userId (FK→users), planId (FK→plans), stripeSubscriptionId, status (active/canceled/past_due), currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt
- **projects**: id, name, description, status, slug, plan, userId (FK→users), createdAt
- **questions**: id, projectId, label, type, required, options, order, source
- **responses**: id, projectId, respondentName, respondentEmail, submittedAt
- **answers**: id, responseId, questionId, value
- **roadmapItems**: id, projectId, title, description, status, upvotes, order, createdAt
- **changelogItems**: id, projectId, title, description, type, publishedAt
- **ltdCodes**: id, code, isRedeemed, redeemedAt, userId, createdAt

## Pricing & Paywall (No Free Tier)
- No free accounts: must be activated via paid plan or LTD code
- Monthly plan: $29/month (Stripe Hosted Checkout)
- Yearly plan: $249/year (Stripe Hosted Checkout)
- Lifetime deal: Via redeemable codes generated in LTD admin page
- Plans stored in local `plans` table with Stripe price IDs auto-created on startup
- Subscriptions tracked in local `subscriptions` table (source of truth)
- isUserActivated() helper checks: LTD codes → project plans → active subscription
- PaywallGate component gates dashboard pages for non-activated users
- Server-side enforcement on create/submit routes
- Stripe webhooks create/update subscription records in local DB

## User Preferences
- None recorded yet
