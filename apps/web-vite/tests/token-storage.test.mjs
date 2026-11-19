// Tests for the sign-in token storage (src/app/_lib/tokenStorage.ts), which the website and the phone app share.
// Run:  corepack yarn workspace @repo/web-vite test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { browserStore, createTokenSession } from '../src/app/_lib/tokenStorage.ts';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A fake storage that records everything done to it. `delay(key, op)` lets a test make operations slow. */
function memoryStore({ delay = () => 0, failGet = false } = {}) {
  const data = new Map();
  const log = [];
  return {
    data,
    log,
    async get(key) {
      if (failGet) throw new Error('storage broke');
      await sleep(delay(key, 'get'));
      return data.has(key) ? data.get(key) : null;
    },
    async set(key, value) {
      await sleep(delay(key, 'set', value));
      log.push(['set', key, value]);
      data.set(key, value);
    },
    async remove(key) {
      await sleep(delay(key, 'remove'));
      log.push(['remove', key]);
      data.delete(key);
    },
  };
}

describe('reading the saved token', () => {
  it('has no token until it is loaded, then answers instantly', async () => {
    const store = memoryStore();
    store.data.set('fet_token', 'saved-token');
    const s = createTokenSession(store);
    assert.equal(s.get(), null, 'nothing before load');
    assert.equal(await s.load(), 'saved-token');
    assert.equal(s.get(), 'saved-token', 'afterwards it is read from memory, synchronously');
  });

  it('starts logged out when nothing is saved', async () => {
    const s = createTokenSession(memoryStore());
    assert.equal(await s.load(), null);
    assert.equal(s.get(), null);
  });

  it('never throws if the storage breaks (the app just starts logged out)', async () => {
    const s = createTokenSession(memoryStore({ failGet: true }));
    assert.equal(await s.load(), null);
  });

  it('gives up waiting for a storage that hangs, so the app still opens', async () => {
    const hanging = { get: () => new Promise(() => {}), set: async () => {}, remove: async () => {} };
    const s = createTokenSession(hanging);
    const started = Date.now();
    assert.equal(await s.load(60), null);
    assert.ok(Date.now() - started < 1000, 'returned after the short timeout');
    s.set('new'); // and the app is usable afterwards
    assert.equal(s.get(), 'new');
  });

  it('keeps a token set while the saved one was still being read (the newer login wins)', async () => {
    const store = memoryStore({ delay: () => 40 });
    store.data.set('fet_token', 'old');
    const s = createTokenSession(store);
    const loading = s.load();
    s.set('fresh');
    assert.equal(await loading, 'fresh');
    assert.equal(s.get(), 'fresh');
  });
});

describe('saving the token', () => {
  it('updates memory immediately and saves in the background', async () => {
    const store = memoryStore({ delay: () => 20 });
    const s = createTokenSession(store);
    s.set('abc');
    assert.equal(s.get(), 'abc', 'instant');
    assert.equal(store.data.has('fet_token'), false, 'not saved yet');
    await sleep(80);
    assert.equal(store.data.get('fet_token'), 'abc');
  });

  it('forgets the token on log out (null removes it from storage)', async () => {
    const store = memoryStore();
    const s = createTokenSession(store);
    s.set('abc');
    s.set(null);
    await sleep(30);
    assert.equal(s.get(), null);
    assert.equal(store.data.has('fet_token'), false);
  });

  it('saves in the order things happened, even when the storage is slow for some writes', async () => {
    // The first write is slow and the later ones are fast: without ordering, "a" could land last.
    const store = memoryStore({ delay: (_k, op, value) => (value === 'a' ? 60 : 0) });
    const s = createTokenSession(store);
    s.set('a');
    s.set(null);
    s.set('b');
    await sleep(200);
    assert.equal(store.data.get('fet_token'), 'b', 'the last token is the one that stays saved');
    assert.deepEqual(store.log.map((l) => l[0]), ['set', 'remove', 'set']);
  });

  it('survives a failing write (the next one still works)', async () => {
    let calls = 0;
    const store = {
      get: async () => null,
      set: async (_k, v) => {
        calls++;
        if (v === 'bad') throw new Error('disk full');
      },
      remove: async () => {},
    };
    const s = createTokenSession(store);
    s.set('bad');
    s.set('good');
    await sleep(30);
    assert.equal(calls, 2);
    assert.equal(s.get(), 'good');
  });

  it('uses a custom key', async () => {
    const store = memoryStore();
    const s = createTokenSession(store, 'other_key');
    s.set('x');
    await sleep(20);
    assert.equal(store.data.get('other_key'), 'x');
  });
});

describe('switching to the phone secure storage', () => {
  it('saves and reads from the new storage, not the old one', async () => {
    const browser = memoryStore();
    const secure = memoryStore();
    secure.data.set('fet_token', 'from-keystore');
    const s = createTokenSession(browser);
    s.useStore(secure);
    assert.equal(await s.load(), 'from-keystore');
    s.set('next');
    await sleep(20);
    assert.equal(secure.data.get('fet_token'), 'next');
    assert.equal(browser.data.has('fet_token'), false, 'the token never touches the browser storage');
  });
});

describe('other tabs', () => {
  it('follows a log out in another tab without writing anything back', async () => {
    const store = memoryStore();
    const s = createTokenSession(store);
    s.set('abc');
    await sleep(20);
    const writesBefore = store.log.length;
    s.adopt(null);
    assert.equal(s.get(), null);
    await sleep(20);
    assert.equal(store.log.length, writesBefore, 'adopting is not a write');
  });
});

describe('browserStore', () => {
  it('never throws when localStorage is missing or blocked', async () => {
    assert.equal(typeof globalThis.localStorage, 'undefined', 'this test runs where there is no localStorage');
    assert.equal(await browserStore.get('k'), null);
    await browserStore.set('k', 'v');
    await browserStore.remove('k');
  });

  it('reads and writes localStorage when it exists', async () => {
    const data = new Map();
    globalThis.localStorage = {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    };
    try {
      await browserStore.set('k', 'v');
      assert.equal(await browserStore.get('k'), 'v');
      await browserStore.remove('k');
      assert.equal(await browserStore.get('k'), null);
    } finally {
      delete globalThis.localStorage;
    }
  });
});
