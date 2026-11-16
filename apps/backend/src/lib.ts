import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@repo/db';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
    /** Machine-readable reason, e.g. SESSION_EXPIRED, so clients can react correctly. */
    public code?: string,
  ) {
    super(message);
  }
}

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Express 4 does not catch async errors; forward them to the error handler. */
export const wrap =
  (fn: Handler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

type SafeParse = {
  safeParse: (x: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: { path: (string | number)[]; message: string }[] };
  };
};

/** Validate input with a shared Zod schema; throws a 400 with readable messages. */
export function parse<T>(schema: SafeParse, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issues = r.error?.issues ?? [];
    throw new HttpError(
      400,
      issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') ||
        'Invalid input',
    );
  }
  return r.data as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'change-me') {
  throw new Error('JWT_SECRET is not set. Add a long random value to .env');
}

export const signToken = (userId: string) =>
  jwt.sign({}, JWT_SECRET, { subject: userId, expiresIn: '30d' });

export interface Ctx {
  userId: string;
  familyId?: string;
  role?: 'ADMIN' | 'MEMBER';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: Ctx;
    }
  }
}

const DAY = 24 * 60 * 60;

export const requireAuth = wrap(async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = typeof payload === 'object' ? payload.sub : undefined;
    if (!userId) throw new Error('no subject');
    req.ctx = { userId };
    // Sliding session: an active user gets a fresh 30-day token about once a day,
    // so they are only logged out after 30 days of not using the app.
    const iat = typeof payload === 'object' ? payload.iat : undefined;
    if (iat && Date.now() / 1000 - iat > DAY) res.setHeader('x-refresh-token', signToken(userId));
  } catch (e) {
    const expired = e instanceof jwt.TokenExpiredError;
    console.warn(`[auth] 401 ${req.method} ${req.path}: ${expired ? 'token expired' : 'token missing or invalid'}`);
    throw new HttpError(
      401,
      expired ? 'Your session expired. Please log in again.' : 'Please log in again',
      undefined,
      'SESSION_EXPIRED',
    );
  }
  next();
});

/** Auth + the caller must belong to an active family. Every family route uses this. */
export const requireFamily = wrap(async (req, res, next) => {
  await new Promise<void>((resolve, reject) =>
    requireAuth(req, res, (err?: unknown) => (err ? reject(err) : resolve())),
  );
  const m = await prisma.familyMember.findFirst({
    where: { userId: req.ctx.userId, active: true },
  });
  if (!m) throw new HttpError(403, 'Create or join a family first');
  req.ctx.familyId = m.familyId;
  req.ctx.role = m.role;
  next();
});

export const requireAdmin = wrap(async (req, _res, next) => {
  if (req.ctx.role !== 'ADMIN') throw new HttpError(403, 'Only the family admin can do this');
  next();
});

// ── Helpers ─────────────────────────────────────────────────────────────────

export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

/** "2026-11" → [2026-11-01, 2026-12-01) */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
}

export function previousMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);

/** A category is usable if it is a ready-made one or belongs to this family. */
export async function assertCategory(familyId: string, categoryId: string) {
  const c = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ familyId: null }, { familyId }] },
  });
  if (!c) throw new HttpError(400, 'Unknown category');
  return c;
}

/** Over-budget info for one category in the month of `date`, or null. */
export async function budgetAlert(familyId: string, categoryId: string, date: Date) {
  const month = date.toISOString().slice(0, 7);
  const budget = await prisma.budget.findFirst({ where: { familyId, month, categoryId } });
  if (!budget) return null;
  const spent = await prisma.expense.aggregate({
    where: { familyId, categoryId, date: monthRange(month) },
    _sum: { amountPaise: true },
  });
  const used = spent._sum.amountPaise ?? 0;
  if (used <= budget.amountPaise) return null;
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  return { category: cat?.name ?? '', overByPaise: used - budget.amountPaise };
}
