import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, type Ctx, type TestUser } from './helpers';

let t: Ctx;
let admin: TestUser; // admin of family A
let member: TestUser; // member of family A
let outsider: TestUser; // admin of a different family B

const ACCOUNT = '123456789012';
const ACCOUNT_2 = '987654321098';

before(async () => {
  t = await startApp();
  admin = await t.register('Admin A');
  member = await t.register('Member A');
  outsider = await t.register('Outsider B');
  await t.createFamily(admin, 'Family A');
  await t.join(admin, member);
  await t.createFamily(outsider, 'Family B');
});

after(async () => {
  await t.close();
});

const card = (over: Record<string, unknown> = {}) => ({
  type: 'CARD',
  nickname: 'HDFC Credit Card',
  cardType: 'CREDIT',
  lastFour: '1234',
  ...over,
});
const bank = (number = ACCOUNT, over: Record<string, unknown> = {}) => ({
  type: 'BANK',
  accountNumber: number,
  confirmAccountNumber: number,
  ...over,
});
const expense = (over: Record<string, unknown> = {}) => ({
  amountPaise: 150000,
  categoryId: t.categoryId,
  date: '2026-11-01',
  paymentMethod: 'CASH',
  ...over,
});
const list = async (u: TestUser, type?: string) =>
  (await t.call('GET', `/payment-methods${type ? `?type=${type}` : ''}`, u.token)).body.items as any[];
const makeCard = async (u: TestUser, over: Record<string, unknown> = {}) => {
  const r = await t.call('POST', '/payment-methods', u.token, card(over));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
};
const makeBank = async (u: TestUser, number = ACCOUNT) => {
  const r = await t.call('POST', '/payment-methods', u.token, bank(number));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
};

describe('authentication', () => {
  it('every payment-method endpoint needs a login', async () => {
    const calls: [string, string, unknown?][] = [
      ['GET', '/payment-methods'],
      ['POST', '/payment-methods', card()],
      ['PATCH', '/payment-methods/x', { nickname: 'abc' }],
      ['DELETE', '/payment-methods/x'],
      ['POST', '/payment-methods/x/default'],
      ['POST', '/payment-methods/x/reveal', { password: 'x' }],
    ];
    for (const [method, path, body] of calls) {
      const r = await t.call(method, path, null, body);
      assert.equal(r.status, 401, `${method} ${path}`);
    }
  });

  it('a garbage token is rejected', async () => {
    assert.equal((await t.call('GET', '/payment-methods', 'not.a.token')).status, 401);
  });
});

