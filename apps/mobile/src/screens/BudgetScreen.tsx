import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { currentMonth, formatAmountInput, inr, toPaise, toRupeesText } from '../lib/format';
import type { BudgetView, Category } from '../lib/types';
import { Bar, Btn, Field, Loading, MonthSwitcher, Notice, Panel, Screen, useMe } from '../ui';

export function BudgetScreen() {
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
  });

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
    const parseAmt = (t?: string): number | null => (t?.trim() ? toPaise(t) : 0);
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
    <Screen onRefresh={() => view.refetch()} refreshing={view.isRefetching}>
      <MonthSwitcher value={month} onChange={setMonth} />
      {!isAdmin && <Notice tone="warn">Only the family admin can change the budget.</Notice>}
      <Notice error={formError ?? save.error ?? view.error} />
      {saved && <Notice tone="success">Budget saved.</Notice>}
      {view.isLoading || cats.isLoading ? (
        <Loading />
      ) : (
        <>
          <Panel title="Total monthly budget">
            <Field value={total} onChangeText={(t) => setTotal(formatAmountInput(t))} keyboardType="decimal-pad" placeholder="60000" editable={isAdmin} />
            {totalPaise > 0 && (
              <View className="mt-3">
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-xs text-gray-500">Used {inr(totalSpent)}</Text>
                  <Text className="text-xs text-gray-500">
                    {totalSpent > totalPaise ? `Over by ${inr(totalSpent - totalPaise)}` : `Remaining ${inr(totalPaise - totalSpent)}`}
                  </Text>
                </View>
                <Bar used={totalSpent} total={totalPaise} />
              </View>
            )}
          </Panel>

          {cats.data?.map((c) => {
            const budgetPaise = toPaise(amounts[c.id] ?? '') ?? 0;
            const spent = spentBy.get(c.id) ?? 0;
            const over = budgetPaise > 0 && spent > budgetPaise;
            return (
              <View key={c.id} className={`rounded-xl border bg-white p-4 ${over ? 'border-red-300' : 'border-gray-200'}`}>
                <View className="mb-2 flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-medium text-gray-900">{c.name}</Text>
                  <View className="w-32">
                    <Field
                      value={amounts[c.id] ?? ''}
                      onChangeText={(t) => setAmounts({ ...amounts, [c.id]: formatAmountInput(t) })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      editable={isAdmin}
                    />
                  </View>
                </View>
                {budgetPaise > 0 ? (
                  <>
                    <Bar used={spent} total={budgetPaise} />
                    <Text className={`mt-2 text-xs ${over ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                      {over ? `Over budget by ${inr(spent - budgetPaise)}` : `Used ${inr(spent)} · Remaining ${inr(budgetPaise - spent)}`}
                    </Text>
                  </>
                ) : (
                  <Text className="text-xs text-gray-400">{spent > 0 ? `Spent ${inr(spent)} (no budget set)` : 'No budget set'}</Text>
                )}
              </View>
            );
          })}
          {isAdmin && <Btn label={save.isPending ? 'Saving…' : 'Save Budget'} onPress={submit} disabled={save.isPending} />}
        </>
      )}
    </Screen>
  );
}
