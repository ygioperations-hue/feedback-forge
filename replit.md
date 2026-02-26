# FeedbackForge

## Overview
FeedbackForge is a SaaS feedback collection and management tool with platform admin and customer roles. Customers sign up with email/password and subscribe to collect feedback. Platform admins manage users, LTD codes, and view platform stats. Features include customizable feedback forms (rating, text, multiple choice), public form sharing via unique links, embeddable feedback widgets, centralized dashboard, AI-powered insights (OpenAI GPT-4o Mini), public roadmaps with upvoting, product changelogs, Stripe payment integration for subscription plans, and lifetime deal code management.

## Roles
- **platform_admin**: Full platform access, user management, LTD code management, admin dashboard. Bypasses paywall. Cannot subscribe via Stripe.
- **customer**: Feedback collection, projects, responses, billing. Requires active plan (monthly/yearly/lifetime) to use features.

## Authentication
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup requires: firstName, lastName, email, password (creates customer role, planType=none)
- Session stores userId; `requireAuth` middleware loads full user onto `req.user`
- Password reset via 6-digit security code shown on screen (no email service needed)
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Middleware chain: `requireAuth` (loads user) → `requirePlatformAdmin` (role check) or `requireActivePlan` (plan check)
- Frontend guards: `RequireAuth` (auth gate), `RequireCustomer` (redirects admin to /admin), `RequireAdmin` (redirects customer to /dashboard)
- Demo account: demo@feedbackforge.app / password123 (platform_admin, lifetime)
- Test account: test@feedbackforge.app / test1234 (customer, monthly)

