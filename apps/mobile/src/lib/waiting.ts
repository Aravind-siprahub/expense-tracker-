// How long the person has been waiting for the server, turned into what the screen should say.
// Plain functions with no React Native imports, so they can be unit-tested.

export const WAKING_AFTER_MS = 15_000; // "Server is waking up. This may take a moment."
export const RETRY_AFTER_MS = 40_000; // show a Retry button

export type WaitStage = 'normal' | 'waking' | 'retry';

export function waitStage(elapsedMs: number): WaitStage {
  if (elapsedMs >= RETRY_AFTER_MS) return 'retry';
  if (elapsedMs >= WAKING_AFTER_MS) return 'waking';
  return 'normal';
}

export const WAKING_MESSAGE = 'Server is waking up. This may take a moment.';
