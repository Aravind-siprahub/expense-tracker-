import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { markSlow, markSlowDone } from './connection';
import { TimeoutError, fetchWithTimeout } from './http';

// Where the API lives:
//  - EXPO_PUBLIC_API_URL wins when set (eas.json sets it for preview and production builds; on a real phone in
//    development set it to your computer's LAN address, e.g. http://192.168.1.5:3001).
//  - In development without it: the Android emulator reaches this computer at 10.0.2.2, iOS at localhost.
//  - In a release build without it: the live API. (Never localhost: a release build must not point at a laptop.)
const LIVE_API = 'https://family-expense-tracker-api-5l2h.onrender.com';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001') : LIVE_API);

/** The free hosting plan can need about a minute to wake up, so allow for that before giving up. */
const REQUEST_TIMEOUT_MS = 45_000;

const KEY = 'fet_token';
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function loadToken(): Promise<string | null> {
  try {
    token = await SecureStore.getItemAsync(KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function saveToken(next: string | null) {
  token = next;
  try {
    if (next) await SecureStore.setItemAsync(KEY, next);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* secure storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  // Remember whether THIS request carried a token. The saved login loads in the background at start-up, so
  // the global token can appear while a token-less request is still in flight; that request's 401 must not log the user out.
  const sentToken = token;
  let res: Response;
  try {
    let slowReported = false;
    res = await fetchWithTimeout(
      API_URL + path,
      {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(sentToken ? { authorization: `Bearer ${sentToken}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      {
        timeoutMs: REQUEST_TIMEOUT_MS,
        onSlow: () => {
          slowReported = true;
          markSlow();
        },
        onDone: () => {
          if (slowReported) markSlowDone();
        },
      },
    );
  } catch (e) {
    if (e instanceof TimeoutError) throw new ApiError(0, 'The server is taking too long to answer. Please try again in a moment.');
    throw new ApiError(0, 'Cannot reach the server. Check your internet connection and try again.');
  }
  // The server hands active users a fresh token about once a day (sliding session).
  const refreshed = res.headers.get('x-refresh-token');
  if (refreshed) await saveToken(refreshed);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  // Only our own API's "session expired" answer logs the user out.
  if (res.status === 401 && sentToken && sentToken === token && data?.code === 'SESSION_EXPIRED') onUnauthorized?.();
  if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Request failed');
  return data as T;
}
