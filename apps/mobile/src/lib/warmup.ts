import { API_URL } from './api';
import { fetchWithTimeout } from './http';

// The free hosting plan puts the API to sleep when nobody has used it for a while; the first request then waits
// for it to wake up. Sending a harmless request the moment the app opens starts that wake-up while the loading screen
// is already showing. It never blocks anything and never reports an error.

let inFlight: Promise<void> | null = null;

/** Fire-and-forget request to the API's health endpoint (`GET /`). Safe to call many times: one runs at a time. */
export function warmUpServer(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = fetchWithTimeout(API_URL + '/', { method: 'GET' }, { timeoutMs: 90_000 })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
