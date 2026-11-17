import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import prisma from '@repo/db';
import type { Prisma, SavedPaymentMethod } from '@repo/db';
import {
  CreatePaymentMethodSchema,
  RevealPaymentMethodSchema,
  UpdatePaymentMethodSchema,
} from '@repo/validators';
import { HttpError, parse, requireFamily, wrap } from '../lib';
import { decryptSecret, encryptSecret } from '../crypto';

// Saved cards and bank accounts. Every route needs a logged-in family member, and every query is
// filtered by the caller's own user id, so one person can never see or change another's methods
// (not even the family admin). A method that is not yours is reported as "not found".
export const paymentMethods = Router();
paymentMethods.use('/payment-methods', requireFamily);

const revealLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true });

type Input = {
  type: 'CARD' | 'BANK';
  nickname?: string;
  cardType?: 'CREDIT' | 'DEBIT';
  lastFour?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  isDefault?: boolean;
};

/** "••••" display of a method, using only the last 4 digits. */
export const maskedNumber = (m: Pick<SavedPaymentMethod, 'type' | 'lastFour'>) =>
  m.type === 'CARD' ? `•••• •••• •••• ${m.lastFour}` : `•••••••• ${m.lastFour}`;

/** Short label used in lists and on expenses, e.g. "HDFC Credit Card ••1234". */
export const methodLabel = (m: Pick<SavedPaymentMethod, 'type' | 'nickname' | 'lastFour'>) =>
  `${m.nickname || (m.type === 'BANK' ? 'Bank account' : 'Card')} ••${m.lastFour}`;

// The encrypted number is never part of a response.
const view = (m: SavedPaymentMethod) => ({
  id: m.id,
  type: m.type,
  nickname: m.nickname,
  cardType: m.cardType,
  lastFour: m.lastFour,
  maskedNumber: maskedNumber(m),
  label: methodLabel(m),
  isDefault: m.isDefault,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

async function findOwned(userId: string, id: string) {
  const m = await prisma.savedPaymentMethod.findFirst({ where: { id, userId, deletedAt: null } });
  if (!m) throw new HttpError(404, 'Payment method not found');
  return m;
}

const isUniqueViolation = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';

/** Is this bank account number already saved by the user? (compares decrypted values) */
async function bankNumberExists(userId: string, number: string, exceptId?: string) {
  const rows = await prisma.savedPaymentMethod.findMany({
    where: { userId, type: 'BANK', deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { accountNumberEnc: true },
  });
  return rows.some((r) => r.accountNumberEnc && decryptSecret(r.accountNumberEnc) === number);
}

/**
 * Changes to a user's defaults of one type are serialized with a transaction-level advisory lock,
 * so two requests at the same moment queue up instead of one failing on the one-default database
 * index. (The index stays as the final safety net.) Call first thing inside the transaction.
 */
async function lockDefaults(tx: Prisma.TransactionClient, userId: string, type: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-defaults:${userId}:${type}`}))`;
}

/** Make `id` the only default of its type for this user, inside the given transaction. */
async function makeDefault(tx: Prisma.TransactionClient, userId: string, type: 'CARD' | 'BANK', id: string) {
  // Clear the old default first so the one-default-per-type database index is never violated.
  await tx.savedPaymentMethod.updateMany({
    where: { userId, type, deletedAt: null, isDefault: true, id: { not: id } },
    data: { isDefault: false },
  });
  return tx.savedPaymentMethod.update({ where: { id }, data: { isDefault: true } });
}

paymentMethods.get(
  '/payment-methods',
  wrap(async (req, res) => {
    const type = req.query.type === 'CARD' || req.query.type === 'BANK' ? req.query.type : undefined;
    const rows = await prisma.savedPaymentMethod.findMany({
      where: { userId: req.ctx.userId, deletedAt: null, ...(type ? { type } : {}) },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ items: rows.map(view) });
  }),
);

paymentMethods.post(
  '/payment-methods',
  wrap(async (req, res) => {
    const b = parse<Input>(CreatePaymentMethodSchema, req.body);
    const userId = req.ctx.userId;

    let lastFour: string;
    let accountNumberEnc: string | null = null;
    if (b.type === 'CARD') {
      lastFour = b.lastFour!;
      const dup = await prisma.savedPaymentMethod.findFirst({
        where: { userId, type: 'CARD', deletedAt: null, lastFour, cardType: b.cardType },
      });
      if (dup) throw new HttpError(409, `You already saved a ${b.cardType!.toLowerCase()} card ending in ${lastFour}`);
    } else {
      if (await bankNumberExists(userId, b.accountNumber!)) {
        throw new HttpError(409, 'You already saved this bank account');
      }
      lastFour = b.accountNumber!.slice(-4);
      accountNumberEnc = encryptSecret(b.accountNumber!);
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        await lockDefaults(tx, userId, b.type);
        const live = await tx.savedPaymentMethod.count({ where: { userId, type: b.type, deletedAt: null } });
        const row = await tx.savedPaymentMethod.create({
          data: {
            userId,
            type: b.type,
            nickname: b.nickname ?? null,
            cardType: b.type === 'CARD' ? b.cardType : null,
            lastFour,
            accountNumberEnc,
            // The first method of a type becomes the default automatically.
            isDefault: false,
          },
        });
        return b.isDefault || live === 0 ? makeDefault(tx, userId, b.type, row.id) : row;
      });
      res.status(201).json(view(created));
    } catch (e) {
      if (isUniqueViolation(e)) throw new HttpError(409, 'Could not save: a default already exists. Please try again.');
      throw e;
    }
  }),
);

paymentMethods.patch(
  '/payment-methods/:id',
  wrap(async (req, res) => {
    const existing = await findOwned(req.ctx.userId, req.params.id);
    const b = parse<Partial<Input>>(UpdatePaymentMethodSchema, req.body);

    // Fields that do not belong to this kind of method are refused rather than ignored.
    if (existing.type === 'CARD' && (b.accountNumber !== undefined || b.confirmAccountNumber !== undefined)) {
      throw new HttpError(400, 'A card has no account number');
    }
    if (existing.type === 'BANK' && (b.cardType !== undefined || b.lastFour !== undefined)) {
      throw new HttpError(400, 'A bank account has no card details');
    }
    if (b.isDefault === false && existing.isDefault) {
      throw new HttpError(400, 'Choose another method as the default instead');
    }

    const data: Prisma.SavedPaymentMethodUpdateInput = {};
    if (b.nickname !== undefined) data.nickname = b.nickname;
    if (existing.type === 'CARD') {
      const cardType = b.cardType ?? existing.cardType!;
      const last = b.lastFour ?? existing.lastFour!;
      if (b.cardType !== undefined || b.lastFour !== undefined) {
        const dup = await prisma.savedPaymentMethod.findFirst({
          where: { userId: existing.userId, type: 'CARD', deletedAt: null, lastFour: last, cardType, id: { not: existing.id } },
        });
        if (dup) throw new HttpError(409, `You already saved a ${cardType.toLowerCase()} card ending in ${last}`);
        data.cardType = cardType;
        data.lastFour = last;
      }
    } else if (b.accountNumber !== undefined) {
      if (await bankNumberExists(existing.userId, b.accountNumber, existing.id)) {
        throw new HttpError(409, 'You already saved this bank account');
      }
      data.accountNumberEnc = encryptSecret(b.accountNumber);
      data.lastFour = b.accountNumber.slice(-4);
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await lockDefaults(tx, existing.userId, existing.type);
        const row = Object.keys(data).length
          ? await tx.savedPaymentMethod.update({ where: { id: existing.id }, data })
          : existing;
        return b.isDefault ? makeDefault(tx, existing.userId, existing.type as 'CARD' | 'BANK', existing.id) : row;
      });
      res.json(view(updated));
    } catch (e) {
      if (isUniqueViolation(e)) throw new HttpError(409, 'Could not update: a default already exists. Please try again.');
      throw e;
    }
  }),
);

