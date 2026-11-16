import Link from 'next/link';
import type { ReactNode } from 'react';

const COLORS = [
  '#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#64748b',
];

/** A legend row; when `href` is set, tapping it opens the matching transactions. */
function LegendRow({ href, children }: { href?: string; children: ReactNode }) {
  const cls = 'flex items-center gap-2 rounded px-1 py-0.5';
  return href ? (
    <Link href={href} className={`${cls} hover:bg-gray-50`}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function Donut({
  data,
}: {
  data: { label: string; value: number; href?: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 15.9155;
  let offset = 25;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 36 36" className="h-44 w-44 shrink-0">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
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
              strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
            />
          );
          offset -= pct;
          return el;
        })}
      </svg>
      <ul className="grid flex-1 grid-cols-1 gap-1 text-sm">
        {data.map((d, i) => (
          <li key={d.label}>
            <LegendRow href={d.href}>
              <span
                className="h-3 w-3 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 truncate text-gray-600">{d.label}</span>
              <span className="font-medium">
                ₹
                {d.value.toLocaleString('en-IN', {
                  minimumFractionDigits: d.value % 1 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            </LegendRow>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Progress({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, (used / total) * 100);
  const over = used > total;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-green-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Bars({
  data,
}: {
  data: { label: string; a: number; b: number }[];
}) {
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]));
  return (
    <div>
      <div className="flex h-48 items-end gap-6">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 items-end justify-center gap-2">
            <div
              className="w-8 rounded-t bg-green-500"
              style={{ height: `${(d.a / max) * 100}%` }}
              title={`Income ₹${d.a.toLocaleString('en-IN')}`}
            />
            <div
              className="w-8 rounded-t bg-blue-600"
              style={{ height: `${(d.b / max) * 100}%` }}
              title={`Expenses ₹${d.b.toLocaleString('en-IN')}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-6">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-xs text-gray-500">
            {d.label}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs text-gray-600">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />Income</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-600" />Expenses</span>
      </div>
    </div>
  );
}