describe('cards: create, read, update, delete', () => {
  let fresh: TestUser;
  before(async () => {
    fresh = await t.register('Card Owner');
    await t.createFamily(fresh, 'Card Family');
  });

  it('creates a card and returns only a masked number', async () => {
    const r = await t.call('POST', '/payment-methods', fresh.token, card());
    assert.equal(r.status, 201);
    assert.equal(r.body.type, 'CARD');
    assert.equal(r.body.nickname, 'HDFC Credit Card');
    assert.equal(r.body.cardType, 'CREDIT');
    assert.equal(r.body.lastFour, '1234');
    assert.equal(r.body.maskedNumber, '•••• •••• •••• 1234');
    assert.equal(r.body.label, 'HDFC Credit Card ••1234');
    assert.ok(!('accountNumberEnc' in r.body), 'encrypted value must never be returned');
    assert.ok(!('userId' in r.body), 'internal ids are not exposed');
  });

  it('the first card becomes the default automatically', async () => {
    const items = await list(fresh, 'CARD');
    assert.equal(items.length, 1);
    assert.equal(items[0].isDefault, true);
  });

  it('lists only what was asked for and never other types', async () => {
    assert.equal((await list(fresh, 'BANK')).length, 0);
    assert.equal((await list(fresh)).length, 1);
  });

  it('rejects invalid cards', async () => {
    const bad: Record<string, unknown>[] = [
      { lastFour: '123' }, // too short
      { lastFour: '12345' }, // too long
      { lastFour: 'abcd' }, // not digits
      { nickname: '' }, // empty nickname
      { nickname: 'x' }, // too short
      { nickname: 'n'.repeat(41) }, // too long
      { cardType: 'GOLD' }, // not Credit/Debit
      { cardType: undefined }, // missing
      { lastFour: undefined }, // missing
      { nickname: undefined }, // missing
    ];
    for (const over of bad) {
      const r = await t.call('POST', '/payment-methods', fresh.token, card(over));
      assert.equal(r.status, 400, JSON.stringify(over));
      assert.ok(typeof r.body.message === 'string' && r.body.message.length > 0);
    }
  });

  it('refuses sensitive card data: full number, CVV, PIN, expiry', async () => {
    for (const field of ['cardNumber', 'number', 'cvv', 'pin', 'expiry']) {
      const r = await t.call('POST', '/payment-methods', fresh.token, card({ [field]: '4111111111111111' }));
      assert.equal(r.status, 400, field);
    }
    assert.equal((await list(fresh, 'CARD')).length, 1, 'nothing extra was saved');
  });

  it('refuses a card with an account number, and a bank account with card fields', async () => {
    assert.equal((await t.call('POST', '/payment-methods', fresh.token, card({ accountNumber: ACCOUNT }))).status, 400);
    assert.equal((await t.call('POST', '/payment-methods', fresh.token, bank(ACCOUNT, { lastFour: '1234' }))).status, 400);
  });

  it('rejects an unknown type (UPI is not creatable yet)', async () => {
    assert.equal((await t.call('POST', '/payment-methods', fresh.token, card({ type: 'UPI' }))).status, 400);
    assert.equal((await t.call('POST', '/payment-methods', fresh.token, card({ type: 'WALLET' }))).status, 400);
  });

  it('rejects a duplicate of the same card', async () => {
    const r = await t.call('POST', '/payment-methods', fresh.token, card({ nickname: 'Another name' }));
    assert.equal(r.status, 409);
  });

  it('allows several cards, including the same last 4 digits with a different card type', async () => {
    await makeCard(fresh, { nickname: 'ICICI Debit', cardType: 'DEBIT', lastFour: '9876' });
    await makeCard(fresh, { nickname: 'HDFC Debit', cardType: 'DEBIT', lastFour: '1234' });
    assert.equal((await list(fresh, 'CARD')).length, 3);
  });

  it('updates nickname, card type and last 4 digits', async () => {
    const [first] = await list(fresh, 'CARD');
    const r = await t.call('PATCH', `/payment-methods/${first.id}`, fresh.token, {
      nickname: 'HDFC Millennia',
      cardType: 'CREDIT',
      lastFour: '5555',
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.nickname, 'HDFC Millennia');
    assert.equal(r.body.lastFour, '5555');
    assert.equal(r.body.maskedNumber, '•••• •••• •••• 5555');
  });

  it('refuses an update that would duplicate another card, and invalid updates', async () => {
    const items = await list(fresh, 'CARD');
    const icici = items.find((i) => i.nickname === 'ICICI Debit');
    assert.equal((await t.call('PATCH', `/payment-methods/${icici.id}`, fresh.token, { lastFour: '1234', cardType: 'DEBIT' })).status, 409);
    assert.equal((await t.call('PATCH', `/payment-methods/${icici.id}`, fresh.token, { lastFour: '12' })).status, 400);
    assert.equal((await t.call('PATCH', `/payment-methods/${icici.id}`, fresh.token, { type: 'BANK' })).status, 400, 'type cannot change');
    assert.equal((await t.call('PATCH', `/payment-methods/${icici.id}`, fresh.token, { accountNumber: ACCOUNT, confirmAccountNumber: ACCOUNT })).status, 400);
  });

  it('deletes a card: 204, then it is gone from the list and a second delete is 404', async () => {
    const items = await list(fresh, 'CARD');
    const target = items.find((i) => i.nickname === 'HDFC Debit');
    assert.equal((await t.call('DELETE', `/payment-methods/${target.id}`, fresh.token)).status, 204);
    assert.ok(!(await list(fresh, 'CARD')).some((i) => i.id === target.id));
    assert.equal((await t.call('DELETE', `/payment-methods/${target.id}`, fresh.token)).status, 404);
  });

  it('an unknown id is 404', async () => {
    assert.equal((await t.call('PATCH', '/payment-methods/does-not-exist', fresh.token, { nickname: 'abc' })).status, 404);
  });
});

describe('bank accounts: encrypted at rest, masked, revealed only with the password', () => {
  let owner: TestUser;
  let acct: any;
  before(async () => {
    owner = await t.register('Bank Owner');
    await t.createFamily(owner, 'Bank Family');
  });

  it('creates a bank account with only the account number (no bank name, IFSC or branch needed)', async () => {
    acct = await makeBank(owner);
    assert.equal(acct.type, 'BANK');
    assert.equal(acct.lastFour, ACCOUNT.slice(-4));
    assert.equal(acct.maskedNumber, `•••••••• ${ACCOUNT.slice(-4)}`);
    assert.equal(acct.isDefault, true, 'first account is the default');
  });

  it('never returns the full account number in any response', async () => {
    const all = JSON.stringify([acct, await list(owner), (await t.call('GET', `/payment-methods?type=BANK`, owner.token)).body]);
    assert.ok(!all.includes(ACCOUNT), 'full number leaked');
    assert.ok(!all.includes('accountNumberEnc'));
  });

  it('stores the account number encrypted, never in plain text', async () => {
    const row = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: acct.id } });
    assert.ok(row.accountNumberEnc.startsWith('v1:'), 'versioned AES-GCM value');
    assert.ok(!row.accountNumberEnc.includes(ACCOUNT));
    assert.ok(!Buffer.from(row.accountNumberEnc.split(':')[3], 'base64').toString('utf8').includes(ACCOUNT));
    // Only the last 4 digits are kept readable, for masked display.
    assert.equal(row.lastFour, ACCOUNT.slice(-4));
    const raw: any[] = await t.prisma.$queryRawUnsafe(`select * from "SavedPaymentMethod" where id = '${acct.id}'`);
    assert.ok(!JSON.stringify(raw).includes(ACCOUNT), 'no column holds the plain number');
  });

  it('uses a fresh IV for every value (same number encrypts differently)', async () => {
    const other = await t.register('Bank Owner 2');
    await t.createFamily(other, 'Bank Family 2');
    const a = await makeBank(other);
    const rowA = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: a.id } });
    const rowB = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: acct.id } });
    assert.notEqual(rowA.accountNumberEnc, rowB.accountNumberEnc);
  });

  it('requires the account number to be confirmed and to match', async () => {
    const mismatch = await t.call('POST', '/payment-methods', owner.token, bank(ACCOUNT_2, { confirmAccountNumber: '111122223333' }));
    assert.equal(mismatch.status, 400);
    assert.match(mismatch.body.message, /do not match/i);
    const noConfirm = await t.call('POST', '/payment-methods', owner.token, { type: 'BANK', accountNumber: ACCOUNT_2 });
    assert.equal(noConfirm.status, 400);
  });

  it('validates the account number format (9 to 18 digits)', async () => {
    for (const bad of ['12345678', '1'.repeat(19), 'ABCD12345678', '12345 678x']) {
      const r = await t.call('POST', '/payment-methods', owner.token, bank(bad));
      assert.equal(r.status, 400, bad);
    }
  });

  it('accepts spaces and hyphens that people type', async () => {
    const r = await t.call('POST', '/payment-methods', owner.token, bank('9876 5432-1098'));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.lastFour, '1098');
  });

  it('rejects saving the same account twice', async () => {
    assert.equal((await t.call('POST', '/payment-methods', owner.token, bank(ACCOUNT))).status, 409);
    assert.equal((await t.call('POST', '/payment-methods', owner.token, bank('987654321098'))).status, 409);
  });

  it('changing the account number needs it confirmed, and re-encrypts it', async () => {
    const noConfirm = await t.call('PATCH', `/payment-methods/${acct.id}`, owner.token, { accountNumber: '555566667777' });
    assert.equal(noConfirm.status, 400);
    const ok = await t.call('PATCH', `/payment-methods/${acct.id}`, owner.token, { accountNumber: '555566667777', confirmAccountNumber: '555566667777' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.lastFour, '7777');
    const before = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: acct.id } });
    assert.ok(!before.accountNumberEnc.includes('555566667777'));
    // put it back for the reveal tests
    await t.call('PATCH', `/payment-methods/${acct.id}`, owner.token, { accountNumber: ACCOUNT, confirmAccountNumber: ACCOUNT });
  });

  it('reveal: needs the password, rejects a wrong one, and only then returns the number', async () => {
    const none = await t.call('POST', `/payment-methods/${acct.id}/reveal`, owner.token, {});
    assert.equal(none.status, 400);
    const wrong = await t.call('POST', `/payment-methods/${acct.id}/reveal`, owner.token, { password: 'wrong-password' });
    assert.equal(wrong.status, 403);
    assert.ok(!JSON.stringify(wrong.body).includes(ACCOUNT));
    const ok = await t.call('POST', `/payment-methods/${acct.id}/reveal`, owner.token, { password: owner.password });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.accountNumber, ACCOUNT);
    assert.equal(ok.headers.get('cache-control'), 'no-store');
  });

  it('reveal is refused for a card', async () => {
    const c = await makeCard(owner);
    const r = await t.call('POST', `/payment-methods/${c.id}/reveal`, owner.token, { password: owner.password });
    assert.equal(r.status, 400);
  });

  it('deleting a bank account wipes the stored number but keeps the row for history', async () => {
    const x = await makeBank(owner, '444455556666');
    assert.equal((await t.call('DELETE', `/payment-methods/${x.id}`, owner.token)).status, 204);
    const row = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: x.id } });
    assert.equal(row.accountNumberEnc, null, 'encrypted number removed');
    assert.ok(row.deletedAt, 'soft deleted');
    assert.equal((await t.call('POST', `/payment-methods/${x.id}/reveal`, owner.token, { password: owner.password })).status, 404);
  });
});

