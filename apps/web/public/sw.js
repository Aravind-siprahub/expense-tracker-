/* Family Expense Tracker service worker.
 *
 * What it does:
 *   - keeps the app's static files (scripts, styles, fonts, icons) so the app starts fast
 *   - shows a friendly "You're offline" page when a page cannot be loaded
 *
 * What it NEVER does (family money data must not be stored on the device by this script):
 *   - cache or touch API calls: the API lives on another address, and anything carrying an
 *     Authorization header, any non-GET request, and any Next.js data request is left alone
 *   - cache pages (HTML): pages are always fetched fresh from the network
 *
 * Updates: a new version waits until the person taps "Refresh" in the app (SKIP_WAITING message).
 * To release a new version of this file, change VERSION.
 */
const VERSION = 'v1';
const STATIC_CACHE = `fet-static-${VERSION}`; // hashed build files and icons
const SHELL_CACHE = `fet-shell-${VERSION}`; // the offline page
// A plain HTML file with no app scripts: it is shown at whatever address was requested (e.g. /budget),
// so it must not start the Next.js app, which would try to render the wrong page.
const OFFLINE_URL = '/offline.html';
const PRECACHE_SHELL = [OFFLINE_URL];
const PRECACHE_STATIC = ['/pwa-icon/192', '/pwa-icon/512'];
const MAX_STATIC_ENTRIES = 150;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // cache: 'reload' bypasses the browser's HTTP cache so these are the current copies.
      const fresh = (urls) => urls.map((url) => new Request(url, { cache: 'reload' }));
      await (await caches.open(SHELL_CACHE)).addAll(fresh(PRECACHE_SHELL));
      await (await caches.open(STATIC_CACHE)).addAll(fresh(PRECACHE_STATIC));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches from older versions of this worker.
      const keep = [STATIC_CACHE, SHELL_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('fet-') && !keep.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/** True for requests this worker must not touch at all. */
function shouldIgnore(request, url) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true; // the API server, analytics, anything external
  if (request.headers.has('authorization')) return true;
  if (request.headers.has('range')) return true;
  // Next.js data requests (React Server Component payloads and JSON data) can be specific to a person.
  if (url.searchParams.has('_rsc') || request.headers.get('rsc') || request.headers.get('next-router-prefetch')) return true;
  if (url.pathname.startsWith('/_next/data/') || url.pathname.startsWith('/api/')) return true;
  return false;
}

/** Hashed build files never change, so the first copy can be used forever. */
const isImmutableAsset = (url) => url.pathname.startsWith('/_next/static/');
/** Icons and the manifest can change between releases, so refresh them in the background. */
const isRefreshableAsset = (url) =>
  url.pathname.startsWith('/pwa-icon/') ||
  url.pathname === '/icon' ||
  url.pathname === '/apple-icon' ||
  url.pathname === '/manifest.webmanifest';

async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]); // oldest first
}

async function remember(cache, request, response) {
  // Only store good, same-origin responses.
  if (response && response.ok && response.status === 200 && response.type === 'basic') {
    await cache.put(request, response.clone());
    await trim(cache);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  await remember(cache, request, response);
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      await remember(cache, request, response);
      return response;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

/** Pages: always from the network. Only when that fails, show the offline page. */
async function navigate(request) {
  try {
    return await fetch(request);
  } catch (err) {
    const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE });
    return offline || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (shouldIgnore(request, url)) return; // the browser handles it as if there were no worker

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
  } else if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isRefreshableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Everything else is left to the network.
});
