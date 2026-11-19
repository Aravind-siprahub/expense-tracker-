import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];

const money = (v: number) =>
  '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });

/** 1,50,000 -> "1.5L", 12,000 -> "12K". Used on chart axes. */
const compact = (v: number) => {
  if (v >= 10_000_000) return `${+(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `${+(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}K`;
  return String(v);
};

/** A legend row; when `href` is set, tapping it opens the matching transactions. */
function LegendRow({ href, children }: { href?: string; children: ReactNode }) {
  const cls = 'flex items-center gap-2 rounded-lg px-1.5 py-1';
  return href ? (
    <Link to={href} className={`${cls} transition hover:bg-slate-50`}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function Donut({
  data,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; href?: string }[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 15.9155;
  let offset = 25;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#eef2ff" strokeWidth="3.6" />
          {data.map((d, i) => {
            const pct = (d.value / total) * 100;
            const el = (
              <circle
                key={d.label}
                cx="18"
                cy="18"
                r={r}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="3.6"
                strokeDasharray={`${Math.max(pct - 0.6, 0)} ${100 - Math.max(pct - 0.6, 0)}`}
                strokeDashoffset={offset}
              />
            );
            offset -= pct;
            return el;
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel && <span className="text-[11px] text-slate-400">{centerLabel}</span>}
            {centerValue && <span className="text-base font-bold text-slate-800">{centerValue}</span>}
          </div>
        )}
      </div>
      <ul className="grid w-full flex-1 grid-cols-1 gap-0.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label}>
            <LegendRow href={d.href}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="flex-1 truncate text-slate-600">{d.label}</span>
              <span className="font-medium text-slate-800">{money(d.value)}</span>
            </LegendRow>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** An empty ring, shown when there is nothing to chart yet. */
export function EmptyDonut({ label = 'No data', small = false }: { label?: string; small?: boolean }) {
  return (
    <div className={`relative mx-auto ${small ? 'h-32 w-32' : 'h-44 w-44'}`}>
      <svg viewBox="0 0 36 36" className="h-full w-full">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e0ecff" strokeWidth="3.6" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">{label}</div>
    </div>
  );
}

/** Percentage ring, for example budget used. */
export function Ring({ percent, over }: { percent: number; over?: boolean }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = 15.9155;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e8f0fe" strokeWidth="3.4" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={over ? '#f43f5e' : p > 85 ? '#f59e0b' : '#2563eb'}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray={`${p} ${100 - p}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-800">
        {Math.round(percent)}%
      </div>
    </div>
  );
}

export function Progress({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const over = total > 0 && used > total;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-primary-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Income vs expenses, grouped bars with a labelled axis. Values are in rupees. */
export function Bars({ data }: { data: { label: string; a: number; b: number }[] }) {
  const maxRaw = Math.max(...data.flatMap((d) => [d.a, d.b]), 0);
  // Round the top of the axis up to a tidy number so gridlines read well.
  const step = maxRaw <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const top = maxRaw <= 0 ? 4 : Math.ceil(maxRaw / step) * step;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);
  const empty = maxRaw <= 0;

  return (
    <div>
      <div className="flex">
        <div className="flex h-48 w-10 shrink-0 flex-col justify-between pr-2 text-right text-[11px] text-slate-400">
          {ticks.map((t) => (
            <span key={t}>{empty ? '' : compact(t)}</span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 border-t border-dashed border-slate-100" style={{ top: `${(i / 4) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around px-2">
            {data.map((d) => (
              <div key={d.label} className="flex h-full items-end gap-2">
                <div
                  className="w-7 rounded-t-md bg-emerald-400"
                  style={{ height: `${(d.a / top) * 100}%` }}
                  title={`Income ${money(d.a)}`}
                />
                <div
                  className="w-7 rounded-t-md bg-primary-600"
                  style={{ height: `${(d.b / top) * 100}%` }}
                  title={`Expenses ${money(d.b)}`}
                />
              </div>
            ))}
          </div>
          {empty && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">No data to display</div>}
        </div>
      </div>
      <div className="ml-10 mt-2 flex justify-around text-xs text-slate-500">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-5 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />Income</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-primary-600" />Expenses</span>
      </div>
    </div>
  );
}
