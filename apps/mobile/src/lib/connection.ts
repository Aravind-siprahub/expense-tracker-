import { useSyncExternalStore } from 'react';

// Tracks requests that are taking unusually long, so the app can tell the person the server is waking up
// (the free hosting plan puts the API to sleep after a while; the first request then takes up to a minute).

let slowCount = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const markSlow = () => {
  slowCount += 1;
  emit();
};
export const markSlowDone = () => {
  slowCount = Math.max(0, slowCount - 1);
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => slowCount > 0;

/** True while at least one request has been running for more than a few seconds. */
export const useSlowConnection = () => useSyncExternalStore(subscribe, snapshot, snapshot);
