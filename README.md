# FeedbackForge

A SaaS feedback collection and management platform built with React, Express.js, and PostgreSQL. Collect customer feedback through customizable forms, embed widgets, manage public roadmaps, publish changelogs, and get AI-powered insights.

---

## Tech Stack

### Frontend
- **React** with **TypeScript**
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — component library
- **wouter** — client-side routing
- **TanStack Query v5** — data fetching and caching
- **react-hook-form + Zod** — form handling and validation
- **Lucide React** — icons

### Backend
- **Express.js** with **TypeScript**
- **Drizzle ORM** — type-safe database queries and schema management
- **express-session + connect-pg-simple** — session-based auth (stored in PostgreSQL)
- **bcryptjs** — password hashing
- **Helmet** — security headers

### Database
- **PostgreSQL** (compatible with [Neon](https://neon.tech), Supabase, or any PostgreSQL provider)

### External Services
- **Stripe** — payment processing (one-time payments and subscriptions)
- **OpenAI (GPT-4o Mini)** — AI-powered feedback analysis

---

## Project Structure

```
feedbackforge/
├── client/                    # Frontend (React + Vite)
│   ├── public/                # Static assets and embeddable widget.js
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Auth context, query client, utilities
│   │   └── pages/             # Page components (dashboard, landing, etc.)
│   └── index.html             # Entry HTML file
│
├── server/                    # Backend (Express.js)
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API route definitions
│   ├── auth.ts                # Authentication and session setup
│   ├── storage.ts             # Database operations (Drizzle)
│   ├── seed.ts                # Database seeding logic
│   ├── stripe-setup.ts        # Stripe product/price setup
│   ├── stripeClient.ts        # Stripe client initialization
│   ├── webhookHandlers.ts     # Stripe webhook handlers
│   └── vite.ts                # Vite dev server integration
│
├── shared/                    # Shared between frontend and backend
│   └── schema.ts              # Drizzle schema + Zod validation schemas
│
├── script/
│   └── build.ts               # Custom build script
│
├── drizzle.config.ts          # Drizzle Kit configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

---

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles (`customer`, `platform_admin`) and plan types |
| `plans` | Available pricing plans (monthly, yearly, lifetime) |
| `subscriptions` | Stripe subscription records |
| `projects` | Customer feedback projects |
| `questions` | Feedback form questions (rating, text, multiple choice) |
| `responses` | Submitted feedback responses |
| `answers` | Individual answers within a response |
| `roadmapItems` | Public roadmap entries with upvoting |
| `changelogItems` | Product changelog entries |
| `ltdCodes` | Lifetime deal redemption codes |

---

## Local Setup

### Prerequisites
- **Node.js** v18+ and **npm**
- A **PostgreSQL** database (Neon recommended for serverless)
- A **Stripe** account (for payments)
- An **OpenAI** API key (for AI insights)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/feedbackforge.git
cd feedbackforge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string from the dashboard — it looks like:
   ```
   postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Session
SESSION_SECRET=your-random-session-secret-here

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Server
PORT=5000
NODE_ENV=development
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret key for signing session cookies |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (use `sk_test_` for development) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (use `pk_test_` for development) |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Stripe webhook signing secret |
| `OPENAI_API_KEY` | For AI features | OpenAI API key for GPT-4o Mini insights |
| `PORT` | No | Server port (defaults to `5000`) |
| `NODE_ENV` | No | `development` or `production` |

> **Note on Replit:** When running on Replit, Stripe credentials are managed automatically through Replit's integration/connector system — no manual Stripe keys are needed. For local development outside Replit, you must provide the keys directly in your `.env` file.

> **Generating a session secret:** You can generate a random secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 5. Push the Database Schema

This syncs your Drizzle schema to the PostgreSQL database:

```bash
npm run db:push
```

This creates all the necessary tables. No manual SQL or migration files needed.

### 6. Stripe Setup for Local Development

For local webhook testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# Install the Stripe CLI, then:
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

The CLI will output a webhook signing secret (`whsec_...`) — add that as your `STRIPE_WEBHOOK_SECRET`.

### 7. Start the Server

```bash
npm run dev
```

This starts the Express backend and Vite frontend together on a single port. Open your browser at:

```
http://localhost:5000
```

The database is automatically seeded on first startup with:
- Default pricing plans (Monthly, Yearly, Lifetime)
- An admin account: `ygi.operations@gmail.com` / `admin123`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (Express + Vite HMR) |
| `npm run build` | Build for production (compiles frontend and backend) |
| `npm start` | Run the production build |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push Drizzle schema changes to the database |

### Starting the Server
```bash
npm run dev
```

### Stopping the Server
Press `Ctrl + C` in the terminal where the server is running.

### Rebuilding After Changes
The dev server has hot module replacement (HMR) enabled — frontend changes apply instantly without restart. Backend changes require a server restart (the dev server auto-restarts on file changes via `tsx`).

---

## Production Build

```bash
# Build the project
npm run build

# Start the production server
npm start
```

In production, the compiled frontend is served as static files from the Express server. Set `NODE_ENV=production` and ensure all environment variables are configured.

---

## Deployment on Replit

The project is pre-configured for Replit deployment:
- The `Start application` workflow runs `npm run dev`
- Stripe keys are managed via Replit's built-in Stripe integration
- The PostgreSQL database is provisioned automatically
- Environment secrets are managed through Replit's Secrets panel

To deploy, use Replit's built-in publish/deploy feature.

---

## Key Features

- **Customizable Feedback Forms** — Rating scales, text fields, multiple choice questions
- **Embeddable Widget** — Drop a script tag on any website to collect feedback
- **Public Form Links** — Share unique URLs for feedback collection
- **Centralized Dashboard** — View all responses with filtering and sorting
- **AI-Powered Insights** — GPT-4o Mini analyzes feedback patterns and sentiment
- **Public Roadmaps** — Share product plans with upvoting for prioritization
- **Product Changelogs** — Keep customers informed about updates
- **Role-Based Access** — Platform admin and customer roles with scoped permissions
- **Stripe Payments** — One-time lifetime deals and subscription billing

---

## User Roles

| Role | Access |
|------|--------|
| `platform_admin` | Full platform access, user management, admin dashboard. Bypasses paywall. |
| `customer` | Feedback collection, projects, responses, billing. Requires an active plan. |

---

## License

Proprietary. All rights reserved.
