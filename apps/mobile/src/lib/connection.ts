import { useEffect, useState, useSyncExternalStore } from 'react';

// Tracks requests that are taking unusually long, so the app can tell the person the server is waking up
// (the free hosting plan puts the API to sleep after a while; the first request then takes up to a minute).

let slowCount = 0;
/** When the current slow spell began (the first slow request), or null when nothing is slow. */
let slowSince: number | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const markSlow = () => {
  if (slowCount === 0) slowSince = Date.now();
  slowCount += 1;
  emit();
};
export const markSlowDone = () => {
  slowCount = Math.max(0, slowCount - 1);
  if (slowCount === 0) slowSince = null;
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => slowCount > 0;
const sinceSnapshot = () => slowSince;

/** True while at least one request has been running for more than a few seconds. */
export const useSlowConnection = () => useSyncExternalStore(subscribe, snapshot, snapshot);

/** Milliseconds the connection has been slow (0 when it is not), updating every second. */
export function useSlowElapsedMs(): number {
  const since = useSyncExternalStore(subscribe, sinceSnapshot, sinceSnapshot);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  return since === null ? 0 : Math.max(0, now - since);
}

/** When the current wait began: app launch, or the last time the person pressed Retry. */
let waitStart = Date.now();
export const restartWait = () => {
  waitStart = Date.now();
};

/** Milliseconds the person has waited since launch (or the last Retry), updating every second while `active`. */
export function useWaitElapsedMs(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Math.max(0, now - waitStart);
}
