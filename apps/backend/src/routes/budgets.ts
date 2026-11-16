import { Router } from 'express';
import prisma from '@repo/db';
import { MonthQuerySchema, SaveBudgetSchema } from '@repo/validators';
import {
  assertCategory,
  currentMonth,
  monthRange,
  parse,
  requireAdmin,
  requireFamily,
  wrap,
} from '../lib';

export const budgets = Router();
budgets.use('/budgets', requireFamily);

async function budgetView(familyId: string, month: string) {
  const [rows, spend, cats] = await Promise.all([
    prisma.budget.findMany({ where: { familyId, month } }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: { familyId, date: monthRange(month) },
      _sum: { amountPaise: true },
    }),
    prisma.category.findMany({ where: { OR: [{ familyId: null }, { familyId }] } }),
  ]);
  const budgetBy = new Map(rows.filter((r) => r.categoryId).map((r) => [r.categoryId!, r.amountPaise]));
  const spentBy = new Map(spend.map((s) => [s.categoryId, s._sum.amountPaise ?? 0]));
  const total = rows.find((r) => r.categoryId === null);

  return {
    month,
    totalPaise: total?.amountPaise ?? null,
    categories: cats
      .map((c) => {
        const budgetPaise = budgetBy.get(c.id) ?? 0;
        const spentPaise = spentBy.get(c.id) ?? 0;
        return {
          categoryId: c.id,
          name: c.name,
          budgetPaise,
          spentPaise,
          remainingPaise: budgetPaise - spentPaise,
          over: budgetPaise > 0 && spentPaise > budgetPaise,
        };
      })
      .filter((c) => c.budgetPaise > 0 || c.spentPaise > 0)
      .sort((a, b) => b.budgetPaise - a.budgetPaise),
  };
}

budgets.get(
  '/budgets',
  wrap(async (req, res) => {
    const { month } = parse<{ month: string }>(MonthQuerySchema, {
      month: typeof req.query.month === 'string' ? req.query.month : currentMonth(),
    });
    res.json(await budgetView(req.ctx.familyId!, month));
  }),
);

// Admin sets the total and per-category budgets for a month. An amount of 0 clears that budget.
budgets.put(
  '/budgets',
  requireAdmin,
  wrap(async (req, res) => {
    const b = parse<{
      month: string;
      totalPaise?: number;
      categories: { categoryId: string; amountPaise: number }[];
    }>(SaveBudgetSchema, req.body);
    const familyId = req.ctx.familyId!;
    for (const c of b.categories) await assertCategory(familyId, c.categoryId);

    await prisma.$transaction(async (tx) => {
      if (b.totalPaise !== undefined) {
        await tx.budget.deleteMany({ where: { familyId, month: b.month, categoryId: null } });
        if (b.totalPaise > 0) {
          await tx.budget.create({
            data: { familyId, month: b.month, categoryId: null, amountPaise: b.totalPaise },
          });
        }
      }
      for (const c of b.categories) {
        await tx.budget.deleteMany({
          where: { familyId, month: b.month, categoryId: c.categoryId },
        });
        if (c.amountPaise > 0) {
          await tx.budget.create({
            data: { familyId, month: b.month, categoryId: c.categoryId, amountPaise: c.amountPaise },
          });
        }
      }
    });
    res.json(await budgetView(familyId, b.month));
  }),
);
