import { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import type { User } from "@shared/schema";

const PgSession = connectPgSimple(session);

const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

type UserLookup = (id: string) => Promise<User | undefined>;
let _getUserById: UserLookup | null = null;

export function setUserLookup(fn: UserLookup) {
  _getUserById = fn;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

export const sessionMiddleware = session({
  store: new PgSession({
    pool: sessionPool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: sessionSecret || "feedbackforge-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!_getUserById) {
    return res.status(500).json({ message: "Server not ready" });
  }

  try {
    const user = await _getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(500).json({ message: "Authentication error" });
  }
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "platform_admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export function requireActivePlan(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user.role === "platform_admin") {
    return next();
  }
  if (req.user.planType === "none") {
    return res.status(403).json({ message: "Active plan required" });
  }
  next();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

