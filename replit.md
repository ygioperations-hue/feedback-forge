# FeedbackForge

## Overview
FeedbackForge is a feedback collection and management tool. Users can create feedback projects with customizable questions (rating, text, multiple choice), share public forms via unique links, embed a feedback widget on any website, view/manage all responses from a dashboard, share a public roadmap with upvotable items, generate AI-powered insights using OpenAI, view product changelogs, manage pricing tiers, and administer lifetime deal codes.

## Recent Changes
- 2026-02-18: Added Pricing page with 3 tiers, trust badges, LTD code redemption
- 2026-02-18: Added LTD Admin page for generating/managing lifetime deal codes
- 2026-02-18: Added public Changelog page (/changelog/:slug) with timeline UI
- 2026-02-18: Added paywall enforcement (free plan limits: 1 project, 50 responses)
- 2026-02-18: Added plan field to projects, changelog_items and ltd_codes tables
- 2026-02-18: Added public Roadmap page (/roadmap/:slug) with upvotable cards, status grouping, SEO-friendly
- 2026-02-18: Added embeddable feedback widget with JS snippet generator
- 2026-02-18: Added AI Insights (GPT-4o Mini) summary on dashboard
- 2026-02-18: Initial MVP - schema, all pages, backend APIs, seed data

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter routing + TanStack Query
- Backend: Express.js with PostgreSQL (Drizzle ORM)
- Database: PostgreSQL (Neon-backed via Replit)
- AI: OpenAI GPT-4o Mini (via OPENAI_API_KEY secret)

## Project Architecture
- `shared/schema.ts` - Drizzle schema: projects, questions, responses, answers, roadmapItems, changelogItems, ltdCodes
- `server/storage.ts` - DatabaseStorage class with all CRUD ops + widget + roadmap + changelog + LTD management
- `server/routes.ts` - REST API endpoints under /api
- `server/seed.ts` - Seeds 3 projects with questions, sample responses, roadmap items, and changelog items
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, PublicChangelog, ResponsesList, Pricing, LtdAdmin
- `client/src/components/app-sidebar.tsx` - Sidebar navigation (Dashboard, Projects, Responses, LTD Codes, Pricing)
- `client/src/lib/theme-provider.tsx` - Dark/light mode toggle

## Key API Routes
- GET /api/projects - List all projects
- GET /api/projects/:id - Get project with questions
- POST /api/projects - Create project + questions
- DELETE /api/projects/:id - Delete project
- GET /api/projects/:id/responses - Responses for a project
- GET /api/responses - All responses
- GET /api/forms/:slug - Get form by slug (public)
- POST /api/forms/:slug/submit - Submit feedback (public)
- POST /api/widget/:slug/submit - Submit widget feedback (rating, category, message)
- POST /api/ai/summary - Generate AI summary of all feedback
- GET /api/roadmap/:slug - Get roadmap items for a project (public)
- POST /api/roadmap/:slug/items - Create a roadmap item
- POST /api/roadmap/items/:id/upvote - Upvote a roadmap item (public, atomic increment)
- GET /api/changelog/:slug - Get changelog items for a project (public)
- POST /api/changelog/:slug/items - Create a changelog item
- GET /api/ltd/codes - List all LTD codes
- POST /api/ltd/generate - Generate a new LTD code
- POST /api/ltd/redeem - Redeem an LTD code
- GET /api/limits - Get current plan usage/limits

## Pricing & Paywall
- Free plan: 1 project, 50 responses
- Monthly plan: $29/month, unlimited (UI only, no payment processing)
- Yearly plan: $249/year, unlimited (UI only, no payment processing)
- Lifetime deal: Via redeemable codes generated in LTD admin page
- Paywall enforced in frontend with redirect to /pricing when limits hit
- Dashboard shows plan usage banner for free plan users

## Changelog
- Public page at /changelog/:slug - no login required
- Timeline UI with type badges (Feature, Bug Fix, Improvement, Update)
- Project detail page has "Changelog" button linking to the public changelog

## Roadmap
- Public page at /roadmap/:slug - no login required, SEO-friendly
- Cards grouped by status (In Progress, Planned, Under Review, Completed)
- Upvotes use atomic SQL increment to prevent race conditions

## Widget
- Project detail page has "Install Widget" tab with copyable JS snippet
- Widget creates a floating button (bottom-right) that opens a feedback modal
- Supports dark mode via prefers-color-scheme

## User Preferences
- None recorded yet
