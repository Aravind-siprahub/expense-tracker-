import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, ChartColumn, ChartPie, Tag, Wallet } from 'lucide-react';
import { api } from '../../_lib/api';
import { currentMonth, historyHref, inr, monthLabel } from '../../_lib/format';
import type { Summary } from '../../_lib/types';
import { IconTile, Loading, MonthPicker, Notice, PageHeader, Panel } from '../../_components/Shell';
import { Bars, Donut, EmptyDonut } from '../../_components/Charts';

export default function Reports() {
  const [month, setMonth] = useState(currentMonth());
  const q = useQuery({
    queryKey: ['summary', month],
    queryFn: () => api<Summary>('GET', `/summary?month=${month}`),
  });
  const s = q.data;
  const p = s?.previousMonth;
  const up = (p?.changePaise ?? 0) > 0;

  return (
    <>
      <PageHeader title="Reports" subtitle="Understand spending trends" />
      <div className="mb-5"><MonthPicker value={month} onChange={setMonth} /></div>
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && p && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
              <IconTile icon={Wallet} tone="blue" size="lg" />
              <div>
                <div className="text-sm text-slate-500">Total spent</div>
                <div className="text-2xl font-bold tracking-tight text-slate-900">{inr(s.expensesPaise)}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
              <IconTile icon={Tag} tone="purple" size="lg" />
              <div className="min-w-0">
                <div className="text-sm text-slate-500">Biggest category</div>
                <div className="truncate text-2xl font-bold tracking-tight text-slate-900">{s.byCategory[0]?.name ?? '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
              <IconTile icon={up ? ArrowUpRight : ArrowDownRight} tone={up ? 'red' : 'green'} size="lg" />
              <div>
                <div className="text-sm text-slate-500">Compared to last month</div>
                {p.expensesPaise === 0 ? (
                  <div className="mt-1 text-sm text-slate-400">No spending recorded in {monthLabel(p.month)}.</div>
                ) : (
                  <>
                    <div className={`text-2xl font-bold tracking-tight ${up ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {up ? '↑' : p.changePaise < 0 ? '↓' : ''} {inr(p.changePaise)}
                      {p.changePercent !== null && ` (${Math.abs(p.changePercent)}%)`}
                    </div>
                    <div className="text-xs text-slate-500">{monthLabel(p.month)}: {inr(p.expensesPaise)}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Category-wise spending" icon={ChartPie} tone="blue">
              {s.byCategory.length ? (
                <Donut
                  centerLabel="Total"
                  centerValue={inr(s.expensesPaise)}
                  data={s.byCategory.map((c) => ({
                    label: c.name,
                    value: c.spentPaise / 100,
                    href: historyHref({ month, categoryId: c.categoryId }),
                  }))}
                />
              ) : (
                <div className="py-4"><EmptyDonut /></div>
              )}
            </Panel>
            <Panel title="Income vs. expenses" icon={ChartColumn} tone="teal">
              <Bars
                data={[
                  { label: monthLabel(p.month), a: p.incomePaise / 100, b: p.expensesPaise / 100 },
                  { label: monthLabel(s.month), a: s.incomePaise / 100, b: s.expensesPaise / 100 },
                ]}
              />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