describe('default selection', () => {
  let u: TestUser;
  before(async () => {
    u = await t.register('Default Owner');
    await t.createFamily(u, 'Default Family');
  });

  const defaultsOf = async (type: string) =>
    t.prisma.savedPaymentMethod.count({ where: { userId: u.id, type, isDefault: true, deletedAt: null } });

  it('first of each type is the default; later ones are not', async () => {
    const c1 = await makeCard(u, { nickname: 'Card One', lastFour: '1111' });
    const c2 = await makeCard(u, { nickname: 'Card Two', lastFour: '2222' });
    const b1 = await makeBank(u, '100000000001');
    assert.equal(c1.isDefault, true);
    assert.equal(c2.isDefault, false);
    assert.equal(b1.isDefault, true, 'a bank default does not depend on cards');
  });

  it('listing puts the default first', async () => {
    const items = await list(u, 'CARD');
    assert.equal(items[0].isDefault, true);
    assert.equal(items[0].nickname, 'Card One');
  });

  it('setting a default moves it and leaves exactly one per type', async () => {
    const c2 = (await list(u, 'CARD')).find((i) => i.nickname === 'Card Two');
    const r = await t.call('POST', `/payment-methods/${c2.id}/default`, u.token);
    assert.equal(r.status, 200);
    assert.equal(r.body.isDefault, true);
    assert.equal(await defaultsOf('CARD'), 1);
    assert.equal((await list(u, 'CARD')).find((i) => i.isDefault).nickname, 'Card Two');
    assert.equal(await defaultsOf('BANK'), 1, 'the bank default is untouched');
  });

  it('creating with isDefault: true takes over the default', async () => {
    const c3 = await makeCard(u, { nickname: 'Card Three', lastFour: '3333', isDefault: true });
    assert.equal(c3.isDefault, true);
    assert.equal(await defaultsOf('CARD'), 1);
    assert.equal((await list(u, 'CARD')).find((i) => i.isDefault).nickname, 'Card Three');
  });

  it('updating with isDefault: true also moves the default', async () => {
    const c1 = (await list(u, 'CARD')).find((i) => i.nickname === 'Card One');
    const r = await t.call('PATCH', `/payment-methods/${c1.id}`, u.token, { isDefault: true });
    assert.equal(r.status, 200);
    assert.equal(await defaultsOf('CARD'), 1);
    assert.equal((await list(u, 'CARD')).find((i) => i.isDefault).nickname, 'Card One');
  });

  it('you cannot un-default the default (pick another one instead)', async () => {
    const d = (await list(u, 'CARD')).find((i) => i.isDefault);
    assert.equal((await t.call('PATCH', `/payment-methods/${d.id}`, u.token, { isDefault: false })).status, 400);
    assert.equal(await defaultsOf('CARD'), 1);
  });

  it('deleting the default hands the default to another method of that type', async () => {
    const d = (await list(u, 'CARD')).find((i) => i.isDefault);
    assert.equal((await t.call('DELETE', `/payment-methods/${d.id}`, u.token)).status, 204);
    assert.equal(await defaultsOf('CARD'), 1, 'still exactly one default');
    assert.ok((await list(u, 'CARD')).find((i) => i.isDefault));
  });

  it('deleting the only method of a type leaves no default and no error', async () => {
    const b = (await list(u, 'BANK'))[0];
    assert.equal((await t.call('DELETE', `/payment-methods/${b.id}`, u.token)).status, 204);
    assert.equal(await defaultsOf('BANK'), 0);
    assert.equal((await list(u, 'BANK')).length, 0);
  });

  it('the DATABASE refuses two defaults of the same type for one user', async () => {
    const cards = await t.prisma.savedPaymentMethod.findMany({ where: { userId: u.id, type: 'CARD', deletedAt: null } });
    assert.ok(cards.length >= 2);
    await t.prisma.savedPaymentMethod.updateMany({ where: { userId: u.id, type: 'CARD' }, data: { isDefault: false } });
    await t.prisma.savedPaymentMethod.update({ where: { id: cards[0].id }, data: { isDefault: true } });
    await assert.rejects(
      () => t.prisma.savedPaymentMethod.update({ where: { id: cards[1].id }, data: { isDefault: true } }),
      /Unique constraint|unique/i,
    );
  });

  it('concurrent "set default" calls all succeed and still leave exactly one default', async () => {
    const cards = await list(u, 'CARD');
    assert.ok(cards.length >= 2);
    for (let round = 0; round < 3; round++) {
      const results = await Promise.all(cards.map((c) => t.call('POST', `/payment-methods/${c.id}/default`, u.token)));
      assert.deepEqual(results.map((r) => r.status), cards.map(() => 200), 'no request may fail with an error');
      assert.equal(await defaultsOf('CARD'), 1);
    }
  });

  it('concurrent creates of the first method of a type leave exactly one default', async () => {
    const fresh = await t.register('Race Owner');
    await t.createFamily(fresh, 'Race Family');
    const results = await Promise.all(
      ['1010', '2020', '3030', '4040'].map((lastFour) =>
        t.call('POST', '/payment-methods', fresh.token, card({ nickname: `Card ${lastFour}`, lastFour })),
      ),
    );
    assert.deepEqual(results.map((r) => r.status), [201, 201, 201, 201]);
    const defaults = (await list(fresh, 'CARD')).filter((m) => m.isDefault);
    assert.equal(defaults.length, 1);
  });
});

