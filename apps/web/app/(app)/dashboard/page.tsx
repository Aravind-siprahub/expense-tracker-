'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import { currentMonth, dayLabel, historyHref, inr, METHOD_LABEL, monthLabel } from '../../_lib/format';
import type { Summary } from '../../_lib/types';
import { Loading, MonthPicker, Notice, PageHeader, Panel, btn, useMe } from '../../_components/Shell';
import { Donut, Progress } from '../../_components/Charts';

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const me = useMe();
  const q = useQuery({
    queryKey: ['summary', month],
    queryFn: () => api<Summary>('GET', `/summary?month=${month}`),
  });
  const s = q.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${monthLabel(month)} · ${me.data?.family?.name ?? ''}`}
        action={
          <Link href="/expenses/new" className={`${btn} hidden md:inline-flex`}>
            + Add Expense
          </Link>
        }
      />
      <div className="mb-4">
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && (
        <>
          {s.overBudget.map((o) => (
            <Notice key={o.name} tone="error">
              ⚠️ {o.name} is over budget by {inr(o.overByPaise)}
            </Notice>
          ))}

          <div className="grid gap-4 sm:grid-cols-3">
            <Panel>
              <div className="text-sm text-gray-500">Income</div>
              <div className="mt-1 text-3xl font-bold text-green-600">{inr(s.incomePaise)}</div>
            </Panel>
            <Panel>
              <div className="text-sm text-gray-500">Expenses</div>
              <div className="mt-1 text-3xl font-bold text-red-600">{inr(s.expensesPaise)}</div>
            </Panel>
            <Panel>
              <div className="text-sm text-gray-500">Remaining Balance</div>
              <div className={`mt-1 text-3xl font-bold ${s.remainingPaise < 0 ? 'text-red-600' : 'text-primary-700'}`}>
                {s.remainingPaise < 0 ? '-' : ''}
                {inr(s.remainingPaise)}
              </div>
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Spending by category">
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
            <Panel title="Spending by member">
              {s.byMember.length ? (
                <div className="space-y-4">
                  {s.byMember.map((m) => (
                    <Link key={m.userId} href={historyHref({ month, userId: m.userId })} className="block rounded hover:bg-gray-50">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{m.name}</span>
                        <span className="font-medium">{inr(m.spentPaise)}</span>
                      </div>
                      <Progress used={m.spentPaise} total={s.expensesPaise} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No expenses this month.</p>
              )}
            </Panel>
          </div>

          <Panel title="Recent transactions" className="mt-4">
            {s.recent.length ? (
              <ul className="divide-y divide-gray-100">
                {s.recent.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={historyHref({ month, categoryId: t.categoryId })}
                      className="flex items-center justify-between py-3 text-sm hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">{t.note || t.category}</div>
                        <div className="text-xs text-gray-500">
                          {t.category} · {t.by} · {METHOD_LABEL[t.paymentMethod]} · {dayLabel(t.date)}
                        </div>
                      </div>
                      <div className="font-semibold text-red-600">-{inr(t.amountPaise)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">
                Nothing yet. <Link href="/expenses/new" className="text-primary-600 hover:underline">Add your first expense</Link>.
              </p>
            )}
            <Link href="/expenses" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
              View all →
            </Link>
          </Panel>
        </>
      )}
    </>
  );
}
