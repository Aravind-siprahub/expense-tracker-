'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import { currentMonth, historyHref, inr, monthLabel } from '../../_lib/format';
import type { Summary } from '../../_lib/types';
import { Loading, MonthPicker, Notice, PageHeader, Panel } from '../../_components/Shell';
import { Bars, Donut } from '../../_components/Charts';

export default function Reports() {
  const [month, setMonth] = useState(currentMonth());
  const q = useQuery({
    queryKey: ['summary', month],
    queryFn: () => api<Summary>('GET', `/summary?month=${month}`),
  });
  const s = q.data;
  const p = s?.previousMonth;

  return (
    <>
      <PageHeader title="Reports" subtitle="Understand spending trends" />
      <div className="mb-4"><MonthPicker value={month} onChange={setMonth} /></div>
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && p && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel>
              <div className="text-sm text-gray-500">Total spent</div>
              <div className="text-2xl font-bold">{inr(s.expensesPaise)}</div>
            </Panel>
            <Panel>
              <div className="text-sm text-gray-500">Biggest category</div>
              <div className="text-2xl font-bold">{s.byCategory[0]?.name ?? '—'}</div>
            </Panel>
            <Panel>
              <div className="text-sm text-gray-500">Compared to last month</div>
              {p.expensesPaise === 0 ? (
                <div className="text-sm text-gray-400">No spending recorded in {monthLabel(p.month)}.</div>
              ) : (
                <>
                  <div className={`text-2xl font-bold ${p.changePaise > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {p.changePaise > 0 ? '▲' : p.changePaise < 0 ? '▼' : ''} {inr(p.changePaise)}
                    {p.changePercent !== null && ` (${Math.abs(p.changePercent)}%)`}
                  </div>
                  <div className="text-xs text-gray-500">{monthLabel(p.month)}: {inr(p.expensesPaise)}</div>
                </>
              )}
            </Panel>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Category-wise spending">
              {s.byCategory.length ? (
                <Donut
                  data={s.byCategory.map((c) => ({
                    label: c.name,
                    value: c.spentPaise / 100,
                    href: historyHref({ month, categoryId: c.categoryId }),
                  }))}
                />
              ) : (
                <p className="text-sm text-gray-400">No expenses this month.</p>
              )}
            </Panel>
            <Panel title="Income vs. expenses">
              <Bars
                data={[
                  { label: monthLabel(p.month), a: p.incomePaise / 100, b: p.expensesPaise / 100 },
                  { label: monthLabel(s.month), a: s.incomePaise / 100, b: s.expensesPaise / 100 },
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