describe('authorization and family-member isolation', () => {
  let adminCard: any;
  let memberCard: any;
  let adminBank: any;
  before(async () => {
    adminCard = await makeCard(admin, { nickname: 'Admin Card', lastFour: '4444' });
    adminBank = await makeBank(admin, '200000000002');
    memberCard = await makeCard(member, { nickname: 'Member Card', lastFour: '5555' });
  });

  it('a member sees only their own methods, never the admin’s', async () => {
    const mine = await list(member);
    assert.ok(mine.every((m) => m.id !== adminCard.id && m.id !== adminBank.id));
    assert.ok(mine.some((m) => m.id === memberCard.id));
  });

  it('the family admin cannot see a member’s methods either', async () => {
    const theirs = await list(admin);
    assert.ok(!theirs.some((m) => m.id === memberCard.id));
  });

  it('someone in another family sees nothing of family A', async () => {
    const items = await list(outsider);
    assert.ok(!items.some((m) => [adminCard.id, adminBank.id, memberCard.id].includes(m.id)));
  });

  it('PATCH / DELETE / default / reveal on someone else’s method are all 404', async () => {
    for (const who of [member, outsider]) {
      assert.equal((await t.call('PATCH', `/payment-methods/${adminCard.id}`, who.token, { nickname: 'Hacked' })).status, 404);
      assert.equal((await t.call('DELETE', `/payment-methods/${adminCard.id}`, who.token)).status, 404);
      assert.equal((await t.call('POST', `/payment-methods/${adminCard.id}/default`, who.token)).status, 404);
      assert.equal((await t.call('POST', `/payment-methods/${adminBank.id}/reveal`, who.token, { password: who.password })).status, 404);
    }
    // and the admin cannot touch the member's either
    assert.equal((await t.call('DELETE', `/payment-methods/${memberCard.id}`, admin.token)).status, 404);
    const still = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: adminCard.id } });
    assert.equal(still.nickname, 'Admin Card');
    assert.equal(still.deletedAt, null);
  });

  it('revealing needs the owner’s own password, not anyone else’s', async () => {
    const r = await t.call('POST', `/payment-methods/${adminBank.id}/reveal`, admin.token, { password: member.password });
    assert.equal(r.status, 403);
  });

  it('a user who is not in a family cannot use the API', async () => {
    const loner = await t.register('No Family');
    assert.equal((await t.call('GET', '/payment-methods', loner.token)).status, 403);
    assert.equal((await t.call('POST', '/payment-methods', loner.token, card())).status, 403);
  });

  it('an expense cannot use a card that belongs to someone else', async () => {
    const r = await t.call('POST', '/expenses', member.token, expense({ paymentMethod: 'CARD', paymentMethodId: adminCard.id }));
    assert.equal(r.status, 400);
    const r2 = await t.call('POST', '/expenses', outsider.token, expense({ paymentMethod: 'CARD', paymentMethodId: adminCard.id }));
    assert.equal(r2.status, 400);
  });

  it('the DATABASE refuses an expense that points at another user’s method', async () => {
    const e = await t.call('POST', '/expenses', member.token, expense());
    await assert.rejects(
      () => t.prisma.expense.update({ where: { id: e.body.id }, data: { paymentMethod: 'CARD', paymentMethodId: adminCard.id } }),
      /Foreign key|foreign key|violat/i,
    );
  });

  it('the DATABASE refuses malformed methods (card with an account number, bad last 4)', async () => {
    const insert = (cols: string) =>
      t.prisma.$executeRawUnsafe(
        `insert into "SavedPaymentMethod" (id, "userId", type, nickname, "cardType", "lastFour", "accountNumberEnc", "updatedAt") values ${cols}`,
      );
    await assert.rejects(() => insert(`('chk1', '${admin.id}', 'CARD', 'x', 'CREDIT', '1234', 'v1:a:b:c', now())`), /check/i);
    await assert.rejects(() => insert(`('chk2', '${admin.id}', 'CARD', 'x', 'CREDIT', '12ab', NULL, now())`), /check/i);
    await assert.rejects(() => insert(`('chk3', '${admin.id}', 'BANK', NULL, 'CREDIT', '1234', 'v1:a:b:c', now())`), /check/i);
    await assert.rejects(() => insert(`('chk4', '${admin.id}', 'BANK', NULL, NULL, '1234', NULL, now())`), /check/i);
  });
});

