// Network helper kept free of React Native imports so it can be unit-tested with plain Node.

export class TimeoutError extends Error {
  timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`No answer from the server within ${Math.round(timeoutMs / 1000)} seconds`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface TimeoutOptions {
  /** Give up after this many milliseconds (the request is aborted). */
  timeoutMs: number;
  /** Called if the request is still running after `slowAfterMs` (used for the "waking up the server" banner). */
  onSlow?: () => void;
  slowAfterMs?: number;
  /** Called exactly once when the request finishes, succeeds, fails or times out. */
  onDone?: () => void;
  /** Injected for tests; defaults to the global fetch. */
  fetchImpl?: FetchLike;
}

/** `fetch` that is aborted after `timeoutMs` and reports slow requests. */
export async function fetchWithTimeout(url: string, init: RequestInit | undefined, opts: TimeoutOptions): Promise<Response> {
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const controller = new AbortController();
  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs);
  const slowTimer = opts.onSlow ? setTimeout(opts.onSlow, opts.slowAfterMs ?? 4000) : undefined;
  try {
    return await doFetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (timedOut) throw new TimeoutError(opts.timeoutMs);
    throw e;
  } finally {
    clearTimeout(killTimer);
    if (slowTimer) clearTimeout(slowTimer);
    opts.onDone?.();
  }
}
