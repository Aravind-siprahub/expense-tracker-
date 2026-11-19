import { House } from 'lucide-react';
import type { ReactNode } from 'react';

/** Centered card on the soft blue background, used by login, forgot and reset pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-nav">
            <House size={28} />
          </span>
          <div className="text-xl font-bold text-primary-800">Family Expense Tracker</div>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-card">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
