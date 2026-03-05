# FeedbackForge

## Overview
FeedbackForge is a SaaS platform designed for comprehensive feedback collection and management, targeting businesses that need to gather insights from their customers. It supports two main user roles: `platform_admin` and `customer`. Customers can sign up and subscribe to various plans to create customizable feedback forms (rating, text, multiple choice), share them via unique links, or embed widgets. The platform offers a centralized dashboard, AI-powered insights using OpenAI's GPT-4o Mini, public roadmaps with upvoting functionality, and product changelogs. Platform administrators have full control over user management, lifetime deal (LTD) codes, and platform statistics. The project aims to provide a robust, all-in-one solution for understanding and acting on customer feedback, enhancing product development and customer satisfaction.

## User Preferences
- None recorded yet

## System Architecture
The application uses a modern web stack consisting of React, Vite, Tailwind CSS, shadcn/ui, wouter for routing, and TanStack Query on the frontend. The backend is built with Express.js, using PostgreSQL as the database with Drizzle ORM. Authentication is session-based, utilizing `express-session` and `connect-pg-simple`. User roles (`customer`, `platform_admin`) and plan types (`none`, `monthly`, `yearly`, `lifetime_starter`, `lifetime_pro`) are central to access control, managed through middleware like `requireAuth`, `requirePlatformAdmin`, and `requireActivePlan`.

Key architectural patterns include:
- **Role-based Access Control (RBAC):** Distinct roles with specific permissions are enforced at both frontend and backend levels.
- **Modular Backend:** Routes are organized into `auth`, `customer`, `admin`, and `public` categories, with corresponding middleware for access validation.
- **Database Schema:** A detailed Drizzle schema defines users, plans, subscriptions, projects, feedback components (questions, responses, answers), roadmap items, changelog items, and LTD codes.
- **Paywall Implementation:** A `PaywallGate` component on the frontend and server-side checks on API routes enforce plan-based feature access. `platform_admin` users bypass the paywall.
- **Stripe Integration:** Payment processing, including subscriptions and one-time payments, is handled via Stripe. The system stores local plan and subscription data, syncing with Stripe webhooks.
- **AI Integration:** OpenAI GPT-4o Mini is integrated for AI-powered insights, accessible to users with active plans.
- **Security:** Measures include session-based authentication, password hashing with bcryptjs, userId-scoped queries to prevent data leakage, and admin route rate limiting.

UI/UX decisions prioritize a clean, modern interface using Tailwind CSS and shadcn/ui components. Frontend routing (`wouter`) ensures a smooth single-page application experience.

## External Dependencies
- **PostgreSQL:** Primary database, hosted via Neon.
- **Stripe:** For payment processing (subscriptions, one-time payments), billing portal management, and webhooks.
- **OpenAI:** Specifically GPT-4o Mini, for AI-powered feedback analysis and insights.
- **bcryptjs:** For password hashing.
- **express-session & connect-pg-simple:** For session management and PostgreSQL session store.
- **Vite:** Frontend build tool.
- **Tailwind CSS & shadcn/ui:** For styling and UI components.
- **TanStack Query:** For data fetching and state management on the frontend.
- **wouter:** For client-side routing.
- **Drizzle ORM:** For interacting with the PostgreSQL database.