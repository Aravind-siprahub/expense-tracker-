import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import prisma from '@repo/db';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
} from '@repo/validators';
import { HttpError, parse, requireAuth, signToken, wrap } from '../lib';
import { WEB_URL, sendMail } from '../mail';
import { resetEmail, welcomeEmail } from '../emailTemplates';
import { codeMatches, formatCode, hashCode, makeCode } from '../codes';

export const auth = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true });

// ── Forgot password ─────────────────────────────────────────────────────────
// A short one-time code is emailed (with a link that pre-fills it). Codes expire after
// 30 minutes, work once, and are locked after 5 wrong tries. Only a hash is stored.

auth.post(
  '/auth/forgot',
  resetLimiter,
  wrap(async (req, res) => {
    const { email } = parse<{ email: string }>(ForgotPasswordSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const code = makeCode();
      await prisma.$transaction([
        prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
        prisma.passwordReset.create({
          data: {
            userId: user.id,
            codeHash: hashCode(code),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        }),
      ]);
      const shown = formatCode(code);
      const link = `${WEB_URL}/reset?email=${encodeURIComponent(email)}&code=${code}`;
      const mail = resetEmail({ name: user.name, code: shown, link });
      await sendMail(email, mail.subject, mail.text, mail.html);
    }
    // Same answer whether or not the email exists, so it can't be used to find accounts.
    res.status(204).end();
  }),
);

auth.post(
  '/auth/reset',
  resetLimiter,
  wrap(async (req, res) => {
    const body = parse<{ email: string; code: string; newPassword: string }>(ResetPasswordSchema, req.body);
    const bad = new HttpError(400, 'That code is invalid or has expired');
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw bad;
    const reset = await prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset || reset.attempts >= 5) throw bad;

    if (!codeMatches(body.code, reset.codeHash)) {
      await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      throw bad;
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 12) } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    res.status(204).end();
  }),
);

const publicUser = (u: { id: string; email: string; name: string }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

auth.post(
  '/auth/register',
  limiter,
  wrap(async (req, res) => {
    const body = parse<{ name: string; email: string; password: string }>(RegisterSchema, req.body);
    if (await prisma.user.findUnique({ where: { email: body.email } })) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 12),
      },
    });
    // Welcome email: sent in the background so sign-up never waits on the mail server.
    const welcome = welcomeEmail({ name: user.name, appUrl: WEB_URL });
    void sendMail(user.email, welcome.subject, welcome.text, welcome.html);
    res.status(201).json({ token: signToken(user.id), user: publicUser(user), family: null });
  }),
);

auth.post(
  '/auth/login',
  limiter,
  wrap(async (req, res) => {
    const body = parse<{ email: string; password: string }>(LoginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    // Same message for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    res.json({ token: signToken(user.id), user: publicUser(user), family: await familyOf(user.id) });
  }),
);

async function familyOf(userId: string) {
  const m = await prisma.familyMember.findFirst({
    where: { userId, active: true },
    include: { family: true },
  });
  return m ? { id: m.family.id, name: m.family.name, role: m.role } : null;
}

auth.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.ctx.userId } });
    if (!user) throw new HttpError(401, 'Please log in again', undefined, 'SESSION_EXPIRED');
    res.json({ user: publicUser(user), family: await familyOf(user.id) });
  }),
);

auth.patch(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const body = parse<{
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }>(UpdateProfileSchema, req.body);
    const user = await prisma.user.findUnique({ where: { id: req.ctx.userId } });
    if (!user) throw new HttpError(401, 'Please log in again');

    const data: { name?: string; email?: string; passwordHash?: string } = {};
    if (body.name) data.name = body.name;
    if (body.email && body.email !== user.email) {
      if (await prisma.user.findUnique({ where: { email: body.email } })) {
        throw new HttpError(409, 'That email is already in use');
      }
      data.email = body.email;
    }
    if (body.newPassword) {
      if (!body.currentPassword || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
        throw new HttpError(400, 'Current password is incorrect');
      }
      data.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    res.json({ user: publicUser(updated) });
  }),
);