describe('Add Expense integration', () => {
  let c: any;
  let b: any;
  before(async () => {
    c = await makeCard(admin, { nickname: 'Axis Credit', lastFour: '7777' });
    b = await makeBank(admin, '300000000003');
  });

  it('Cash and UPI still work exactly as before', async () => {
    for (const paymentMethod of ['CASH', 'UPI']) {
      const r = await t.call('POST', '/expenses', admin.token, expense({ paymentMethod }));
      assert.equal(r.status, 201, paymentMethod);
      assert.equal(r.body.paymentMethod, paymentMethod);
      assert.equal(r.body.paymentMethodId, null);
      assert.equal(r.body.paymentMethodLabel, null);
    }
  });

  it('Cash and UPI cannot carry a saved method', async () => {
    for (const paymentMethod of ['CASH', 'UPI']) {
      const r = await t.call('POST', '/expenses', admin.token, expense({ paymentMethod, paymentMethodId: c.id }));
      assert.equal(r.status, 400, paymentMethod);
    }
  });

  it('a Card expense can use a saved card and shows its label', async () => {
    const r = await t.call('POST', '/expenses', admin.token, expense({ paymentMethod: 'CARD', paymentMethodId: c.id }));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.paymentMethodId, c.id);
    assert.equal(r.body.paymentMethodLabel, 'Axis Credit ••7777');
  });

  it('a Bank Transfer expense can use a saved account (masked label only)', async () => {
    const r = await t.call('POST', '/expenses', admin.token, expense({ paymentMethod: 'BANK_TRANSFER', paymentMethodId: b.id }));
    assert.equal(r.status, 201);
    assert.equal(r.body.paymentMethodLabel, 'Bank account ••0003');
    assert.ok(!JSON.stringify(r.body).includes('300000000003'));
  });

  it('the saved method must match the payment method type', async () => {
    assert.equal((await t.call('POST', '/expenses', admin.token, expense({ paymentMethod: 'CARD', paymentMethodId: b.id }))).status, 400);
    assert.equal((await t.call('POST', '/expenses', admin.token, expense({ paymentMethod: 'BANK_TRANSFER', paymentMethodId: c.id }))).status, 400);
  });

  it('an unknown saved method id is rejected', async () => {
    assert.equal((await t.call('POST', '/expenses', admin.token, expense({ paymentMethod: 'CARD', paymentMethodId: 'nope' }))).status, 400);
  });

  it('backward compatible: Card and Bank Transfer expenses without a saved method still save', async () => {
    for (const paymentMethod of ['CARD', 'BANK_TRANSFER']) {
      const r = await t.call('POST', '/expenses', admin.token, expense({ paymentMethod }));
      assert.equal(r.status, 201, paymentMethod);
      assert.equal(r.body.paymentMethodId, null);
    }
  });

  it('old expenses (created before this feature) still load', async () => {
    const old = await t.prisma.expense.create({
      data: {
        familyId: (await t.prisma.familyMember.findFirstOrThrow({ where: { userId: admin.id } })).familyId,
        userId: admin.id,
        categoryId: t.categoryId,
        amountPaise: 99900,
        date: new Date('2026-10-05'),
        paymentMethod: 'CARD',
      },
    });
    const r = await t.call('GET', `/expenses/${old.id}`, admin.token);
    assert.equal(r.status, 200);
    assert.equal(r.body.paymentMethod, 'CARD');
    assert.equal(r.body.paymentMethodId, null);
    assert.equal(r.body.paymentMethodLabel, null);
    assert.equal(r.body.paymentMethodRemoved, false);
  });

  it('the saved card label is private to the person who made the expense', async () => {
    const mine = await t.call('POST', '/expenses', member.token, expense({ paymentMethod: 'CARD', paymentMethodId: memberCard().id }));
    assert.equal(mine.status, 201, JSON.stringify(mine.body));
    const own = await t.call('GET', `/expenses/${mine.body.id}`, member.token);
    assert.ok(own.body.paymentMethodLabel);
    for (const viewer of [admin]) {
      const seen = await t.call('GET', `/expenses/${mine.body.id}`, viewer.token);
      assert.equal(seen.body.paymentMethod, 'CARD', 'the plain method is visible to the family');
      assert.equal(seen.body.paymentMethodLabel, null);
      assert.equal(seen.body.paymentMethodId, null);
    }
    const listed = (await t.call('GET', '/expenses', admin.token)).body.items.find((e: any) => e.id === mine.body.id);
    assert.equal(listed.paymentMethodLabel, null);
  });

  it('editing an expense: attach, change and clear the saved method', async () => {
    const e = await t.call('POST', '/expenses', admin.token, expense({ paymentMethod: 'CARD' }));
    const attached = await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { paymentMethodId: c.id });
    assert.equal(attached.status, 200, JSON.stringify(attached.body));
    assert.equal(attached.body.paymentMethodId, c.id);
    const cleared = await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { paymentMethodId: null });
    assert.equal(cleared.body.paymentMethodId, null);
    // Changing the kind away from card/bank drops the link automatically.
    await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { paymentMethodId: c.id });
    const toCash = await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { paymentMethod: 'CASH' });
    assert.equal(toCash.status, 200);
    assert.equal(toCash.body.paymentMethodId, null);
    // Cash + a saved method is refused on edit as well.
    assert.equal((await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { paymentMethodId: c.id })).status, 400);
  });

  it('the family admin cannot attach their own card to a member’s expense', async () => {
    const e = await t.call('POST', '/expenses', member.token, expense({ paymentMethod: 'CARD' }));
    const r = await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { paymentMethodId: c.id });
    assert.equal(r.status, 400, 'admin card is not the member’s card');
    // but the admin can still edit other fields of it
    const note = await t.call('PATCH', `/expenses/${e.body.id}`, admin.token, { note: 'fixed by admin' });
    assert.equal(note.status, 200);
  });

  function memberCard() {
    return memberCardRef;
  }
  let memberCardRef: any;
  before(async () => {
    memberCardRef = (await list(member)).find((m) => m.type === 'CARD');
  });
});

