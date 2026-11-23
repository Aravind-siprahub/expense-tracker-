import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startApp, type Ctx, type TestUser } from './helpers';

describe('income, expense, dashboard and history flow', () => {
  let t: Ctx;
  let user: TestUser;
  let incomeId: string;
  let expenseId: string;

  const month = '2026-11';

  before(async () => {
    t = await startApp();
    user = await t.register('Flow Tester');
    await t.createFamily(user, 'Flow Test Family');
  });

  after(async () => {
    await t.close();
  });

  it('starts with empty income, history and dashboard totals', async () => {
    const [income, expenses, summary] = await Promise.all([
      t.call('GET', `/income?month=${month}`, user.token),
      t.call('GET', `/expenses?month=${month}`, user.token),
      t.call('GET', `/summary?month=${month}`, user.token),
    ]);

    assert.equal(income.status, 200);
    assert.equal(income.body.totalPaise, 0);
    assert.deepEqual(income.body.items, []);
    assert.equal(expenses.status, 200);
    assert.equal(expenses.body.totalPaise, 0);
    assert.deepEqual(expenses.body.items, []);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.incomePaise, 0);
    assert.equal(summary.body.expensesPaise, 0);
  });

  it('creates income and an expense and exposes them in lists and dashboard totals', async () => {
    const income = await t.call('POST', '/income', user.token, {
      type: 'SALARY',
      amountPaise: 500_000,
      month,
      note: 'E2E income',
    });
    assert.equal(income.status, 201);
    incomeId = income.body.id;

    const expense = await t.call('POST', '/expenses', user.token, {
      amountPaise: 125_000,
      categoryId: t.categoryId,
      date: `${month}-20`,
      paymentMethod: 'UPI',
      note: 'E2E expense',
    });
    assert.equal(expense.status, 201);
    expenseId = expense.body.id;

    const [incomeList, history, summary] = await Promise.all([
      t.call('GET', `/income?month=${month}`, user.token),
      t.call('GET', `/expenses?month=${month}`, user.token),
      t.call('GET', `/summary?month=${month}`, user.token),
    ]);

    assert.equal(incomeList.body.totalPaise, 500_000);
    assert.equal(incomeList.body.items[0].id, incomeId);
    assert.equal(history.body.totalPaise, 125_000);
    assert.equal(history.body.items[0].id, expenseId);
    assert.equal(summary.body.incomePaise, 500_000);
    assert.equal(summary.body.expensesPaise, 125_000);
    assert.equal(summary.body.remainingPaise, 375_000);
    assert.ok(
      summary.body.recent.some((item: { id: string }) => item.id === expenseId)
    );
  });

  it('updates the income total everywhere', async () => {
    const updated = await t.call('PATCH', `/income/${incomeId}`, user.token, {
      amountPaise: 600_000,
    });
    assert.equal(updated.status, 200);

    const [incomeList, summary] = await Promise.all([
      t.call('GET', `/income?month=${month}`, user.token),
      t.call('GET', `/summary?month=${month}`, user.token),
    ]);
    assert.equal(incomeList.body.totalPaise, 600_000);
    assert.equal(summary.body.incomePaise, 600_000);
    assert.equal(summary.body.remainingPaise, 475_000);
  });

  it('deletes both records and restores empty totals', async () => {
    assert.equal(
      (await t.call('DELETE', `/expenses/${expenseId}`, user.token)).status,
      204
    );
    assert.equal(
      (await t.call('DELETE', `/income/${incomeId}`, user.token)).status,
      204
    );

    const [incomeList, history, summary] = await Promise.all([
      t.call('GET', `/income?month=${month}`, user.token),
      t.call('GET', `/expenses?month=${month}`, user.token),
      t.call('GET', `/summary?month=${month}`, user.token),
    ]);
    assert.equal(incomeList.body.totalPaise, 0);
    assert.deepEqual(incomeList.body.items, []);
    assert.equal(history.body.totalPaise, 0);
    assert.deepEqual(history.body.items, []);
    assert.equal(summary.body.incomePaise, 0);
    assert.equal(summary.body.expensesPaise, 0);
    assert.deepEqual(summary.body.recent, []);
  });
});
