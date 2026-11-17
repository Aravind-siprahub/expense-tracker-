// Tests for public/sw.js. The worker is loaded into a sandbox with a fake Cache Storage and a fake
// network, so we can check exactly what it caches and what it leaves alone.
//
// Run:  corepack yarn workspace @repo/web test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const ORIGIN = 'http://localhost:3000';
const abs = (u) => new URL(typeof u === 'string' ? u : u.url, ORIGIN).href;

/** A same-origin response, as a browser would hand to the worker. */
const basic = (body = 'ok', status = 200) => {
  const res = new Response(body, { status });
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
};

function createWorker({ network } = {}) {
  const listeners = {};
  const store = new Map(); // cache name -> Map(url -> Response)
  const calls = []; // every URL that went to the network
  let skipped = false;

  const fetchImpl = async (req) => {
    calls.push(abs(req));
    if (network) return network(req);
    return basic('network:' + abs(req));
  };

  const makeCache = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      async match(req) {
        return m.get(abs(req))?.clone();
      },
      async put(req, res) {
        m.set(abs(req), res);
      },
      async addAll(reqs) {
        for (const r of reqs) m.set(abs(r), await fetchImpl(r));
      },
      async keys() {
        return [...m.keys()].map((url) => ({ url }));
      },
      async delete(req) {
        return m.delete(abs(req));
      },
    };
  };

  const caches = {
    async open(name) {
      return makeCache(name);
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name) {
      return store.delete(name);
    },
    async match(req, opts) {
      const names = opts?.cacheName ? [opts.cacheName] : [...store.keys()];
      for (const n of names) {
        const hit = store.get(n)?.get(abs(req));
        if (hit) return hit.clone();
      }
      return undefined;
    },
  };

  class SWRequest extends Request {
    constructor(input, init) {
      super(typeof input === 'string' ? new URL(input, ORIGIN).href : input, init);
    }
  }

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => (listeners[type] = fn),
    clients: { claim: async () => undefined },
    skipWaiting: () => (skipped = true),
  };
  vm.runInNewContext(SOURCE, { self, caches, fetch: fetchImpl, Request: SWRequest, Response, URL, Headers, Promise });

  const allCachedUrls = () => [...store.values()].flatMap((m) => [...m.keys()]);

  return {
    store,
    calls,
    allCachedUrls,
    skipped: () => skipped,
    async install() {
      let p;
      listeners.install({ waitUntil: (x) => (p = x) });
      await p;
    },
    async activate() {
      let p;
      listeners.activate({ waitUntil: (x) => (p = x) });
      await p;
    },
    message(data) {
      listeners.message({ data });
    },
    /** Returns the Response the worker produced, or undefined if it left the request alone. */
    async fetch(url, { method = 'GET', mode = 'cors', headers = {} } = {}) {
      const request = { url: abs(url), method, mode, headers: new Headers(headers) };
      let responded;
      listeners.fetch({ request, respondWith: (p) => (responded = p) });
      return responded ? await responded : undefined;
    },
  };
}

describe('requests the worker must leave alone (family data is never touched)', () => {
  const cases = [
    ['a POST', '/expenses', { method: 'POST' }],
    ['the API on another address', 'http://localhost:3001/expenses?month=2026-11', {}],
    ['the API on another address (summary)', 'http://localhost:3001/summary', {}],
    ['a request with an Authorization header', '/anything', { headers: { Authorization: 'Bearer secret' } }],
    ['a Next.js data request (?_rsc)', '/dashboard?_rsc=abc12', {}],
    ['a Next.js data request (RSC header)', '/dashboard', { headers: { RSC: '1' } }],
    ['a Next.js router prefetch', '/dashboard', { headers: { 'Next-Router-Prefetch': '1' } }],
    ['Next.js JSON data', '/_next/data/build/dashboard.json', {}],
    ['a same-origin /api path', '/api/anything', {}],
    ['a range request', '/_next/static/video.mp4', { headers: { Range: 'bytes=0-10' } }],
    ['some other same-origin file', '/data/export.json', {}],
    ['an image from another site', 'https://example.org/logo.png', {}],
  ];
  for (const [name, url, opts] of cases) {
    it(`ignores ${name}`, async () => {
      const w = createWorker();
      await w.install();
      const before = w.calls.length;
      const result = await w.fetch(url, opts);
      assert.equal(result, undefined, 'must not respond');
      assert.equal(w.calls.length, before, 'must not call the network itself');
      assert.ok(!w.allCachedUrls().some((u) => u.includes('3001')), 'API URLs are never cached');
    });
  }
});

