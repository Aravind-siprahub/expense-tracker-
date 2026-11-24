import type { DehydratedState } from '@tanstack/react-query';

// Pure rules for what is kept in the on-phone cache (no React Native imports, so plain Node tests can run them).

export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // ignore anything older than a week
export const MAX_EXPENSE_LISTS = 3; // the History tab keeps its last few lists, not every filter ever used

/** First element of the query key for the queries worth keeping. */
export const CACHED_KEYS = new Set(['me', 'summary', 'budget', 'family', 'categories', 'income', 'expenses']);

/** Choose what to save: successful queries on the allow-list, newest few expense lists only. */
export function selectForCache(state: DehydratedState): DehydratedState {
  const ok = state.queries.filter((q) => q.state.status === 'success' && CACHED_KEYS.has(String(q.queryKey[0])));
  const expenses = ok
    .filter((q) => q.queryKey[0] === 'expenses')
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(0, MAX_EXPENSE_LISTS);
  return { ...state, mutations: [], queries: [...ok.filter((q) => q.queryKey[0] !== 'expenses'), ...expenses] };
}

/** True when a saved copy is recent enough to show. */
export const isFresh = (savedAt: number, now = Date.now()) => now - savedAt <= MAX_AGE_MS;
