# FeedbackForge

## Overview
FeedbackForge is a feedback collection and management tool. Users can create feedback projects with customizable questions (rating, text, multiple choice), share public forms via unique links, embed a feedback widget on any website, view/manage all responses from a dashboard, share a public roadmap with upvotable items, and generate AI-powered insights using OpenAI.

## Recent Changes
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
- `shared/schema.ts` - Drizzle schema: projects, questions, responses, answers, roadmapItems
- `server/storage.ts` - DatabaseStorage class with all CRUD ops + widget + roadmap management
- `server/routes.ts` - REST API endpoints under /api
- `server/seed.ts` - Seeds 3 projects with questions, sample responses, and roadmap items
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, PublicRoadmap, ResponsesList
- `client/src/components/app-sidebar.tsx` - Sidebar navigation
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

## Roadmap
- Public page at /roadmap/:slug - no login required, SEO-friendly
- Cards grouped by status (In Progress, Planned, Under Review, Completed)
- Each card shows title, description, upvote count with upvote button
- Upvotes use atomic SQL increment to prevent race conditions
- Project detail page has "Roadmap" button linking to the public roadmap

## Widget
- Project detail page has "Install Widget" tab with copyable JS snippet
- Widget creates a floating button (bottom-right) that opens a feedback modal
- Modal includes: star rating, category dropdown (Bug/Feature/Idea/Other), message, optional name
- Auto-creates Widget Rating, Widget Category, Widget Message questions per project
- Supports dark mode via prefers-color-scheme

## User Preferences
- None recorded yet
