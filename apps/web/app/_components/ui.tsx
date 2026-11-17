'use client';

import { CalendarDays, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

// ── Buttons and inputs ───────────────────────────────────────────────────────

export const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';
export const input =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-slate-500';
export const labelCls = 'mb-1.5 block text-xs font-medium text-slate-500';

export function Label({ children }: { children: ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

// ── Icon tiles ───────────────────────────────────────────────────────────────

export type Tone = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'slate' | 'teal';

const TONES: Record<Tone, { tile: string; text: string; card: string }> = {
  blue: { tile: 'bg-blue-50 text-blue-600', text: 'text-blue-600', card: 'from-blue-50' },
  green: { tile: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', card: 'from-emerald-50' },
  red: { tile: 'bg-rose-50 text-rose-500', text: 'text-rose-600', card: 'from-rose-50' },
  amber: { tile: 'bg-amber-50 text-amber-600', text: 'text-amber-600', card: 'from-amber-50' },
  purple: { tile: 'bg-violet-50 text-violet-600', text: 'text-violet-600', card: 'from-violet-50' },
  teal: { tile: 'bg-teal-50 text-teal-600', text: 'text-teal-600', card: 'from-teal-50' },
  slate: { tile: 'bg-slate-100 text-slate-500', text: 'text-slate-600', card: 'from-slate-50' },
};

export function IconTile({
  icon: Icon,
  tone = 'blue',
  size = 'md',
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  const ico = { sm: 16, md: 20, lg: 24 }[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box} ${TONES[tone].tile}`}>
      <Icon size={ico} strokeWidth={2} />
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

// ── Layout pieces ────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-8 tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({
  title,
  icon,
  tone = 'blue',
  action,
  children,
  className = '',
}: {
  title?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && <IconTile icon={icon} tone={tone} size="sm" />}
            {title && <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br ${TONES[tone].card} via-white to-white p-5 shadow-card`}
    >
      <IconTile icon={icon} tone={tone} size="lg" />
      <div className="min-w-0">
        <div className="text-sm text-slate-500">{label}</div>
        <div className={`truncate text-[28px] font-bold leading-9 tracking-tight ${TONES[tone].text}`}>{value}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  art,
  icon: Icon,
  title,
  text,
  action,
}: {
  art?: ReactNode;
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      {art ?? (Icon && <IconTile icon={Icon} tone="blue" size="lg" />)}
      <div className="mt-3 text-sm font-semibold text-slate-800">{title}</div>
      {text && <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export function Notice({
  error,
  tone = 'error',
  children,
}: {
  error?: unknown;
  tone?: 'error' | 'success' | 'warn';
  children?: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const message =
    typeof error === 'string' && error
      ? error
      : error instanceof Error
        ? error.message
        : error
          ? 'Something went wrong'
          : null;
  const hasContent = children != null || message != null;

  // Show the alert again when a new one arrives: once the old content is gone, forget the dismissal.
  useEffect(() => {
    if (!hasContent) setHidden(false);
  }, [hasContent]);

  if (!hasContent || hidden) return null;
  const color = {
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
  }[tone];
  return (
    <div role="alert" className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${color}`}>
      <div className="min-w-0 flex-1">{children ?? message}</div>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Dismiss"
        title="Dismiss"
        className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
    </div>
  );
}

// ── Month picker: a pill with a calendar icon and the native month input ────

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <CalendarDays size={16} className="text-slate-400" />
      <input
        type="month"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-slate-700 outline-none"
      />
    </label>
  );
}
