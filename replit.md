# FeedbackForge

## Overview
FeedbackForge is a SaaS feedback collection and management platform with admin/customer role separation. Customers sign up and purchase a $59 Lifetime Deal via Stripe one-time payment for unlimited access to feedback forms (rating, text, multiple choice), public form sharing, embeddable widgets, centralized dashboard, AI-powered insights (GPT-4o Mini), public roadmaps with upvoting, and product changelogs. Platform admins manage users, LTD codes, and platform stats.

## Phase 1 Launch State
- Only the $59 Lifetime Deal (via Stripe one-time payment) is active
- Monthly ($29/mo) and Yearly ($249/yr) subscription plans exist in backend but are hidden from all UI
- LTD code redemption backend routes remain functional but UI is hidden (for future use)
- Admin LTD code generation UI is hidden (stats + existing codes table still visible)
- Support email: support@feedbackforge.co

## Roles
- **platform_admin**: Full platform access, user management, LTD code management, admin dashboard. Bypasses paywall. Cannot subscribe via Stripe.
- **customer**: Feedback collection, projects, responses, billing. Requires active plan (currently only lifetime_pro via $59 Stripe payment) to use features.

## Authentication
- Session-based auth using express-session + connect-pg-simple (PostgreSQL session store)
- Signup requires: firstName, lastName, email, password (creates customer role, planType=none)
- Session stores userId; `requireAuth` middleware loads full user onto `req.user`
- Public pages (forms, roadmaps, changelogs, widget submissions, upvotes) remain unauthenticated
- Admin account: ygi.operations@gmail.com / admin123 (platform_admin, lifetime_pro) — created via seed.ts upsert
- Demo account: demo@feedbackforge.app / password123 (platform_admin, lifetime_pro)
- Test account: test@feedbackforge.app / test1234 (customer, monthly)

## Recent Changes
- 2026-03-05: Phase 1 launch: Hidden subscription plans (Monthly/Yearly) from all frontend pages — only $59 LTD visible
- 2026-03-05: Simplified billing page — shows lifetime status or CTA to get LTD, no subscription management UI
- 2026-03-05: Updated paywall gate text to reference $59 lifetime deal
- 2026-03-05: Single $59 Stripe one-time payment for lifetime access (unlimited projects, planType=lifetime_pro)
- 2026-03-05: Replaced two-tier LTD cards (Starter $69 / Pro $129) with single $59 Lifetime card + Stripe checkout
- 2026-03-05: Added Lifetime plan to plans table (price: 5900, interval: "lifetime") with auto Stripe one-time price creation
- 2026-03-05: Updated checkout route to accept plan="lifetime" with mode="payment"
- 2026-03-05: Updated webhook/verify-checkout to handle one-time payments → planType=lifetime_pro + auto-cancel existing subscriptions
- 2026-03-05: Hidden LTD code redemption UI from landing/pricing pages (backend routes remain)
- 2026-03-05: Hidden admin LTD code generation UI (stats + table still visible, backend routes intact)
- 2026-03-05: Updated support email to support@feedbackforge.co
- 2026-03-03: SEO: title, meta description, OG tags, Twitter Card, canonical URL, robots, JSON-LD structured data
- 2026-03-03: Dynamic browser tab titles for all 19 pages via usePageTitle hook
- 2026-03-03: Fully clickable project cards
- 2026-03-02: Enforced Starter Lifetime 3-project limit (server + client)
- 2026-03-02: Removed plain "lifetime" planType — only lifetime_starter and lifetime_pro
- 2026-03-02: Admin users page read-only for plan display

## Pricing & Paywall (Phase 1 — LTD Only)
- No free accounts: must be activated via paid plan or LTD code
- Lifetime Deal: $59 one-time (Stripe Hosted Checkout, mode=payment) → planType=lifetime_pro, unlimited projects
- Monthly/Yearly: Backend routes exist but UI hidden for Phase 1
- LTD code redemption: Backend functional, UI hidden (Starter FS- → lifetime_starter, Pro FP- → lifetime_pro)
- isUserActivated() checks user.planType; platform_admin always activated
- PaywallGate component gates customer pages; admin bypasses
- If user with active subscription buys lifetime, subscription auto-canceled

## Database Schema (Drizzle ORM)
- **users**: id, email, password, firstName, lastName, role (customer/platform_admin), planType, stripeCustomerId, resetToken, resetTokenExpiry, createdAt
- **plans**: id, name, price, interval (month/year/lifetime), stripePriceId, createdAt
- **subscriptions**: id, userId, planId, stripeSubscriptionId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt
- **projects**: id, userId, name, description, createdAt
- **questions**: id, projectId, type (rating/text/multiple_choice), label, options, order, createdAt
- **responses**: id, projectId, submittedAt
- **answers**: id, responseId, questionId, value, createdAt
- **roadmapItems**: id, projectId, title, description, status, upvotes, order, createdAt
- **changelogItems**: id, projectId, title, description, type, publishedAt
- **ltdCodes**: id, code, tier (starter/pro), isRedeemed, redeemedAt, userId, createdAt

## Security
- All customer data queries filter by userId
- Admin routes protected by requirePlatformAdmin middleware + rate limiting
- Stripe webhooks verified with STRIPE_WEBHOOK_SECRET
- Session secret enforced via SESSION_SECRET env var
- Helmet headers enabled
- Lifetime planTypes never overridden by subscription webhooks

## External Dependencies
- **PostgreSQL:** Primary database
- **Stripe:** One-time payments (LTD) and subscriptions (hidden for Phase 1), webhooks
- **OpenAI:** GPT-4o Mini for AI-powered feedback insights
- **bcryptjs:** Password hashing
- **express-session & connect-pg-simple:** Session management
- **Vite:** Frontend build tool
- **Tailwind CSS & shadcn/ui:** Styling and UI components
- **TanStack Query:** Data fetching and state management
- **wouter:** Client-side routing
- **Drizzle ORM:** Database ORM

## User Preferences
- None recorded yet
