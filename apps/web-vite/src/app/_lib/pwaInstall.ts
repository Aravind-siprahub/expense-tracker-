import { useSyncExternalStore } from 'react';

// Shared state about installing the app. The browser fires `beforeinstallprompt` once; we keep that
// event so both the install banner and the Settings panel can offer the same "Install" button.

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export interface InstallState {
  /** The browser is ready to show its install dialog (Chrome, Edge, Android, desktop). */
  canInstall: boolean;
  /** The app is already running as an installed app. */
  installed: boolean;
  /** iPhone / iPad Safari: no install dialog exists, the person must use Share -> Add to Home Screen. */
  ios: boolean;
}

const SERVER_STATE: InstallState = { canInstall: false, installed: false, ios: false };

let deferred: InstallEvent | null = null;
let state: InstallState = SERVER_STATE;
const listeners = new Set<() => void>();

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac with touch
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function update() {
  const installed = isStandalone();
  state = { canInstall: !!deferred && !installed, installed, ios: isIos() && !installed };
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  update();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the browser's mini-bar
    deferred = e as InstallEvent;
    update();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    update();
  });
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', update);
}

/** Show the browser's install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; // the event can only be used once
  update();
  return outcome === 'accepted';
}

export function useInstall(): InstallState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER_STATE,
  );
}
