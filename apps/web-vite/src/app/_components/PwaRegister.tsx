import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import '../_lib/pwaInstall'; // starts listening for the browser's install offer as early as possible
import { isNative } from '../../native';

/**
 * Registers the service worker (production builds only) and offers a "Refresh" when a new
 * version of the app has been downloaded. In development it removes any worker left over from a
 * production run, so stale files never get in the way of coding.
 */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // The phone app already ships its own files, so it needs no service worker (and an offline page from
    // the website would be wrong inside it).
    if (isNative) return;
    if (!('serviceWorker' in navigator)) return;

    if (!import.meta.env.PROD) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if ('caches' in window) {
        caches.keys().then((keys) => keys.filter((k) => k.startsWith('fet-')).forEach((k) => caches.delete(k)));
      }
      return;
    }

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // A new version may already be waiting from an earlier visit.
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          next?.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) setWaiting(next);
          });
        });
        // Look for a new version whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
        });
      })
      .catch(() => undefined); // the app works fine without a service worker

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-card md:bottom-6"
    >
      <RefreshCw size={18} className="ml-1 shrink-0 text-primary-600" />
      <span className="flex-1 text-sm text-slate-700">A new version is available.</span>
      <button
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
      >
        Refresh
      </button>
    </div>
  );
}