describe('historical transactions survive deleting a payment method', () => {
  let u: TestUser;
  let savedCard: any;
  let expenseId: string;
  before(async () => {
    u = await t.register('History Owner');
    await t.createFamily(u, 'History Family');
    savedCard = await makeCard(u, { nickname: 'Old Card', lastFour: '8080' });
    const e = await t.call('POST', '/expenses', u.token, expense({ paymentMethod: 'CARD', paymentMethodId: savedCard.id, amountPaise: 250000 }));
    assert.equal(e.status, 201);
    expenseId = e.body.id;
    assert.equal((await t.call('DELETE', `/payment-methods/${savedCard.id}`, u.token)).status, 204);
  });

  it('the expense still exists, with the same amount and payment method', async () => {
    const r = await t.call('GET', `/expenses/${expenseId}`, u.token);
    assert.equal(r.status, 200);
    assert.equal(r.body.amountPaise, 250000);
    assert.equal(r.body.paymentMethod, 'CARD');
  });

  it('it still shows which card was used, marked as removed', async () => {
    const r = await t.call('GET', `/expenses/${expenseId}`, u.token);
    assert.equal(r.body.paymentMethodLabel, 'Old Card ••8080');
    assert.equal(r.body.paymentMethodRemoved, true);
    assert.equal(r.body.paymentMethodId, savedCard.id);
  });

  it('it is still in the expense list and in the totals', async () => {
    const r = await t.call('GET', '/expenses', u.token);
    assert.ok(r.body.items.some((e: any) => e.id === expenseId));
    assert.equal(r.body.totalPaise, 250000);
  });

  it('the deleted card is gone from the list and the database row is kept', async () => {
    assert.ok(!(await list(u, 'CARD')).some((m) => m.id === savedCard.id));
    const row = await t.prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: savedCard.id } });
    assert.ok(row.deletedAt);
    assert.equal(row.isDefault, false);
  });

  it('a deleted method cannot be picked for a new expense', async () => {
    const r = await t.call('POST', '/expenses', u.token, expense({ paymentMethod: 'CARD', paymentMethodId: savedCard.id }));
    assert.equal(r.status, 400);
  });

  it('editing the old expense (for example its note) keeps the link', async () => {
    const r = await t.call('PATCH', `/expenses/${expenseId}`, u.token, { note: 'edited later' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.paymentMethodId, savedCard.id);
    assert.equal(r.body.paymentMethodLabel, 'Old Card ••8080');
  });

  it('the same last 4 digits can be saved again after deleting, without confusion', async () => {
    const again = await makeCard(u, { nickname: 'New Card', lastFour: '8080' });
    assert.notEqual(again.id, savedCard.id);
    assert.equal(again.isDefault, true);
  });

  it('the dashboard summary still counts the expense', async () => {
    const r = await t.call('GET', '/summary?month=2026-11', u.token);
    assert.equal(r.status, 200);
    assert.equal(r.body.expensesPaise, 250000);
  });
});
