# FeedbackForge

## Overview
FeedbackForge is a feedback collection and management tool. Users can create feedback projects with customizable questions (rating, text, multiple choice), share public forms via unique links, and view/manage all responses from a dashboard.

## Recent Changes
- 2026-02-18: Initial MVP - schema, all pages, backend APIs, seed data

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter routing + TanStack Query
- Backend: Express.js with PostgreSQL (Drizzle ORM)
- Database: PostgreSQL (Neon-backed via Replit)

## Project Architecture
- `shared/schema.ts` - Drizzle schema: projects, questions, responses, answers
- `server/storage.ts` - DatabaseStorage class with all CRUD ops
- `server/routes.ts` - REST API endpoints under /api
- `server/seed.ts` - Seeds 3 projects with questions and sample responses
- `client/src/pages/` - Dashboard, Projects, ProjectNew, ProjectDetail, PublicForm, ResponsesList
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

## User Preferences
- None recorded yet
