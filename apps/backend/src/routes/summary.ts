import { Router } from 'express';
import prisma from '@repo/db';
import { MonthQuerySchema } from '@repo/validators';
import { currentMonth, monthRange, parse, previousMonth, requireFamily, wrap } from '../lib';

export const summary = Router();
summary.use('/summary', requireFamily);

async function totals(familyId: string, month: string) {
  const [inc, exp] = await Promise.all([
    prisma.income.aggregate({ where: { familyId, month }, _sum: { amountPaise: true } }),
    prisma.expense.aggregate({
      where: { familyId, date: monthRange(month) },
      _sum: { amountPaise: true },
    }),
  ]);
  return { incomePaise: inc._sum.amountPaise ?? 0, expensesPaise: exp._sum.amountPaise ?? 0 };
}

// One call feeds both the Dashboard and the Reports screen.
summary.get(
  '/summary',
  wrap(async (req, res) => {
    const { month } = parse<{ month: string }>(MonthQuerySchema, {
      month: typeof req.query.month === 'string' ? req.query.month : currentMonth(),
    });
    const familyId = req.ctx.familyId!;
    const range = monthRange(month);
    const prev = previousMonth(month);

    const [now, before, byCat, byUser, recent, budgets, cats, users] = await Promise.all([
      totals(familyId, month),
      totals(familyId, prev),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { familyId, date: range },
        _sum: { amountPaise: true },
      }),
      prisma.expense.groupBy({
        by: ['userId'],
        where: { familyId, date: range },
        _sum: { amountPaise: true },
      }),
      prisma.expense.findMany({
        where: { familyId, date: range },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        include: { category: { select: { name: true } }, user: { select: { name: true } } },
      }),
      prisma.budget.findMany({ where: { familyId, month } }),
      prisma.category.findMany({ where: { OR: [{ familyId: null }, { familyId }] } }),
      prisma.user.findMany({
        where: { memberships: { some: { familyId } } },
        select: { id: true, name: true },
      }),
    ]);

    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const userName = new Map(users.map((u) => [u.id, u.name]));
    const budgetBy = new Map(budgets.filter((b) => b.categoryId).map((b) => [b.categoryId!, b.amountPaise]));

    const byCategory = byCat
      .map((c) => ({
        categoryId: c.categoryId,
        name: catName.get(c.categoryId) ?? 'Unknown',
        spentPaise: c._sum.amountPaise ?? 0,
        budgetPaise: budgetBy.get(c.categoryId) ?? 0,
      }))
      .sort((a, b) => b.spentPaise - a.spentPaise);

    res.json({
      month,
      incomePaise: now.incomePaise,
      expensesPaise: now.expensesPaise,
      remainingPaise: now.incomePaise - now.expensesPaise,
      totalBudgetPaise: budgets.find((b) => b.categoryId === null)?.amountPaise ?? null,
      byCategory,
      byMember: byUser
        .map((u) => ({
          userId: u.userId,
          name: userName.get(u.userId) ?? 'Unknown',
          spentPaise: u._sum.amountPaise ?? 0,
        }))
        .sort((a, b) => b.spentPaise - a.spentPaise),
      recent: recent.map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        categoryId: e.categoryId,
        category: e.category.name,
        by: e.user.name,
        paymentMethod: e.paymentMethod,
        note: e.note,
        amountPaise: e.amountPaise,
      })),
      overBudget: byCategory
        .filter((c) => c.budgetPaise > 0 && c.spentPaise > c.budgetPaise)
        .map((c) => ({ name: c.name, overByPaise: c.spentPaise - c.budgetPaise })),
      previousMonth: {
        month: prev,
        incomePaise: before.incomePaise,
        expensesPaise: before.expensesPaise,
        changePaise: now.expensesPaise - before.expensesPaise,
        changePercent:
          before.expensesPaise > 0
            ? Math.round(((now.expensesPaise - before.expensesPaise) / before.expensesPaise) * 1000) / 10
            : null,
      },
    });
  }),
);
