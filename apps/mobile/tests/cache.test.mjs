import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_AGE_MS, MAX_EXPENSE_LISTS, isFresh, selectForCache } from '../src/lib/cachePolicy.ts';
import { RETRY_AFTER_MS, WAKING_AFTER_MS, waitStage } from '../src/lib/waiting.ts';

const q = (key, status = 'success', dataUpdatedAt = 1) => ({ queryKey: key, queryHash: JSON.stringify(key), state: { status, dataUpdatedAt, data: { k: key } } });
const state = (queries) => ({ mutations: [{ x: 1 }], queries });

test('only successful queries on the allow-list are saved', () => {
  const out = selectForCache(
    state([q(['me']), q(['summary', '2026-11']), q(['budget', '2026-11']), q(['family']), q(['categories']), q(['income', '2026-11']), q(['payment-methods']), q(['expense', 'abc']), q(['invites'])]),
  );
  assert.deepEqual(out.queries.map((x) => x.queryKey[0]).sort(), ['budget', 'categories', 'family', 'income', 'me', 'summary']);
});

test('a failed or still-loading query is never saved, so a failure cannot overwrite good data', () => {
  const out = selectForCache(state([q(['me'], 'error'), q(['summary', 'm'], 'pending'), q(['family'])]));
  assert.deepEqual(out.queries.map((x) => x.queryKey[0]), ['family']);
});

test('pending mutations are never saved', () => {
  assert.deepEqual(selectForCache(state([q(['me'])])).mutations, []);
});

test('only the newest few expense lists are kept', () => {
  const lists = [1, 2, 3, 4, 5].map((n) => q(['expenses', `f${n}`], 'success', n));
  const out = selectForCache(state([q(['me']), ...lists]));
  const kept = out.queries.filter((x) => x.queryKey[0] === 'expenses').map((x) => x.state.dataUpdatedAt);
  assert.equal(kept.length, MAX_EXPENSE_LISTS);
  assert.deepEqual(kept, [5, 4, 3]);
});

test('a saved copy older than a week is not used', () => {
  const now = 10 * MAX_AGE_MS;
  assert.equal(isFresh(now - 1000, now), true);
  assert.equal(isFresh(now - MAX_AGE_MS, now), true);
  assert.equal(isFresh(now - MAX_AGE_MS - 1, now), false);
});

test('waiting stages: normal, then "waking up" at 15s, then Retry at 40s', () => {
  assert.equal(WAKING_AFTER_MS, 15_000);
  assert.equal(RETRY_AFTER_MS, 40_000);
  assert.equal(waitStage(0), 'normal');
  assert.equal(waitStage(14_999), 'normal');
  assert.equal(waitStage(15_000), 'waking');
  assert.equal(waitStage(39_999), 'waking');
  assert.equal(waitStage(40_000), 'retry');
  assert.equal(waitStage(120_000), 'retry');
});
