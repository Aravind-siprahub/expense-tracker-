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

export const expenses = Router();
expenses.use('/expenses', requireFamily);

type ExpenseInput = {
  amountPaise: number;
  categoryId: string;
  date: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  note?: string;
};

const shape = (e: {
  id: string;
  amountPaise: number;
  date: Date;
  paymentMethod: string;
  note: string | null;
  userId: string;
  categoryId: string;
  category: { name: string };
  user: { name: string };
}) => ({
  id: e.id,
  amountPaise: e.amountPaise,
  date: e.date.toISOString().slice(0, 10),
  paymentMethod: e.paymentMethod,
  note: e.note,
  categoryId: e.categoryId,
  category: e.category.name,
  userId: e.userId,
  by: e.user.name,
});

const include = { category: { select: { name: true } }, user: { select: { name: true } } };

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
    res.json({ totalPaise: sum._sum.amountPaise ?? 0, items: rows.map(shape) });
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
    res.json(shape(row));
  }),
);

expenses.post(
  '/expenses',
  wrap(async (req, res) => {
    const b = parse<ExpenseInput>(CreateExpenseSchema, req.body);
    await assertCategory(req.ctx.familyId!, b.categoryId);
    const row = await prisma.expense.create({
      data: {
        familyId: req.ctx.familyId!,
        userId: req.ctx.userId,
        categoryId: b.categoryId,
        amountPaise: b.amountPaise,
        date: toDate(b.date),
        paymentMethod: b.paymentMethod,
        note: b.note || null,
      },
      include,
    });
    const alert = await budgetAlert(req.ctx.familyId!, b.categoryId, row.date);
    res.status(201).json({ ...shape(row), alert });
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
    const row = await prisma.expense.update({
      where: { id: existing.id },
      data: {
        ...(b.amountPaise !== undefined && { amountPaise: b.amountPaise }),
        ...(b.categoryId && { categoryId: b.categoryId }),
        ...(b.date && { date: toDate(b.date) }),
        ...(b.paymentMethod && { paymentMethod: b.paymentMethod }),
        ...(b.note !== undefined && { note: b.note || null }),
      },
      include,
    });
    const alert = await budgetAlert(req.ctx.familyId!, row.categoryId, row.date);
    res.json({ ...shape(row), alert });
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
