import AsyncStorage from '@react-native-async-storage/async-storage';
import { dehydrate, hydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query';
import { isFresh, selectForCache } from './cachePolicy';

// Keeps the last successfully loaded account and dashboard data on the phone, so the next launch shows it at once
// while fresh data loads in the background (the free hosting plan can take a minute to wake up).
//
// Rules:
//  - Only successful results are saved, and only for the screens people land on (see cachePolicy.ts).
//  - A failed request never touches the cache: react-query keeps the old data when a refetch fails.
//  - Logging out (or logging in as someone else) deletes it. The data is on the phone in plain app storage, so
//    it is limited to what the first screens need and removed on log out.

const STORAGE_KEY = 'fet_query_cache_v1';

interface Stored {
  savedAt: number;
  state: DehydratedState;
}

/** Put the saved data back into the query cache. Never throws: a broken or missing cache just means a normal start. */
export async function restoreCache(qc: QueryClient): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as Stored;
    if (!stored?.state?.queries || !isFresh(stored.savedAt)) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return false;
    }
    hydrate(qc, selectForCache(stored.state));
    return true;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    return false;
  }
}

async function save(qc: QueryClient) {
  try {
    const state = selectForCache(dehydrate(qc, { shouldDehydrateQuery: (q) => q.state.status === 'success' }));
    // Never overwrite a good copy with an empty one (for example while the app is still starting up).
    if (!state.queries.some((q) => q.queryKey[0] === 'me')) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state } satisfies Stored));
  } catch {
    /* storage full or unavailable: the app works the same, it just starts without cached data next time */
  }
}

/** Save after every successful load (batched), and return a function that stops saving. */
export function startPersisting(qc: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'success') {
      clearTimeout(timer);
      timer = setTimeout(() => void save(qc), 1500);
    }
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

/** Save right now (used when the app goes to the background, so a quick close does not lose the last load). */
export const flushCache = (qc: QueryClient) => save(qc);

/** Delete the saved copy (log out, log in as someone else). */
export async function clearPersistedCache() {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}
