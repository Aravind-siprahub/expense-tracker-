export function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl;
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

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
};

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
  const token = getToken();
  const baseUrl = getApiUrl();
  let res: Response;
  try {
    res = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    // Token expired or invalid: send the user back to log in.
    setToken(null);
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  if (!res.ok) throw new ApiError(res.status, data?.message ?? 'Request failed');
  return data as T;
}
