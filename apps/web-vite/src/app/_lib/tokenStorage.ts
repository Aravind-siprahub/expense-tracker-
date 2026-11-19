// Where the sign-in token is kept.
//
// The rest of the app asks for the token all the time and expects an instant answer (`getToken()`), but the
// phone's secure storage can only be read asynchronously. So the token is read ONCE at start-up (`load`), kept
// in memory, and written back to storage whenever it changes. This file has no Capacitor code in it, so the
// same logic is used by the website (browser storage) and the phone app (the phone's encrypted storage).

export interface AsyncStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** The browser's localStorage, wrapped so it never throws (private windows and blocked storage are normal). */
export const browserStore: AsyncStore = {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

export interface TokenSession {
  /** The current token, instantly. */
  get(): string | null;
  /** Remembers a new token (or forgets it with null), in memory now and in storage in the background. */
  set(token: string | null): void;
  /** Reads the saved token. Call once before the app starts. Never throws; gives up after `timeoutMs`. */
  load(timeoutMs?: number): Promise<string | null>;
  /** Switches where the token is saved (the phone app uses its secure storage). Call before `load`. */
  useStore(store: AsyncStore): void;
  /** Tells the session another tab changed the saved token, so a logout in one tab logs out the others. */
  adopt(token: string | null): void;
}

export function createTokenSession(initialStore: AsyncStore, key = 'fet_token'): TokenSession {
  let store = initialStore;
  let token: string | null = null;
  // Writes happen in the background, one after another, so a quick "log out, log in" cannot end up saved in the wrong order.
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (job: () => Promise<void>) => {
    queue = queue.then(job).catch(() => undefined);
  };

  return {
    get: () => token,
    set(next) {
      token = next;
      const s = store;
      enqueue(() => (next ? s.set(key, next) : s.remove(key)));
    },
    async load(timeoutMs = 3000) {
      const read = store.get(key).catch(() => null);
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const saved = await Promise.race([read, timeout]);
      // Someone may have logged in while we were reading: keep that newer token.
      if (token === null) token = saved;
      return token;
    },
    useStore(next) {
      store = next;
    },
    adopt(next) {
      token = next;
    },
  };
}
