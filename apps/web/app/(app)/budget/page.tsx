'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import { currentMonth, formatAmountInput, inr, toPaise, toRupeesText } from '../../_lib/format';
import type { BudgetView, Category } from '../../_lib/types';
import { Loading, MonthPicker, Notice, PageHeader, Panel, btn, input, useMe } from '../../_components/Shell';
import { Progress } from '../../_components/Charts';

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
  const totalPaise = view.data?.totalPaise ?? 0;

  return (
    <>
      <PageHeader
        title="Monthly Budget"
        subtitle={isAdmin ? 'Plan how much the family wants to spend' : 'Only the admin can change the budget'}
        action={isAdmin ? <button className={btn} onClick={submit} disabled={save.isPending}>Save Budget</button> : undefined}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} />
        <label className="text-sm text-gray-600">Total budget ₹</label>
        <input className={`${input} !w-36`} inputMode="decimal" value={total} onChange={(e) => setTotal(formatAmountInput(e.target.value))} disabled={!isAdmin} placeholder="60000" />
      </div>
      <Notice error={formError ?? save.error ?? view.error} />
      {saved && <Notice tone="success">Budget saved.</Notice>}
      {view.isLoading || cats.isLoading ? <Loading /> : (
        <>
          {totalPaise > 0 && (
            <Panel title="Total">
              <div className="mb-2 flex justify-between text-sm">
                <span>Used {inr(totalSpent)}</span>
                <span>{totalSpent > totalPaise ? `Over by ${inr(totalSpent - totalPaise)}` : `Remaining ${inr(totalPaise - totalSpent)}`}</span>
              </div>
              <Progress used={totalSpent} total={totalPaise} />
            </Panel>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {cats.data?.map((c) => {
              const budgetPaise = toPaise(amounts[c.id] ?? '') ?? 0;
              const spent = spentBy.get(c.id) ?? 0;
              const over = budgetPaise > 0 && spent > budgetPaise;
              return (
                <Panel key={c.id} className={over ? '!border-red-300' : ''}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium">{c.name}</span>
                    <input
                      className={`${input} !w-28 text-right`}
                      inputMode="decimal"
                      placeholder="0"
                      disabled={!isAdmin}
                      value={amounts[c.id] ?? ''}
                      onChange={(e) => setAmounts({ ...amounts, [c.id]: formatAmountInput(e.target.value) })}
                    />
                  </div>
                  {budgetPaise > 0 ? (
                    <>
                      <Progress used={spent} total={budgetPaise} />
                      <div className={`mt-2 text-xs ${over ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                        {over ? `Over budget by ${inr(spent - budgetPaise)}` : `Used ${inr(spent)} · Remaining ${inr(budgetPaise - spent)}`}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400">{spent > 0 ? `Spent ${inr(spent)} (no budget set)` : 'No budget set'}</div>
                  )}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
