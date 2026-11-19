import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Gauge } from 'lucide-react';
import { api } from '../../_lib/api';
import { currentMonth, formatAmountInput, inr, toPaise, toRupeesText } from '../../_lib/format';
import type { BudgetView, Category } from '../../_lib/types';
import { IconTile, Loading, MonthPicker, Notice, PageHeader, Panel, btn, input, useMe } from '../../_components/Shell';
import { Progress, Ring } from '../../_components/Charts';
import { categoryVisual } from '../../_components/categoryIcons';

export default function Budget() {
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [month, setMonth] = useState(currentMonth());
  const [total, setTotal] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const view = useQuery({
    queryKey: ['budget', month],
    queryFn: () => api<BudgetView>('GET', `/budgets?month=${month}`),
    // No auto-refresh here: it would overwrite the amounts the admin is typing.
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Load saved values into the inputs whenever the month's data arrives.
  useEffect(() => {
    if (!view.data) return;
    setTotal(view.data.totalPaise ? toRupeesText(view.data.totalPaise) : '');
    setAmounts(
      Object.fromEntries(
        view.data.categories.filter((c) => c.budgetPaise > 0).map((c) => [c.categoryId, toRupeesText(c.budgetPaise)]),
      ),
    );
    setSaved(false);
  }, [view.data]);

  const save = useMutation({
    mutationFn: (body: object) => api('PUT', '/budgets', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      setSaved(true);
    },
  });

  function submit() {
    setFormError(null);
    const parseAmt = (t: string | undefined): number | null => (t?.trim() ? toPaise(t) : 0);
    const totalPaise = parseAmt(total);
    if (totalPaise === null) return setFormError('Total budget must be a positive number');
    const categories: { categoryId: string; amountPaise: number }[] = [];
    for (const c of cats.data ?? []) {
      const p = parseAmt(amounts[c.id]);
      if (p === null) return setFormError(`Budget for ${c.name} must be a positive number`);
      categories.push({ categoryId: c.id, amountPaise: p });
    }
    save.mutate({ month, totalPaise, categories });
  }

  const spentBy = new Map(view.data?.categories.map((c) => [c.categoryId, c.spentPaise]));
  const totalSpent = view.data?.categories.reduce((s, c) => s + c.spentPaise, 0) ?? 0;
  const totalPaise = toPaise(total) ?? 0;
  const percent = totalPaise > 0 ? (totalSpent / totalPaise) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Monthly Budget"
        subtitle={isAdmin ? 'Plan how much the family wants to spend' : 'Only the admin can change the budget'}
        action={
          isAdmin ? (
            <button className={btn} onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save Budget'}
            </button>
          ) : undefined
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} />
        <label className="text-sm text-slate-500">Total budget ₹</label>
        <input
          className={`${input} !w-40`}
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(formatAmountInput(e.target.value))}
          disabled={!isAdmin}
          placeholder="60,000"
        />
      </div>
      <Notice error={formError ?? save.error ?? view.error} />
      {saved && (
        <Notice tone="success">
          <span className="flex items-center gap-2"><Check size={16} /> Budget saved.</span>
        </Notice>
      )}

      {view.isLoading || cats.isLoading ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Budget Utilization" icon={Gauge} tone="blue" className="lg:col-span-1">
            <div className="flex flex-col items-center gap-5 py-2 sm:flex-row lg:flex-col xl:flex-row">
              <Ring percent={percent} over={totalPaise > 0 && totalSpent > totalPaise} />
              <dl className="w-full space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Spent</dt>
                  <dd className="text-lg font-bold text-rose-600">{inr(totalSpent)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total Budget</dt>
                  <dd className="text-lg font-bold text-slate-900">{inr(totalPaise)}</dd>
                </div>
                {totalPaise > 0 && (
                  <div className={`text-xs ${totalSpent > totalPaise ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                    {totalSpent > totalPaise
                      ? `Over by ${inr(totalSpent - totalPaise)}`
                      : `${inr(totalPaise - totalSpent)} remaining`}
                  </div>
                )}
              </dl>
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {cats.data?.map((c) => {
              const budgetPaise = toPaise(amounts[c.id] ?? '') ?? 0;
              const spent = spentBy.get(c.id) ?? 0;
              const over = budgetPaise > 0 && spent > budgetPaise;
              const pct = budgetPaise > 0 ? (spent / budgetPaise) * 100 : 0;
              const nearLimit = pct >= 80 && !over;
              const { Icon, tone } = categoryVisual(c.name);
              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border bg-white p-3.5 shadow-card transition ${
                    over
                      ? 'border-rose-300 bg-rose-50/20'
                      : nearLimit
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconTile icon={Icon} tone={tone} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-500">{inr(spent)} spent</div>
                    </div>
                    <div className="relative w-28">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                      <input
                        className={`${input} !px-2 !py-1.5 !pl-6 text-right text-sm`}
                        inputMode="decimal"
                        placeholder="0"
                        disabled={!isAdmin}
                        value={amounts[c.id] ?? ''}
                        onChange={(e) => setAmounts({ ...amounts, [c.id]: formatAmountInput(e.target.value) })}
                      />
                    </div>
                  </div>
                  {budgetPaise > 0 && (
                    <div className="mt-3">
                      <Progress used={spent} total={budgetPaise} />
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className={over ? 'font-semibold text-rose-600' : nearLimit ? 'font-semibold text-amber-600' : 'text-slate-500'}>
                          {over
                            ? `Over budget by ${inr(spent - budgetPaise)}`
                            : nearLimit
                            ? `80%+ used (${inr(budgetPaise - spent)} left)`
                            : `${inr(budgetPaise - spent)} remaining`}
                        </span>
                        <span className={`font-mono text-[11px] ${over ? 'text-rose-600' : nearLimit ? 'text-amber-600' : 'text-slate-400'}`}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