describe('pages (HTML)', () => {
  it('are fetched fresh from the network and never stored', async () => {
    const w = createWorker();
    await w.install();
    const res = await w.fetch('/dashboard', { mode: 'navigate' });
    assert.equal(await res.text(), 'network:' + ORIGIN + '/dashboard');
    assert.ok(!w.allCachedUrls().some((u) => u.endsWith('/dashboard')), 'the dashboard page must not be cached');
  });

  it('show the offline page when the network is down', async () => {
    let up = true;
    const w = createWorker({
      network: (req) => {
        if (!up) throw new TypeError('Failed to fetch');
        return basic(abs(req).endsWith('/offline.html') ? 'OFFLINE PAGE' : 'page');
      },
    });
    await w.install(); // the offline page is saved while there is still a connection
    up = false;
    const res = await w.fetch('/budget', { mode: 'navigate' });
    assert.equal(await res.text(), 'OFFLINE PAGE');
  });

  it('give a plain message if even the offline page is missing', async () => {
    const w = createWorker({ network: () => { throw new TypeError('down'); } });
    const res = await w.fetch('/budget', { mode: 'navigate' });
    assert.equal(res.status, 503);
  });
});

describe('static files', () => {
  it('build files are cached after the first load and then served without the network', async () => {
    const w = createWorker();
    await w.install();
    const url = '/_next/static/chunks/app-abc123.js';
    const before = w.calls.length;
    const first = await w.fetch(url);
    assert.equal(await first.text(), 'network:' + ORIGIN + url);
    assert.equal(w.calls.length, before + 1);
    const second = await w.fetch(url);
    assert.equal(await second.text(), 'network:' + ORIGIN + url);
    assert.equal(w.calls.length, before + 1, 'second load came from the cache');
  });

  it('icons and the manifest are served from the cache while refreshing in the background', async () => {
    let version = 1;
    const w = createWorker({ network: () => basic('icon v' + version) });
    await w.install();
    version = 2;
    const stale = await w.fetch('/pwa-icon/192');
    assert.equal(await stale.text(), 'icon v1', 'cached copy returned immediately');
    await new Promise((r) => setTimeout(r, 10));
    const fresh = await w.fetch('/pwa-icon/192');
    assert.equal(await fresh.text(), 'icon v2', 'the background refresh updated it');
  });

  it('does not store failed responses', async () => {
    const w = createWorker({ network: () => basic('missing', 404) });
    await w.fetch('/_next/static/chunks/gone.js');
    assert.ok(!w.allCachedUrls().some((u) => u.includes('gone.js')));
  });

  it('keeps the cache from growing forever', async () => {
    const w = createWorker();
    await w.install();
    for (let i = 0; i < 170; i++) await w.fetch(`/_next/static/chunks/file-${i}.js`);
    const staticCache = [...w.store.entries()].find(([name]) => name.startsWith('fet-static'))[1];
    assert.ok(staticCache.size <= 150, `kept ${staticCache.size}`);
  });
});

describe('lifecycle', () => {
  it('saves the offline page when installed', async () => {
    const w = createWorker();
    await w.install();
    assert.ok(w.allCachedUrls().includes(ORIGIN + '/offline.html'));
  });

  it('removes caches from old versions but nothing else', async () => {
    const w = createWorker();
    await w.install();
    w.store.set('fet-static-v0', new Map([[ORIGIN + '/old.js', basic()]]));
    w.store.set('other-app-cache', new Map());
    await w.activate();
    const names = [...w.store.keys()];
    assert.ok(!names.includes('fet-static-v0'), 'old version removed');
    assert.ok(names.includes('other-app-cache'), 'caches that are not ours are left alone');
    assert.ok(names.some((n) => n.startsWith('fet-shell')), 'current caches kept');
  });

  it('a new version waits until told to take over', async () => {
    const w = createWorker();
    assert.equal(w.skipped(), false);
    await w.install();
    assert.equal(w.skipped(), false, 'install alone must not take over');
    w.message({ type: 'SOMETHING_ELSE' });
    assert.equal(w.skipped(), false);
    w.message({ type: 'SKIP_WAITING' });
    assert.equal(w.skipped(), true);
  });
});

describe('overall: nothing sensitive can end up in the cache', () => {
  it('after a mixed session only static files, icons and the offline page are stored', async () => {
    const w = createWorker();
    await w.install();
    const traffic = [
      ['/dashboard', { mode: 'navigate' }],
      ['/expenses?from=2026-11-01', { mode: 'navigate' }],
      ['http://localhost:3001/expenses', {}],
      ['http://localhost:3001/payment-methods', { headers: { Authorization: 'Bearer x' } }],
      ['/dashboard?_rsc=1', {}],
      ['/_next/static/chunks/a.js', {}],
      ['/pwa-icon/512', {}],
      ['/manifest.webmanifest', {}],
      ['/expenses', { method: 'POST' }],
    ];
    for (const [url, opts] of traffic) await w.fetch(url, opts);
    for (const u of w.allCachedUrls()) {
      assert.ok(
        /\/_next\/static\//.test(u) || /\/pwa-icon\//.test(u) || /\/manifest\.webmanifest$/.test(u) || u.endsWith('/offline.html'),
        `unexpected cached URL: ${u}`,
      );
    }
  });
});
