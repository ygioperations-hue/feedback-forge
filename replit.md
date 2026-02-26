# FeedbackForge

## Overview
FeedbackForge is a multi-tenant SaaS feedback collection and management tool with role-based access control (RBAC). Two roles: `customer` (default on signup) and `platform_admin`. Customers manage their own projects, feedback, billing, and roadmaps. Platform admins manage all users, generate LTD codes, and view global analytics. Features include customizable feedback forms (rating, text, multiple choice), public form sharing via unique links, embeddable feedback widgets, centralized dashboard, AI-powered insights (OpenAI GPT-4o Mini), public roadmaps with upvoting, product changelogs, Stripe payment integration for subscription plans, and lifetime deal code management.

## Authentication & RBAC
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup requires: firstName, lastName, email, password (defaults to role="customer")
- Session stores userId and userRole
- All customer data (projects, responses) scoped to userId
- Two roles: `customer` (default) and `platform_admin`
- `requireAuth` middleware: checks session.userId exists
- `requireAdmin` middleware: checks session.userRole === "platform_admin", returns 403 otherwise
- Platform admin bypasses paywall (isUserActivated returns true for admin role)
- Password reset via 6-digit security code shown on screen (no email service needed)
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Dashboard routes protected by `requireAuth` middleware + `RequireAuth` React component
- Admin routes protected by `requireAdmin` middleware + `RequireAdmin` React component
- Demo account: demo@feedbackforge.app / password123 (role: platform_admin)
- Test account: test@feedbackforge.app / test1234 (role: customer, no subscription)

