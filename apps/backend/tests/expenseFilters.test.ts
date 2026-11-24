import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, type Ctx, type TestUser } from './helpers';

// Expense History filters: one saved card / account, and search by note, category, person and amount.
let t: Ctx;
let admin: TestUser;
let member: TestUser;
let hdfc = '';
let sbi = '';

const add = (u: TestUser, over: Record<string, unknown>) =>
  t.call('POST', '/expenses', u.token, { amountPaise: 10000, categoryId: t.categoryId, date: '2026-03-10', paymentMethod: 'CASH', ...over });
const list = async (u: TestUser, qs: string) => (await t.call('GET', `/expenses?${qs}`, u.token)).body;

before(async () => {
  t = await startApp();
  admin = await t.register('Filter Admin');
  member = await t.register('Filter Member Meera');
  await t.createFamily(admin, 'Filter Family');
  await t.join(admin, member);
  hdfc = (await t.call('POST', '/payment-methods', admin.token, { type: 'CARD', nickname: 'HDFC Credit', cardType: 'CREDIT', lastFour: '1111' })).body.id;
  sbi = (await t.call('POST', '/payment-methods', admin.token, { type: 'CARD', nickname: 'SBI Debit', cardType: 'DEBIT', lastFour: '2222' })).body.id;
  await add(admin, { amountPaise: 150050, paymentMethod: 'CARD', paymentMethodId: hdfc, note: 'laptop bag' });
  await add(admin, { amountPaise: 20000, paymentMethod: 'CARD', paymentMethodId: sbi, note: 'snacks' });
  await add(admin, { amountPaise: 30000, paymentMethod: 'UPI', note: 'auto fare' });
  await add(member, { amountPaise: 45000, paymentMethod: 'CASH', note: 'milk' });
});

after(async () => {
  await t.close();
});

describe('filter by one saved card or account', () => {
  it('returns only the expenses paid with that card, and a matching total', async () => {
    const r = await list(admin, `paymentMethodId=${hdfc}`);
    assert.equal(r.totalCount, 1);
    assert.equal(r.items[0].note, 'laptop bag');
    assert.equal(r.totalPaise, 150050);
  });

  it('two different cards give different results', async () => {
    assert.equal((await list(admin, `paymentMethodId=${sbi}`)).items[0].note, 'snacks');
  });

  it('can be combined with the payment mode', async () => {
    assert.equal((await list(admin, `paymentMethod=CARD&paymentMethodId=${hdfc}`)).totalCount, 1);
    assert.equal((await list(admin, `paymentMethod=UPI&paymentMethodId=${hdfc}`)).totalCount, 0);
  });

  it('someone else’s saved method id returns nothing (saved methods are private)', async () => {
    const r = await list(member, `paymentMethodId=${hdfc}`);
    assert.equal(r.totalCount, 0);
    assert.ok(!JSON.stringify(r).includes('HDFC'));
  });

  it('an unknown id returns an empty list, not an error', async () => {
    assert.equal((await list(admin, 'paymentMethodId=does-not-exist')).totalCount, 0);
  });
});

describe('search', () => {
  it('finds by note, case-insensitively', async () => {
    assert.equal((await list(admin, 'q=LAPTOP')).totalCount, 1);
  });

  it('finds by person name', async () => {
    const r = await list(admin, 'q=meera');
    assert.equal(r.totalCount, 1);
    assert.equal(r.items[0].note, 'milk');
  });

  it('finds by amount with or without symbols and commas', async () => {
    for (const q of ['1500.50', '1,500.50', '₹1,500.50']) {
      const r = await list(admin, `q=${encodeURIComponent(q)}`);
      assert.equal(r.items.some((i: any) => i.note === 'laptop bag'), true, q);
    }
  });

  it('finds by your own saved card nickname, but not by someone else’s', async () => {
    assert.equal((await list(admin, 'q=HDFC')).totalCount, 1);
    assert.equal((await list(member, 'q=HDFC')).totalCount, 0);
  });

  it('special characters are plain text', async () => {
    assert.equal((await list(admin, `q=${encodeURIComponent("' OR 1=1 --")}`)).totalCount, 0);
    assert.equal((await list(admin, `q=${encodeURIComponent('%')}`)).totalCount, 0);
  });
});
