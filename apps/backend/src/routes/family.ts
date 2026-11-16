import { Router } from 'express';
import { randomBytes } from 'crypto';
import prisma from '@repo/db';
import { AcceptInviteSchema, CreateFamilySchema, InviteSchema } from '@repo/validators';
import {
  HttpError,
  currentMonth,
  monthRange,
  parse,
  requireAdmin,
  requireAuth,
  requireFamily,
  wrap,
} from '../lib';
import { WEB_URL, sendMail } from '../mail';
import { inviteEmail } from '../emailTemplates';

export const family = Router();

// Create a family; the creator becomes its admin.
family.post(
  '/family',
  requireAuth,
  wrap(async (req, res) => {
    const { name } = parse<{ name: string }>(CreateFamilySchema, req.body);
    const existing = await prisma.familyMember.findFirst({
      where: { userId: req.ctx.userId, active: true },
    });
    if (existing) throw new HttpError(409, 'You already belong to a family');
    const created = await prisma.family.create({
      data: { name, members: { create: { userId: req.ctx.userId, role: 'ADMIN' } } },
    });
    res.status(201).json({ id: created.id, name: created.name, role: 'ADMIN' });
  }),
);

// Family info and members with this month's spending.
family.get(
  '/family',
  requireFamily,
  wrap(async (req, res) => {
    const familyId = req.ctx.familyId!;
    const month = typeof req.query.month === 'string' ? req.query.month : currentMonth();
    const [fam, members, spend] = await Promise.all([
      prisma.family.findUniqueOrThrow({ where: { id: familyId } }),
      prisma.familyMember.findMany({
        where: { familyId, active: true },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.expense.groupBy({
        by: ['userId'],
        where: { familyId, date: monthRange(month) },
        _sum: { amountPaise: true },
      }),
    ]);
    const spendBy = new Map(spend.map((s) => [s.userId, s._sum.amountPaise ?? 0]));
    res.json({
      id: fam.id,
      name: fam.name,
      month,
      members: members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        spentPaise: spendBy.get(m.user.id) ?? 0,
      })),
    });
  }),
);

family.patch(
  '/family',
  requireFamily,
  requireAdmin,
  wrap(async (req, res) => {
    const { name } = parse<{ name: string }>(CreateFamilySchema, req.body);
    const updated = await prisma.family.update({ where: { id: req.ctx.familyId }, data: { name } });
    res.json({ id: updated.id, name: updated.name });
  }),
);

// ── Invites ─────────────────────────────────────────────────────────────────
// No email service yet: the admin receives the token and shares the link.

family.post(
  '/family/invites',
  requireFamily,
  requireAdmin,
  wrap(async (req, res) => {
    const { email } = parse<{ email: string }>(InviteSchema, req.body);
    const familyId = req.ctx.familyId!;
    const already = await prisma.familyMember.findFirst({
      where: { familyId, active: true, user: { email } },
    });
    if (already) throw new HttpError(409, 'That person is already in your family');
    const invite = await prisma.invite.create({
      data: {
        familyId,
        email,
        invitedById: req.ctx.userId,
        token: randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const [fam, inviter] = await Promise.all([
      prisma.family.findUniqueOrThrow({ where: { id: familyId } }),
      prisma.user.findUniqueOrThrow({ where: { id: req.ctx.userId } }),
    ]);
    const joinLink = `${WEB_URL}/join?token=${invite.token}&email=${encodeURIComponent(email)}`;
    const mail = inviteEmail({
      inviter: inviter.name,
      family: fam.name,
      email,
      link: joinLink,
      code: invite.token,
    });
    const emailSent = await sendMail(email, mail.subject, mail.text, mail.html);
    // The code is also returned so the admin can share it by hand if the email didn't go out.
    res.status(201).json({
      id: invite.id,
      email: invite.email,
      token: invite.token,
      expiresAt: invite.expiresAt,
      emailSent,
      joinLink,
    });
  }),
);

family.get(
  '/family/invites',
  requireFamily,
  requireAdmin,
  wrap(async (req, res) => {
    const invites = await prisma.invite.findMany({
      where: { familyId: req.ctx.familyId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, expiresAt: true },
    });
    res.json(invites);
  }),
);

family.delete(
  '/family/invites/:id',
  requireFamily,
  requireAdmin,
  wrap(async (req, res) => {
    const r = await prisma.invite.updateMany({
      where: { id: req.params.id, familyId: req.ctx.familyId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    if (!r.count) throw new HttpError(404, 'Invite not found');
    res.status(204).end();
  }),
);

family.post(
  '/invites/accept',
  requireAuth,
  wrap(async (req, res) => {
    const { token } = parse<{ token: string }>(AcceptInviteSchema, req.body);
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new HttpError(400, 'This invite is invalid or has expired');
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.ctx.userId } });
    if (user.email !== invite.email) {
      throw new HttpError(403, 'This invite was sent to a different email address');
    }
    const active = await prisma.familyMember.findFirst({ where: { userId: user.id, active: true } });
    if (active) throw new HttpError(409, 'You already belong to a family');

    await prisma.$transaction([
      prisma.familyMember.upsert({
        where: { userId_familyId: { userId: user.id, familyId: invite.familyId } },
        create: { userId: user.id, familyId: invite.familyId, role: 'MEMBER' },
        update: { active: true, role: 'MEMBER' },
      }),
      prisma.invite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } }),
    ]);
    const fam = await prisma.family.findUniqueOrThrow({ where: { id: invite.familyId } });
    res.json({ id: fam.id, name: fam.name, role: 'MEMBER' });
  }),
);

// Removing a member keeps their past expenses in the family records.
family.delete(
  '/family/members/:userId',
  requireFamily,
  requireAdmin,
  wrap(async (req, res) => {
    if (req.params.userId === req.ctx.userId) {
      throw new HttpError(400, 'Admins cannot remove themselves');
    }
    const r = await prisma.familyMember.updateMany({
      where: { familyId: req.ctx.familyId, userId: req.params.userId, active: true },
      data: { active: false },
    });
    if (!r.count) throw new HttpError(404, 'Member not found');
    res.status(204).end();
  }),
);
