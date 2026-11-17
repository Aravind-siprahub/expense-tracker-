'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Share, SquarePlus, X } from 'lucide-react';
import { promptInstall, useInstall } from '../_lib/pwaInstall';
import { IconTile, Panel, btn } from './ui';

const DISMISS_KEY = 'fet_install_banner_dismissed';
const DISMISS_DAYS = 14;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** A slim banner offering to install the app. Shown only when the browser allows it; "x" hides it for 2 weeks. */
export function InstallBanner() {
  const { canInstall } = useInstall();
  const [hidden, setHidden] = useState(true); // start hidden so the server and first client render match

  useEffect(() => setHidden(recentlyDismissed()), []);

  if (!canInstall || hidden) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50/70 p-3 pr-2">
      <IconTile icon={Download} tone="blue" />
      <p className="min-w-0 flex-1 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Install the app</span>
        <span className="hidden sm:inline"> for quick access from your home screen.</span>
      </p>
      <button className={`${btn} !px-3.5 !py-2`} onClick={() => promptInstall()}>
        Install
      </button>
      <button
        aria-label="Not now"
        title="Not now"
        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {
            /* storage unavailable */
          }
          setHidden(true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** Settings panel: installs the app, or explains how on browsers that have no install button. */
export function InstallPanel() {
  const { canInstall, installed, ios } = useInstall();
  const [busy, setBusy] = useState(false);

  return (
    <Panel title="Install app" icon={Download} tone="blue">
      {installed ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={18} /> The app is installed on this device.
        </p>
      ) : canInstall ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Add Family Expense Tracker to your home screen or desktop. It opens in its own window, like a normal app.
          </p>
          <button
            className={btn}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await promptInstall();
              setBusy(false);
            }}
          >
            <Download size={16} /> Install app
          </button>
        </div>
      ) : ios ? (
        <div className="space-y-2 text-sm text-slate-600">
          <p className="text-slate-500">On iPhone and iPad, install it from Safari:</p>
          <ol className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">1</span>
              Tap <Share size={16} className="text-primary-600" /> <strong>Share</strong> at the bottom of the screen
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">2</span>
              Choose <SquarePlus size={16} className="text-primary-600" /> <strong>Add to Home Screen</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">3</span>
              Tap <strong>Add</strong>
            </li>
          </ol>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          To install, open your browser&apos;s menu and choose <strong>Install app</strong> (or{' '}
          <strong>Add to Home screen</strong>). The option appears once the app is served over HTTPS and has been opened
          for a moment. Some browsers don&apos;t support installing.
        </p>
      )}
    </Panel>
  );
}
