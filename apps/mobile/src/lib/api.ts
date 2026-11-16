import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Android emulator reaches the host machine at 10.0.2.2. On a real phone set
// EXPO_PUBLIC_API_URL to your computer's LAN address (e.g. http://192.168.1.5:3001).
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');

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
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your internet and the API address.');
  }
  // The server hands active users a fresh token about once a day (sliding session).
  const refreshed = res.headers.get('x-refresh-token');
  if (refreshed) await saveToken(refreshed);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  // Only our own API's "session expired" answer logs the user out.
  if (res.status === 401 && token && data?.code === 'SESSION_EXPIRED') onUnauthorized?.();
  if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Request failed');
  return data as T;
}
