// Run: corepack yarn workspace @repo/mobile test
import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveBudget } from '../src/lib/budget.ts';

test('an explicit total wins over the category sum', () => {
  assert.deepEqual(effectiveBudget(6_000_000, [100_000, 1_000_000]), { totalPaise: 6_000_000, derived: false });
});

test('without an explicit total, the category budgets are summed (what the Dashboard shows)', () => {
  assert.deepEqual(effectiveBudget(0, [100_000, 1_000_000, 1_550_000]), { totalPaise: 2_650_000, derived: true });
});

test('nothing set means 0 and not derived', () => {
  assert.deepEqual(effectiveBudget(0, []), { totalPaise: 0, derived: false });
  assert.deepEqual(effectiveBudget(0, [0, 0]), { totalPaise: 0, derived: false });
});

test('negative or invalid amounts are ignored', () => {
  assert.deepEqual(effectiveBudget(-5, [100, -50, Number.NaN]), { totalPaise: 100, derived: true });
  assert.deepEqual(effectiveBudget(Number.NaN, [200]), { totalPaise: 200, derived: true });
});
