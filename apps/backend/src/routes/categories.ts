import { Router } from 'express';
import prisma from '@repo/db';
import { CreateCategorySchema } from '@repo/validators';
import { HttpError, parse, requireAdmin, requireFamily, wrap } from '../lib';

export const categories = Router();
categories.use('/categories', requireFamily);

categories.get(
  '/categories',
  wrap(async (req, res) => {
    const rows = await prisma.category.findMany({
      where: { OR: [{ familyId: null }, { familyId: req.ctx.familyId }] },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    res.json(rows.map((c) => ({ id: c.id, name: c.name, isDefault: c.isDefault })));
  }),
);

// Any member can add a custom category; it is shared with the whole family.
categories.post(
  '/categories',
  wrap(async (req, res) => {
    const { name } = parse<{ name: string }>(CreateCategorySchema, req.body);
    const clash = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        OR: [{ familyId: null }, { familyId: req.ctx.familyId }],
      },
    });
    if (clash) throw new HttpError(409, 'A category with that name already exists');
    const c = await prisma.category.create({ data: { name, familyId: req.ctx.familyId } });
    res.status(201).json({ id: c.id, name: c.name, isDefault: false });
  }),
);

// Only the admin may delete a custom category, and never one that has expenses.
categories.delete(
  '/categories/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const c = await prisma.category.findFirst({
      where: { id: req.params.id, familyId: req.ctx.familyId },
    });
    if (!c) throw new HttpError(404, 'Custom category not found');
    const used = await prisma.expense.count({ where: { categoryId: c.id } });
    if (used > 0) throw new HttpError(409, 'This category has expenses and cannot be deleted');
    await prisma.$transaction([
      prisma.budget.deleteMany({ where: { categoryId: c.id } }),
      prisma.category.delete({ where: { id: c.id } }),
    ]);
    res.status(204).end();
  }),
);
