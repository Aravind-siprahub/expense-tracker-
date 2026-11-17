// Shared test setup. The tests start the real Express app on a random port and talk to it over HTTP,
// against the database in DATABASE_URL, using freshly created users that are deleted afterwards.
//
// Run:  corepack yarn workspace @repo/backend test
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { randomBytes } from 'crypto';

// Never send real email from tests, and make sure the settings the app needs exist.
// (Set before the app is imported, because the app reads them when it loads.)
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.RESEND_API_KEY = '';
process.env.JWT_SECRET ||= randomBytes(24).toString('base64');
process.env.PAYMENT_ENCRYPTION_KEY ||= randomBytes(32).toString('base64');

export type Api = { status: number; body: any; headers: Headers };

export interface TestUser {
  id: string;
  token: string;
  email: string;
  password: string;
}

export interface Ctx {
  baseUrl: string;
  prisma: any;
  categoryId: string;
  call: (method: string, path: string, token?: string | null, body?: unknown) => Promise<Api>;
  register: (name: string) => Promise<TestUser>;
  createFamily: (user: TestUser, name: string) => Promise<void>;
  join: (admin: TestUser, member: TestUser) => Promise<void>;
  close: () => Promise<void>;
}

export async function startApp(): Promise<Ctx> {
  const { app, ensureDefaultCategories } = await import('../src/index');
  const prisma = (await import('@repo/db')).default;
  await ensureDefaultCategories();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const createdUserIds: string[] = [];
  const stamp = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
  let n = 0;

  const call: Ctx['call'] = async (method, path, token, body) => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { status: res.status, body: parsed, headers: res.headers };
  };

  const register: Ctx['register'] = async (name) => {
    const email = `pmtest-${stamp}-${++n}@example.test`;
    const password = `Test-Pass-${randomBytes(4).toString('hex')}`;
    const r = await call('POST', '/auth/register', null, { name, email, password });
    if (r.status !== 201) throw new Error(`register failed: ${JSON.stringify(r.body)}`);
    createdUserIds.push(r.body.user.id);
    return { id: r.body.user.id, token: r.body.token, email, password };
  };

  const createFamily: Ctx['createFamily'] = async (user, name) => {
    const r = await call('POST', '/family', user.token, { name });
    if (r.status !== 201) throw new Error(`create family failed: ${JSON.stringify(r.body)}`);
  };

  const join: Ctx['join'] = async (admin, member) => {
    const inv = await call('POST', '/family/invites', admin.token, { email: member.email });
    const acc = await call('POST', '/invites/accept', member.token, { token: inv.body.token });
    if (acc.status !== 200) throw new Error(`join failed: ${JSON.stringify(acc.body)}`);
  };

  const category = await prisma.category.findFirstOrThrow({ where: { familyId: null } });

  const close = async () => {
    // Remove everything the tests created, children before parents.
    const memberships = await prisma.familyMember.findMany({ where: { userId: { in: createdUserIds } } });
    const familyIds = [...new Set(memberships.map((m: { familyId: string }) => m.familyId))];
    await prisma.expense.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.savedPaymentMethod.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.income.deleteMany({ where: { familyId: { in: familyIds } } });
    await prisma.budget.deleteMany({ where: { familyId: { in: familyIds } } });
    await prisma.invite.deleteMany({ where: { familyId: { in: familyIds } } });
    await prisma.passwordReset.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.familyMember.deleteMany({ where: { familyId: { in: familyIds } } });
    await prisma.category.deleteMany({ where: { familyId: { in: familyIds } } });
    await prisma.family.deleteMany({ where: { id: { in: familyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await new Promise<void>((r) => server.close(() => r()));
    await prisma.$disconnect();
  };

  return { baseUrl, prisma, categoryId: category.id, call, register, createFamily, join, close };
}
