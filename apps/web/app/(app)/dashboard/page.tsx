'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

// Budget alerts the person has closed are remembered in this browser, so a refresh does not bring
// them back. Each is stored with the overspend it was closed at: it returns only if spending gets worse.
const DISMISSED_KEY = 'fet_dismissed_budget_alerts';
type Dismissed = Record<string, number>;

function readDismissed(): Dismissed {
  try {
    const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function writeDismissed(next: Dismissed) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the alert simply returns after a refresh */
  }
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [dismissed, setDismissed] = useState<Dismissed>({});
  useEffect(() => setDismissed(readDismissed()), []);
  const me = useMe();
  const familyId = me.data?.family?.id ?? 'none';
  const alertKey = (name: string) => `${familyId}:${month}:${name}`;
  const dismissAlert = (name: string, overByPaise: number) => {
    const next = { ...readDismissed(), [alertKey(name)]: overByPaise };
    writeDismissed(next);
    setDismissed(next);
  };
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
          {s.overBudget
            .filter((o) => !(o.overByPaise <= (dismissed[alertKey(o.name)] ?? -1)))
            .map((o) => (
              <Notice key={`${month}:${o.name}`} tone="error" onDismiss={() => dismissAlert(o.name, o.overByPaise)}>
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