## Recent Changes
- 2026-02-26: Added RBAC with customer/platform_admin roles
- 2026-02-26: Added `role` column to users table (default: "customer")
- 2026-02-26: Added `requireAdmin` middleware in server/auth.ts
- 2026-02-26: Session now stores userRole alongside userId
- 2026-02-26: Admin API routes: /api/admin/stats, /api/admin/users, /api/admin/users/:id/role, /api/admin/users/:id/plan, /api/admin/ltd, /api/admin/ltd/generate, /api/admin/ltd/:id (DELETE)
- 2026-02-26: Created admin frontend pages: AdminDashboard (/admin), AdminUsers (/admin/users), AdminLtd (/admin/ltd)
- 2026-02-26: Created AdminSidebar component with admin-specific navigation
- 2026-02-26: Created AdminLayout wrapper with RequireAdmin gate
- 2026-02-26: Moved LTD code generation from customer to admin only
- 2026-02-26: Customer sidebar no longer shows "LTD Codes" — shows "Admin Panel" link for admins
- 2026-02-26: isUserActivated() bypasses paywall for platform_admin role
- 2026-02-26: /api/auth/me, login, signup all return user.role in response
- 2026-02-25: Replaced stripe.* external tables with local plans + subscriptions tables
- 2026-02-25: Plans table stores pricing (Monthly $29/mo, Yearly $249/yr) with Stripe price IDs
- 2026-02-25: Subscriptions table tracks user subscriptions (status, period dates, cancelAtPeriodEnd)
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
- `shared/schema.ts` - Drizzle schema: users (with role column), plans, subscriptions, projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/auth.ts` - Session middleware (connect-pg-simple), requireAuth, requireAdmin middleware, password hash/verify, reset token generation
- `server/storage.ts` - DatabaseStorage class with all CRUD ops, userId-scoped queries, plan/subscription methods, admin methods (getAllUsers, getAllProjects, getAllResponses, getAllSubscriptions, updateUserRole, getAllLtdCodes, deleteLtdCode)
- `server/routes.ts` - REST API endpoints under /api (auth + protected + public + admin), isUserActivated() helper with admin bypass
- `server/stripeClient.ts` - Stripe client initialization (via Replit connector)
- `server/stripe-setup.ts` - Auto-creates Stripe product/prices on startup, links stripePriceId to plans table
- `server/webhookHandlers.ts` - Stripe webhook handlers
- `client/public/widget.js` - Hosted feedback widget script
- `server/seed.ts` - Seeds plans, demo user, projects
- `client/src/lib/auth.tsx` - AuthProvider context with user, role, isAdmin flag, useAuth hook, RequireAuth + RequireAdmin gate components
- `client/src/components/app-sidebar.tsx` - Customer sidebar (Dashboard, Projects, Responses, Billing + Admin Panel link for admins)
- `client/src/components/admin-sidebar.tsx` - Admin sidebar (Overview, Users, LTD Codes + Back to App link)
- `client/src/pages/admin-dashboard.tsx` - Admin dashboard with global stats cards
- `client/src/pages/admin-users.tsx` - Admin users table with plan management
- `client/src/pages/admin-ltd.tsx` - Admin LTD code management (generate, copy, delete)
- `client/src/App.tsx` - AppLayout (customer), AdminLayout (admin), all routes

## Key API Routes

### Auth (public)
- POST /api/auth/signup - Create user (role=customer), set session with userId+userRole
- POST /api/auth/login - Verify credentials, set session with userId+userRole (returns user with role)
- POST /api/auth/logout - Destroy session
- GET /api/auth/me - Return current user info including role
- POST /api/auth/forgot-password - Generate 6-digit reset code
- POST /api/auth/reset-password - Validate code + email, update password

### Protected (require auth, userId-scoped)
- PATCH /api/auth/profile - Update user first/last name
- PATCH /api/auth/password - Change password
- GET /api/projects - List user's projects
- GET /api/projects/:id - Get project with questions
- POST /api/projects - Create project (paywall-checked)
- PATCH /api/projects/:id/status - Toggle project status
- DELETE /api/projects/:id - Delete project
- GET /api/projects/:id/responses - Responses for a project
- GET /api/responses - All user responses
- GET /api/responses/:id - Single response
- POST /api/ai/summary - Generate AI summary (paywall-checked)
- POST /api/roadmap/:slug/items - Create roadmap item
- POST /api/changelog/:slug/items - Create changelog item
- POST /api/ltd/redeem - Redeem LTD code (customer only)
- GET /api/limits - Get user plan usage/limits
- POST /api/billing/checkout - Create Stripe checkout session
- GET /api/billing/status - Get subscription status
- GET /api/billing/history - Get payment history
- POST /api/billing/switch - Switch plans
- POST /api/billing/cancel - Cancel subscription
- POST /api/billing/reactivate - Reactivate subscription

### Admin (require platform_admin role)
- GET /api/admin/stats - Global metrics (users, subs, LTD, projects, responses, MRR)
- GET /api/admin/users - List all users with project count, plan status
- PATCH /api/admin/users/:id/role - Change user role
- PATCH /api/admin/users/:id/plan - Manually upgrade user plan (grant lifetime)
- GET /api/admin/ltd - List ALL LTD codes with usage stats
- POST /api/admin/ltd/generate - Generate LTD code
- DELETE /api/admin/ltd/:id - Delete unused LTD code

### Public (no auth required)
- GET /api/forms/:slug - Get form by slug
- POST /api/forms/:slug/submit - Submit feedback
- POST /api/widget/:slug/submit - Submit widget feedback
- GET /api/roadmap/:slug - Get roadmap items
- POST /api/roadmap/items/:id/upvote - Upvote roadmap item
- GET /api/changelog/:slug - Get changelog items
- GET /api/billing/config - Get Stripe publishable key
- GET /api/plans - Get available plans

## Database Schema
- **users**: id, email, password, firstName, lastName, role (customer|platform_admin), stripeCustomerId, resetToken, resetTokenExpiry, createdAt
- **plans**: id, name (Monthly/Yearly), price (cents), interval (month/year), stripePriceId, createdAt
- **subscriptions**: id, userId (FK→users), planId (FK→plans), stripeSubscriptionId, status (active/canceled/past_due), currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt
- **projects**: id, name, description, status, slug, plan, userId (FK→users), createdAt
- **questions**: id, projectId, label, type, required, options, order, source
- **responses**: id, projectId, respondentName, respondentEmail, submittedAt
- **answers**: id, responseId, questionId, value
- **roadmapItems**: id, projectId, title, description, status, upvotes, order, createdAt
- **changelogItems**: id, projectId, title, description, type, publishedAt
- **ltdCodes**: id, code, isRedeemed, redeemedAt, userId, createdAt

## Pricing & Paywall
- No free accounts: must be activated via paid plan or LTD code
- Platform admins bypass paywall entirely
- Monthly plan: $29/month (Stripe Hosted Checkout)
- Yearly plan: $249/year (Stripe Hosted Checkout)
- Lifetime deal: Via redeemable codes generated by platform admin in /admin/ltd
- isUserActivated() checks: admin role → LTD codes → project plans → active subscription
- PaywallGate component gates dashboard pages for non-activated customers
- Server-side enforcement on create/submit routes

## User Preferences
- None recorded yet