paymentMethods.post(
  '/payment-methods/:id/default',
  wrap(async (req, res) => {
    const existing = await findOwned(req.ctx.userId, req.params.id);
    try {
      const updated = await prisma.$transaction(async (tx) => {
        await lockDefaults(tx, existing.userId, existing.type);
        return makeDefault(tx, existing.userId, existing.type as 'CARD' | 'BANK', existing.id);
      });
      res.json(view(updated));
    } catch (e) {
      if (isUniqueViolation(e)) throw new HttpError(409, 'Could not change the default. Please try again.');
      throw e;
    }
  }),
);

// Soft delete: old expenses keep pointing at the method so their history still reads correctly,
// but the stored account number is wiped and the method disappears from lists and pickers.
paymentMethods.delete(
  '/payment-methods/:id',
  wrap(async (req, res) => {
    const existing = await findOwned(req.ctx.userId, req.params.id);
    await prisma.$transaction(async (tx) => {
      await lockDefaults(tx, existing.userId, existing.type);
      await tx.savedPaymentMethod.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), isDefault: false, accountNumberEnc: null },
      });
      if (existing.isDefault) {
        // Hand the default to the most recently added remaining method of the same type.
        const next = await tx.savedPaymentMethod.findFirst({
          where: { userId: existing.userId, type: existing.type, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        if (next) await makeDefault(tx, existing.userId, existing.type as 'CARD' | 'BANK', next.id);
      }
    });
    res.status(204).end();
  }),
);

// The full account number is only ever sent here, to its owner, after they type their password again.
paymentMethods.post(
  '/payment-methods/:id/reveal',
  revealLimiter,
  wrap(async (req, res) => {
    const existing = await findOwned(req.ctx.userId, req.params.id);
    if (existing.type !== 'BANK' || !existing.accountNumberEnc) {
      throw new HttpError(400, 'Only a bank account number can be revealed');
    }
    const { password } = parse<{ password: string }>(RevealPaymentMethodSchema, req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.ctx.userId } });
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(403, 'Incorrect password');
    }
    // Audit trail without the number itself.
    console.log(`[audit] bank account number revealed: method=${existing.id} user=${user.id}`);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ accountNumber: decryptSecret(existing.accountNumberEnc), maskedNumber: maskedNumber(existing) });
  }),
);
