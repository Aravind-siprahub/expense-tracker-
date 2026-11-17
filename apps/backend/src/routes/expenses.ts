import { Router } from 'express';
import prisma from '@repo/db';
import type { Prisma } from '@repo/db';
import {
  CreateExpenseSchema,
  ExpenseQuerySchema,
  UpdateExpenseSchema,
} from '@repo/validators';
import {
  HttpError,
  assertCategory,
  budgetAlert,
  monthRange,
  parse,
  requireFamily,
  toDate,
  wrap,
} from '../lib';
import { methodLabel } from './paymentMethods';

export const expenses = Router();
expenses.use('/expenses', requireFamily);

type Method = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';

type ExpenseInput = {
  amountPaise: number;
  categoryId: string;
  date: string;
  paymentMethod: Method;
  paymentMethodId?: string | null;
  note?: string;
};

type Row = {
  id: string;
  amountPaise: number;
  date: Date;
  paymentMethod: string;
  paymentMethodId: string | null;
  note: string | null;
  userId: string;
  categoryId: string;
  category: { name: string };
  user: { name: string };
  savedMethod: { type: 'CARD' | 'BANK' | 'UPI'; nickname: string | null; lastFour: string | null; deletedAt: Date | null } | null;
};

/**
 * `viewerId` is the person looking at the data. The saved card / account label (for example
 * "HDFC Credit Card ••1234") is private to whoever made the expense, so everyone else
 * (including the family admin) sees only the plain payment method.
 */
const shape = (e: Row, viewerId: string) => ({
  id: e.id,
  amountPaise: e.amountPaise,
  date: e.date.toISOString().slice(0, 10),
  paymentMethod: e.paymentMethod,
  paymentMethodId: e.userId === viewerId ? e.paymentMethodId : null,
  paymentMethodLabel: e.userId === viewerId && e.savedMethod ? methodLabel(e.savedMethod) : null,
  paymentMethodRemoved: e.userId === viewerId && !!e.savedMethod?.deletedAt,
  note: e.note,
  categoryId: e.categoryId,
  category: e.category.name,
  userId: e.userId,
  by: e.user.name,
});

const include = {
  category: { select: { name: true } },
  user: { select: { name: true } },
  savedMethod: { select: { type: true, nickname: true, lastFour: true, deletedAt: true } },
};

/**
 * A saved method can only be attached to a card / bank-transfer expense, must be of the matching
 * kind, and must belong to the person who made the expense (not whoever is editing it).
 * Returns the id to store, or null.
 */
async function checkSavedMethod(ownerId: string, method: Method, id: string | null | undefined) {
  if (!id) return null;
  if (method !== 'CARD' && method !== 'BANK_TRANSFER') {
    throw new HttpError(400, 'Only card and bank transfer expenses can use a saved payment method');
  }
  const saved = await prisma.savedPaymentMethod.findFirst({ where: { id, userId: ownerId, deletedAt: null } });
  // Same answer whether it does not exist, is deleted or belongs to someone else.
  if (!saved) throw new HttpError(400, 'That saved payment method is not available');
  if (saved.type !== (method === 'CARD' ? 'CARD' : 'BANK')) {
    throw new HttpError(400, `That saved method is not a ${method === 'CARD' ? 'card' : 'bank account'}`);
  }
  return saved.id;
}

