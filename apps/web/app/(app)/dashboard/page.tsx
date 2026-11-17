'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, PiggyBank, Receipt, Tag, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { api } from '../../_lib/api';
import { currentMonth, dayLabel, historyHref, inr, METHOD_LABEL, monthLabel } from '../../_lib/format';
import type { Summary } from '../../_lib/types';
import {
  EmptyState,
  IconTile,
  Loading,
  MonthPicker,
  Notice,
  PageHeader,
  Panel,
  StatCard,
  btn,
  useMe,
} from '../../_components/Shell';
import { Donut, EmptyDonut, Progress } from '../../_components/Charts';
import { CalendarArt } from '../../_components/Illustrations';
import { categoryVisual } from '../../_components/categoryIcons';

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
            <Plus size={16} /> Add Expense
          </Link>
        }
      />
      <div className="mb-5">
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && (
        <div className="space-y-5">
          {s.overBudget.map((o) => (
            <Notice key={o.name} tone="error">
              <strong>{o.name}</strong> is over budget by {inr(o.overByPaise)}
            </Notice>
          ))}

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Income" value={inr(s.incomePaise)} tone="green" icon={TrendingUp} />
            <StatCard label="Expenses" value={inr(s.expensesPaise)} tone="red" icon={TrendingDown} />
            <StatCard
              label="Remaining Balance"
              value={(s.remainingPaise < 0 ? '-' : '') + inr(s.remainingPaise)}
              tone={s.remainingPaise < 0 ? 'red' : 'blue'}
              icon={PiggyBank}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Spending by category" icon={Tag} tone="blue">
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
                <div className="py-2">
                  <EmptyDonut label="No expenses" small />
                  <p className="mt-3 text-center text-sm text-slate-400">No expenses this month.</p>
                </div>
              )}
            </Panel>

            <Panel title="Spending by member" icon={Users} tone="purple">
              {s.byMember.length ? (
                <div className="space-y-4">
                  {s.byMember.map((m) => (
                    <Link
                      key={m.userId}
                      href={historyHref({ month, userId: m.userId })}
                      className="block rounded-xl p-2 transition hover:bg-slate-50"
                    >
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{m.name}</span>
                        <span className="font-semibold text-slate-800">{inr(m.spentPaise)}</span>
                      </div>
                      <Progress used={m.spentPaise} total={s.expensesPaise} />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} title="No spending yet" text="No expenses this month." />
              )}
            </Panel>
          </div>

          <div className={`grid gap-5 ${s.recent.length ? '' : 'lg:grid-cols-3'}`}>
            <Panel
              title="Recent transactions"
              icon={Receipt}
              tone="teal"
              className={s.recent.length ? '' : 'lg:col-span-2'}
              action={
                s.recent.length ? (
                  <Link href="/expenses" className="text-sm font-medium text-primary-600 hover:underline">
                    View all
                  </Link>
                ) : undefined
              }
            >
              {s.recent.length ? (
                <ul className="divide-y divide-slate-100">
                  {s.recent.map((t) => {
                    const { Icon, tone } = categoryVisual(t.category);
                    return (
                      <li key={t.id}>
                        <Link
                          href={historyHref({ month, categoryId: t.categoryId })}
                          className="flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-slate-50"
                        >
                          <IconTile icon={Icon} tone={tone} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800">{t.note || t.category}</div>
                            <div className="truncate text-xs text-slate-500">
                              {t.category} · {t.by} · {METHOD_LABEL[t.paymentMethod]} · {dayLabel(t.date)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-rose-600">-{inr(t.amountPaise)}</div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="Nothing yet"
                  text="Add your first expense to track spending."
                  action={
                    <Link href="/expenses/new" className={btn}>
                      <Plus size={16} /> Add Your First Expense
                    </Link>
                  }
                />
              )}
            </Panel>
            {!s.recent.length && (
              <div className="hidden items-center justify-center lg:flex">
                <CalendarArt className="h-44 w-60" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
