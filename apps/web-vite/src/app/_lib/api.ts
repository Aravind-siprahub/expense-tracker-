import { createSecureStore, isNative } from '../../native';
import { browserStore, createTokenSession } from './tokenStorage';

export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) return envUrl;
  // Inside the phone app the page host is "localhost", which is the phone itself. Real builds always set
  // VITE_API_URL (the build refuses otherwise); this default only helps the Android emulator, where
  // 10.0.2.2 is the computer running it.
  if (isNative) return 'http://10.0.2.2:3001';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const proto = window.location.protocol;
    if (host.includes('-3000')) {
      return `${proto}//${host.replace('-3000', '-3001')}`;
    }
    return `${proto}//${host}:3001`;
  }
  return 'http://localhost:3001';
}

export const API_URL = getApiUrl();

const KEY = 'fet_token';

// The token is kept in memory (instant reads) and saved in the background: in the browser's storage on the
// website, in the phone's secure storage in the phone app. `initSession()` must finish before the app starts.
export const session = createTokenSession(browserStore, KEY);
export const getToken = (): string | null => session.get();
export const setToken = (token: string | null) => session.set(token);

/** Reads the saved token (from secure storage in the phone app). Call once before rendering. */
export async function initSession(): Promise<void> {
  if (isNative) {
    try {
      session.useStore(await createSecureStore());
    } catch (e) {
      console.warn('[native] secure storage unavailable, the token is kept in memory only:', e);
      session.useStore({ get: async () => null, set: async () => undefined, remove: async () => undefined });
    }
  } else if (typeof window !== 'undefined') {
    // A log in or log out in another tab changes the saved token: follow it, as reading storage live used to.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) session.adopt(e.newValue);
    });
  }
  await session.load();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let activeSlowRequests = 0;
function notifyColdStart(active: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fet:coldstart', { detail: { active } }));
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  isSafeToRetry: boolean,
): Promise<Response> {
  let timer: NodeJS.Timeout | null = null;
  let markedSlow = false;

  if (typeof window !== 'undefined') {
    timer = setTimeout(() => {
      markedSlow = true;
      activeSlowRequests++;
      notifyColdStart(true);
    }, 2000);
  }

  const cleanupTimer = () => {
    if (timer) clearTimeout(timer);
    if (markedSlow) {
      activeSlowRequests = Math.max(0, activeSlowRequests - 1);
      if (activeSlowRequests === 0) notifyColdStart(false);
    }
  };

  const maxAttempts = isSafeToRetry ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      cleanupTimer();
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isSafeToRetry) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  cleanupTimer();
  throw lastError;
}

export async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const baseUrl = getApiUrl();
  let res: Response;
  const isSafeToRetry = method === 'GET';

  try {
    res = await fetchWithRetry(
      baseUrl + path,
      {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      isSafeToRetry,
    );
  } catch {
    throw new ApiError(0, 'Connecting to your account took longer than expected. Please wait a moment and try again.');
  }

  // Sliding session refresh: update stored token if the backend provided a renewed one
  const refreshedToken = res.headers.get('x-refresh-token');
  if (refreshedToken) {
    setToken(refreshedToken);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    // Token expired or invalid: send the user back to log in.
    setToken(null);
    if (typeof window !== 'undefined') window.location.href = '/login?expired=1';
  }
  if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Request failed');
  return data as T;
}