expenses.get(
  '/expenses',
  wrap(async (req, res) => {
    const q = parse<{
      month?: string;
      from?: string;
      to?: string;
      categoryId?: string;
      userId?: string;
    }>(ExpenseQuerySchema, req.query);
    const where: Prisma.ExpenseWhereInput = { familyId: req.ctx.familyId };
    if (q.month) where.date = monthRange(q.month);
    else if (q.from || q.to) {
      where.date = {
        ...(q.from ? { gte: toDate(q.from) } : {}),
        ...(q.to ? { lte: toDate(q.to) } : {}),
      };
    }
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.userId) where.userId = q.userId;

    const [rows, sum] = await Promise.all([
      prisma.expense.findMany({
        where,
        include,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      prisma.expense.aggregate({ where, _sum: { amountPaise: true } }),
    ]);
    res.json({ totalPaise: sum._sum.amountPaise ?? 0, items: rows.map((r) => shape(r, req.ctx.userId)) });
  }),
);

expenses.get(
  '/expenses/:id',
  wrap(async (req, res) => {
    const row = await prisma.expense.findFirst({
      where: { id: req.params.id, familyId: req.ctx.familyId },
      include,
    });
    if (!row) throw new HttpError(404, 'Expense not found');
    res.json(shape(row, req.ctx.userId));
  }),
);

expenses.post(
  '/expenses',
  wrap(async (req, res) => {
    const b = parse<ExpenseInput>(CreateExpenseSchema, req.body);
    await assertCategory(req.ctx.familyId!, b.categoryId);
    const paymentMethodId = await checkSavedMethod(req.ctx.userId, b.paymentMethod, b.paymentMethodId);
    const row = await prisma.expense.create({
      data: {
        familyId: req.ctx.familyId!,
        userId: req.ctx.userId,
        categoryId: b.categoryId,
        amountPaise: b.amountPaise,
        date: toDate(b.date),
        paymentMethod: b.paymentMethod,
        paymentMethodId,
        note: b.note || null,
      },
      include,
    });
    const alert = await budgetAlert(req.ctx.familyId!, b.categoryId, row.date);
    res.status(201).json({ ...shape(row, req.ctx.userId), alert });
  }),
);

async function loadOwned(req: Express.Request, id: string) {
  const e = await prisma.expense.findFirst({ where: { id, familyId: req.ctx.familyId } });
  if (!e) throw new HttpError(404, 'Expense not found');
  // Members edit their own entries; the admin can edit any.
  if (e.userId !== req.ctx.userId && req.ctx.role !== 'ADMIN') {
    throw new HttpError(403, 'You can only change your own expenses');
  }
  return e;
}

expenses.patch(
  '/expenses/:id',
  wrap(async (req, res) => {
    const existing = await loadOwned(req, req.params.id);
    const b = parse<Partial<ExpenseInput>>(UpdateExpenseSchema, req.body);
    if (b.categoryId) await assertCategory(req.ctx.familyId!, b.categoryId);

    // Work out the payment method and saved method the expense ends up with.
    const method = (b.paymentMethod ?? existing.paymentMethod) as Method;
    let savedId: string | null = existing.paymentMethodId;
    if (b.paymentMethodId !== undefined) savedId = b.paymentMethodId;
    else if (b.paymentMethod && b.paymentMethod !== existing.paymentMethod) savedId = null; // kind changed
    if (savedId !== existing.paymentMethodId) {
      // Validated against the expense's owner, so an admin editing a member's expense cannot
      // attach (or see) the member's cards, and cannot attach their own either.
      savedId = await checkSavedMethod(existing.userId, method, savedId);
    }

    const row = await prisma.expense.update({
      where: { id: existing.id },
      data: {
        ...(b.amountPaise !== undefined && { amountPaise: b.amountPaise }),
        ...(b.categoryId && { categoryId: b.categoryId }),
        ...(b.date && { date: toDate(b.date) }),
        ...(b.paymentMethod && { paymentMethod: b.paymentMethod }),
        paymentMethodId: savedId,
        ...(b.note !== undefined && { note: b.note || null }),
      },
      include,
    });
    const alert = await budgetAlert(req.ctx.familyId!, row.categoryId, row.date);
    res.json({ ...shape(row, req.ctx.userId), alert });
  }),
);

expenses.delete(
  '/expenses/:id',
  wrap(async (req, res) => {
    const existing = await loadOwned(req, req.params.id);
    await prisma.expense.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);
