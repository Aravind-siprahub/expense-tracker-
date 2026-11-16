import { Router } from 'express';
import prisma from '@repo/db';
import { CreateIncomeSchema, UpdateIncomeSchema } from '@repo/validators';
import { HttpError, currentMonth, parse, requireFamily, wrap } from '../lib';

export const income = Router();
income.use('/income', requireFamily);

type IncomeInput = {
  userId?: string;
  type: 'SALARY' | 'OTHER';
  amountPaise: number;
  month: string;
  note?: string;
};

const include = { user: { select: { name: true } } };
const shape = (i: {
  id: string;
  type: string;
  amountPaise: number;
  month: string;
  note: string | null;
  userId: string;
  createdById: string | null;
  user: { name: string };
}) => ({
  id: i.id,
  type: i.type,
  amountPaise: i.amountPaise,
  month: i.month,
  note: i.note,
  userId: i.userId, // who earned it
  createdById: i.createdById, // who recorded it
  member: i.user.name,
});

/** The earner must be an active member of this family. */
async function assertMember(familyId: string, userId: string) {
  const m = await prisma.familyMember.findFirst({ where: { familyId, userId, active: true } });
  if (!m) throw new HttpError(400, 'That person is not in your family');
}

income.get(
  '/income',
  wrap(async (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : currentMonth();
    const rows = await prisma.income.findMany({
      where: { familyId: req.ctx.familyId, month },
      include,
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      month,
      totalPaise: rows.reduce((s, r) => s + r.amountPaise, 0),
      items: rows.map(shape),
    });
  }),
);

income.post(
  '/income',
  wrap(async (req, res) => {
    const b = parse<IncomeInput>(CreateIncomeSchema, req.body);
    const earnerId = b.userId ?? req.ctx.userId;
    await assertMember(req.ctx.familyId!, earnerId);
    const row = await prisma.income.create({
      data: {
        familyId: req.ctx.familyId!,
        userId: earnerId,
        createdById: req.ctx.userId,
        type: b.type,
        amountPaise: b.amountPaise,
        month: b.month,
        note: b.note || null,
      },
      include,
    });
    res.status(201).json(shape(row));
  }),
);

async function loadOwned(req: Express.Request, id: string) {
  const row = await prisma.income.findFirst({ where: { id, familyId: req.ctx.familyId } });
  if (!row) throw new HttpError(404, 'Income entry not found');
  // The admin, the earner and the person who recorded it may change an entry.
  const mine = row.userId === req.ctx.userId || row.createdById === req.ctx.userId;
  if (!mine && req.ctx.role !== 'ADMIN') {
    throw new HttpError(403, 'You can only change your own income entries');
  }
  return row;
}

income.patch(
  '/income/:id',
  wrap(async (req, res) => {
    const existing = await loadOwned(req, req.params.id);
    const b = parse<Partial<IncomeInput>>(UpdateIncomeSchema, req.body);
    if (b.userId) await assertMember(req.ctx.familyId!, b.userId);
    const row = await prisma.income.update({
      where: { id: existing.id },
      data: {
        ...(b.userId && { userId: b.userId }),
        ...(b.type && { type: b.type }),
        ...(b.amountPaise !== undefined && { amountPaise: b.amountPaise }),
        ...(b.month && { month: b.month }),
        ...(b.note !== undefined && { note: b.note || null }),
      },
      include,
    });
    res.json(shape(row));
  }),
);

income.delete(
  '/income/:id',
  wrap(async (req, res) => {
    const existing = await loadOwned(req, req.params.id);
    await prisma.income.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);
