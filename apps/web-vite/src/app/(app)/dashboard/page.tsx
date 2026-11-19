import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PiggyBank,
  Plus,
  Receipt,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
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
} from '../../_components/ui';
import { useMe } from '../../_components/Shell';
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
  const [alertsExpanded, setAlertsExpanded] = useState(false);
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

  const activeOverBudget = s?.overBudget.filter((o) => !(o.overByPaise <= (dismissed[alertKey(o.name)] ?? -1))) ?? [];
  const allNearBudget = s?.budgetAlerts?.nearBudget ?? s?.byCategory.filter((c) => c.budgetPaise > 0 && c.spentPaise >= c.budgetPaise * 0.8 && c.spentPaise <= c.budgetPaise) ?? [];
  // A closed "approaching the limit" notice stays closed for those categories; a category that newly
  // reaches 80% shows its own notice again.
  const nearKey = (name: string) => alertKey(`near:${name}`);
  const nearBudget = allNearBudget.filter((n) => !dismissed[nearKey(n.name)]);
  const dismissNear = () => {
    const next = { ...readDismissed() };
    for (const n of nearBudget) next[nearKey(n.name)] = 1;
    writeDismissed(next);
    setDismissed(next);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${monthLabel(month)} · ${me.data?.family?.name ?? ''}`}
        action={
          <Link to="/expenses/new" className={`${btn} hidden md:inline-flex`}>
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
          {/* Consolidated Budget Alerts */}
          {activeOverBudget.length > 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-rose-800">
                  <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                  <span className="text-sm font-semibold">
                    {activeOverBudget.length} {activeOverBudget.length === 1 ? 'category has exceeded its' : 'categories have exceeded their'} monthly budget
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAlertsExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900"
                  >
                    {alertsExpanded ? 'Hide details' : 'View details'}
                    {alertsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => activeOverBudget.forEach((o) => dismissAlert(o.name, o.overByPaise))}
                    aria-label="Dismiss"
                    title="Dismiss"
                    className="-mr-1 shrink-0 rounded-md p-1 text-rose-600 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {alertsExpanded && (
                <div className="mt-3 divide-y divide-rose-100 border-t border-rose-100 pt-2">
                  {activeOverBudget.map((o) => (
                    <div key={o.name} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="font-medium text-slate-800">{o.name}</span>
                      <span className="font-semibold text-rose-600">Over by {inr(o.overByPaise)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : nearBudget.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-800 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span>
                  <strong>{nearBudget.length}</strong> {nearBudget.length === 1 ? 'category is' : 'categories are'} approaching budget limit (&ge;80%):{' '}
                  {nearBudget.map((n) => n.name).join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/budget" className="font-semibold text-amber-900 underline">
                  Review Budget
                </Link>
                <button
                  type="button"
                  onClick={dismissNear}
                  aria-label="Dismiss"
                  title="Dismiss"
                  className="-mr-1 shrink-0 rounded-md p-1 text-amber-700 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : null}

          {/* 4 Financial Key Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Monthly Income"
              value={inr(s.incomePaise)}
              tone="green"
              icon={TrendingUp}
              hint={s.previousMonth?.incomePaise ? `vs ${inr(s.previousMonth.incomePaise)} last mo` : 'Total recorded income'}
            />
            <StatCard
              label="Monthly Expenses"
              value={inr(s.expensesPaise)}
              tone="red"
              icon={TrendingDown}
              hint={s.previousMonth?.changePercent !== null ? `${s.previousMonth.changePercent > 0 ? '+' : ''}${s.previousMonth.changePercent}% vs last mo` : 'Total spending'}
            />
            <StatCard
              label="Remaining Budget"
              value={
                s.totalBudgetPaise !== null
                  ? (s.remainingBudgetPaise !== undefined && s.remainingBudgetPaise !== null && s.remainingBudgetPaise < 0 ? '-' : '') +
                    inr(Math.abs(s.remainingBudgetPaise ?? s.totalBudgetPaise - s.expensesPaise))
                  : 'Not set'
              }
              tone={
                s.totalBudgetPaise !== null
                  ? (s.remainingBudgetPaise ?? s.totalBudgetPaise - s.expensesPaise) < 0
                    ? 'red'
                    : 'blue'
                  : 'slate'
              }
              icon={Target}
              hint={
                s.totalBudgetPaise !== null
                  ? `${Math.round((s.expensesPaise / s.totalBudgetPaise) * 100)}% of ${inr(s.totalBudgetPaise)}`
                  : 'Tap Budget to configure'
              }
            />
            <StatCard
              label="Net Savings"
              value={(s.remainingPaise < 0 ? '-' : '') + inr(Math.abs(s.remainingPaise))}
              tone={s.remainingPaise < 0 ? 'red' : 'green'}
              icon={PiggyBank}
              hint={s.savingsRate !== undefined ? `${s.savingsRate}% savings rate` : 'Income minus expenses'}
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
                      to={historyHref({ month, userId: m.userId })}
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
                  <Link to="/expenses" className="text-sm font-medium text-primary-600 hover:underline">
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
                          to={historyHref({ month, categoryId: t.categoryId })}
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
                    <Link to="/expenses/new" className={btn}>
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