## Recent Changes
- 2026-02-26: Added platform admin role with full route/UI separation (T001-T011)
- 2026-02-26: Added `role` (customer/platform_admin) and `planType` (none/monthly/yearly/lifetime) to users table
- 2026-02-26: Refactored requireAuth to load full user onto req.user; added requirePlatformAdmin, requireActivePlan middleware
- 2026-02-26: isUserActivated() now uses user.planType as primary check (no more LTD/project/subscription queries)
- 2026-02-26: Stripe webhooks sync user.planType on checkout, subscription update/delete (lifetime never overridden)
- 2026-02-26: LTD redeem sets user.planType = 'lifetime'
- 2026-02-26: Admin API routes: /api/admin/stats, /api/admin/users, /api/admin/ltd/codes (all requirePlatformAdmin)
- 2026-02-26: Admin pages: /admin (dashboard), /admin/users (user management), /admin/ltd (LTD codes)
- 2026-02-26: Sidebar shows different nav for admin vs customer
- 2026-02-26: Frontend route guards prevent cross-role access
- 2026-02-26: Removed old /ltd-admin route and page
- 2026-02-26: Platform admin blocked from Stripe checkout
- 2026-02-26: Fixed data isolation: answer/question queries now properly scoped (no full-table scans)
- 2026-02-25: Replaced stripe.* external tables with local plans + subscriptions tables
- 2026-02-25: Added server/stripe-setup.ts for auto-creating Stripe products/prices on startup
- 2026-02-25: Removed multi-tenant/organization architecture entirely
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
- `shared/schema.ts` - Drizzle schema: users (role, planType), plans, subscriptions, projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/auth.ts` - Session middleware, requireAuth (loads user), requirePlatformAdmin, requireActivePlan, password hash/verify, setUserLookup for dependency injection
- `server/storage.ts` - DatabaseStorage class: all CRUD ops, userId-scoped queries, admin queries (getAllUsers, deleteUser, getAllLtdCodes, getAdminStats)
- `server/routes.ts` - REST API endpoints: auth, customer (protected), admin (requirePlatformAdmin), public
- `server/stripeClient.ts` - Stripe client initialization (via Replit connector)
- `server/stripe-setup.ts` - Auto-creates Stripe product/prices on startup
- `server/webhookHandlers.ts` - Stripe webhook handlers with planType sync (lifetime protected)
- `client/public/widget.js` - Hosted feedback widget script
- `server/seed.ts` - Seeds plans, demo user (admin), test user (customer), sample projects
- `client/src/lib/auth.tsx` - AuthProvider with user (includes role, planType), RequireAuth gate
- `client/src/components/app-sidebar.tsx` - Role-based sidebar navigation
- `client/src/components/paywall-gate.tsx` - PaywallGate (admin bypasses, customer checks planType)
- `client/src/pages/admin-dashboard.tsx` - Admin stats overview (/admin)
- `client/src/pages/admin-users.tsx` - User management with plan change and delete (/admin/users)
- `client/src/pages/admin-ltd.tsx` - LTD code management (/admin/ltd)
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, PublicChangelog, ResponsesList, ResponseDetail, Pricing, Profile, Billing, Login, Signup, ForgotPassword

## Key API Routes

### Auth (public)
- POST /api/auth/signup - Create user (customer, planType=none), set session
- POST /api/auth/login - Verify credentials, set session (returns user with role, planType)
- POST /api/auth/logout - Destroy session
- GET /api/auth/me - Return current user info (includes role, planType)
- POST /api/auth/forgot-password - Generate 6-digit reset code
- POST /api/auth/reset-password - Validate code + email, update password

### Customer (requireAuth, userId-scoped)
- PATCH /api/auth/profile - Update user first/last name
- PATCH /api/auth/password - Change password
- GET /api/projects - List user's projects
- GET /api/projects/:id - Get project (userId-checked)
- POST /api/projects - Create project (paywall-checked)
- PATCH /api/projects/:id/status - Toggle project status
- DELETE /api/projects/:id - Delete project
- GET /api/projects/:id/responses - Responses for project
- GET /api/responses - All user responses
- GET /api/responses/:id - Single response (userId-checked via project)
- POST /api/ai/summary - AI summary (paywall-checked)
- POST /api/roadmap/:slug/items - Create roadmap item
- POST /api/changelog/:slug/items - Create changelog item
- POST /api/ltd/redeem - Redeem LTD code (sets planType=lifetime)
- GET /api/limits - Plan usage/limits
- POST /api/billing/checkout - Stripe checkout (blocked for platform_admin)
- GET /api/billing/status - Subscription status
- GET /api/billing/history - Payment history
- POST /api/billing/switch - Switch plans
- POST /api/billing/cancel - Cancel subscription
- POST /api/billing/reactivate - Reactivate subscription

### Admin (requireAuth + requirePlatformAdmin, rate-limited)
- GET /api/admin/stats - Platform stats (users, subscriptions, lifetime, projects, feedback, MRR)
- GET /api/admin/users - All users with role, planType, projectCount, joinDate
- PATCH /api/admin/users/:id/plan - Change user's planType
- DELETE /api/admin/users/:id - Delete user (prevents self-deletion, cascading delete)
- GET /api/admin/ltd/codes - All LTD codes with redeemer info
- POST /api/admin/ltd/generate - Generate new LTD code
- DELETE /api/admin/ltd/codes/:id - Delete unused LTD code

### Public (no auth required)
- GET /api/forms/:slug - Get form by slug
- POST /api/forms/:slug/submit - Submit feedback (paywall-checked)
- POST /api/widget/:slug/submit - Submit widget feedback (paywall-checked)
- GET /api/roadmap/:slug - Get roadmap items
- POST /api/roadmap/items/:id/upvote - Upvote roadmap item
- GET /api/changelog/:slug - Get changelog items
- GET /api/billing/config - Stripe publishable key
- GET /api/plans - Available plans

## Database Schema
- **users**: id, email, password, firstName, lastName, role (customer/platform_admin), planType (none/monthly/yearly/lifetime), stripeCustomerId, resetToken, resetTokenExpiry, createdAt
- **plans**: id, name, price (cents), interval (month/year), stripePriceId, createdAt
- **subscriptions**: id, userId, planId, stripeSubscriptionId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt
- **projects**: id, name, description, status, slug, plan, userId, createdAt
- **questions**: id, projectId, label, type, required, options, order, source
- **responses**: id, projectId, respondentName, respondentEmail, submittedAt
- **answers**: id, responseId, questionId, value
- **roadmapItems**: id, projectId, title, description, status, upvotes, order, createdAt
- **changelogItems**: id, projectId, title, description, type, publishedAt
- **ltdCodes**: id, code, isRedeemed, redeemedAt, userId, createdAt

## Security
- All customer data queries filter by userId (enforced at both route and storage layer)
- Admin routes protected by requirePlatformAdmin middleware + rate limiting (100 req/15min)
- Self-deletion prevented on admin user management
- Platform admin cannot access Stripe checkout (403)
- Stripe webhooks never override planType='lifetime' with 'none'
- Frontend route guards prevent cross-role access
- Answer/question queries properly scoped (no full-table scans)

## Pricing & Paywall (No Free Tier)
- No free accounts: must be activated via paid plan or LTD code
- Monthly: $29/month, Yearly: $249/year (Stripe Hosted Checkout)
- Lifetime deal: Via redeemable codes generated by admin
- isUserActivated() checks user.planType; platform_admin always activated
- PaywallGate component gates customer pages; admin bypasses
- Server-side enforcement on create/submit routes

## User Preferences
- None recorded yet
