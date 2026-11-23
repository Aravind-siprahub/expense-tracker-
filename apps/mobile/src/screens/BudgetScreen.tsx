import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Check, Gauge } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { effectiveBudget } from '../lib/budget';
import {
  currentMonth,
  formatAmountInput,
  inr,
  toPaise,
  toRupeesText,
} from '../lib/format';
import type { BudgetView, Category } from '../lib/types';
import { categoryVisual } from '../categoryIcons';
import {
  Bar,
  Btn,
  Field,
  IconTile,
  Loading,
  MonthSwitcher,
  Notice,
  Panel,
  Screen,
  TONES,
  cardShadow,
  colors,
  useMe,
} from '../ui';

export function BudgetScreen() {
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [month, setMonth] = useState(currentMonth());
  // Null/missing drafts mean "show the latest server value". Once the admin types,
  // that field becomes a local draft and a background refresh cannot overwrite it.
  const [totalDraft, setTotalDraft] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
  });
  const view = useQuery({
    queryKey: ['budget', month],
    queryFn: () => api<BudgetView>('GET', `/budgets?month=${month}`),
    // No auto-refresh here: it would overwrite the amounts the admin is typing.
    refetchInterval: false,
  });

  const total =
    totalDraft ??
    (view.data?.totalPaise ? toRupeesText(view.data.totalPaise) : '');
  const serverAmounts = new Map(
    view.data?.categories.map((c) => [
      c.categoryId,
      c.budgetPaise > 0 ? toRupeesText(c.budgetPaise) : '',
    ])
  );
  const amountFor = (categoryId: string) =>
    Object.hasOwn(amountDrafts, categoryId)
      ? amountDrafts[categoryId]
      : (serverAmounts.get(categoryId) ?? '');

  const changeMonth = (nextMonth: string) => {
    setTotalDraft(null);
    setAmountDrafts({});
    setSaved(false);
    setFormError(null);
    setMonth(nextMonth);
  };

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
    const parseAmt = (t?: string): number | null =>
      t?.trim() ? toPaise(t) : 0;
    const totalPaise = parseAmt(total);
    if (totalPaise === null)
      return setFormError('Total budget must be a positive number');
    const categories: { categoryId: string; amountPaise: number }[] = [];
    for (const c of cats.data ?? []) {
      const p = parseAmt(amountFor(c.id));
      if (p === null)
        return setFormError(`Budget for ${c.name} must be a positive number`);
      categories.push({ categoryId: c.id, amountPaise: p });
    }
    save.mutate({ month, totalPaise, categories });
  }

  const spentBy = new Map(
    view.data?.categories.map((c) => [c.categoryId, c.spentPaise])
  );
  const totalSpent =
    view.data?.categories.reduce((s, c) => s + c.spentPaise, 0) ?? 0;
  // The explicit total the admin typed (0 when empty). This is the only value that gets saved.
  const explicitTotalPaise = toPaise(total) ?? 0;
  // What the Dashboard shows as the total budget: the explicit total, or, when none is set, the sum of the
  // category budgets (the same rule the server applies in the summary). Display only: nothing is saved from it.
  const { totalPaise, derived: totalIsDerived } = effectiveBudget(
    explicitTotalPaise,
    (cats.data ?? []).map((c) => toPaise(amountFor(c.id)) ?? 0)
  );
  const percent = totalPaise > 0 ? (totalSpent / totalPaise) * 100 : 0;
  const totalOver = totalPaise > 0 && totalSpent > totalPaise;

  return (
    <Screen
      title="Monthly Budget"
      subtitle={
        isAdmin
          ? 'Plan how much the family wants to spend'
          : 'Only the admin can change the budget'
      }
      onRefresh={() => view.refetch()}
      refreshing={view.isRefetching}
    >
      <MonthSwitcher value={month} onChange={changeMonth} />
      <Field
        label="Total budget (₹)"
        value={total}
        onChangeText={(t) => setTotalDraft(formatAmountInput(t))}
        keyboardType="decimal-pad"
        placeholder="60,000"
        editable={isAdmin}
      />
      <Notice error={formError ?? save.error ?? view.error} />
      {saved && (
        <Notice tone="success">
          <Check size={14} color={colors.successDark} /> Budget saved.
        </Notice>
      )}
      {view.isLoading || cats.isLoading ? (
        <Loading />
      ) : (
        <>
          <Panel title="Budget Utilization" icon={Gauge} tone="blue">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-sm text-slate-500">Spent</Text>
                <Text className="text-lg font-bold text-rose-600">
                  {inr(totalSpent)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm text-slate-500">Total Budget</Text>
                <Text
                  className={`text-lg font-bold ${totalPaise > 0 ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  {totalPaise > 0 ? inr(totalPaise) : 'Not set'}
                </Text>
                {totalIsDerived ? (
                  <Text className="text-[11px] text-slate-400">
                    Sum of category budgets
                  </Text>
                ) : null}
              </View>
            </View>
            <View className="mt-3">
              <Bar used={totalSpent} total={totalPaise} />
            </View>
            {totalPaise === 0 && (
              <Text className="mt-2 text-xs text-slate-500">
                {isAdmin
                  ? 'Enter a total budget above to track overall usage. Category budgets below still work on their own.'
                  : 'No overall budget has been set. Category budgets below still apply.'}
              </Text>
            )}
            {totalPaise > 0 && (
              <View className="mt-2 flex-row items-center justify-between">
                <Text
                  className={`text-xs ${totalOver ? 'font-semibold text-rose-600' : 'text-slate-500'}`}
                >
                  {totalOver
                    ? `Over by ${inr(totalSpent - totalPaise)}`
                    : `${inr(totalPaise - totalSpent)} remaining`}
                </Text>
                <Text
                  className={`text-xs font-semibold ${totalOver ? 'text-rose-600' : 'text-slate-500'}`}
                >
                  {Math.round(percent)}%
                </Text>
              </View>
            )}
          </Panel>

          {cats.data?.map((c) => {
            const budgetPaise = toPaise(amountFor(c.id)) ?? 0;
            const spent = spentBy.get(c.id) ?? 0;
            const over = budgetPaise > 0 && spent > budgetPaise;
            const pct = budgetPaise > 0 ? (spent / budgetPaise) * 100 : 0;
            const nearLimit = pct >= 80 && !over;
            const { Icon, tone } = categoryVisual(c.name);
            return (
              <View
                key={c.id}
                className={`rounded-2xl border bg-white p-3.5 ${over ? 'border-rose-300' : nearLimit ? 'border-amber-300' : 'border-slate-200/70'}`}
                style={[
                  cardShadow,
                  over
                    ? { backgroundColor: TONES.red.card }
                    : nearLimit
                      ? { backgroundColor: TONES.amber.card }
                      : null,
                ]}
              >
                <View className="flex-row items-center gap-3">
                  <IconTile icon={Icon} tone={tone} />
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-semibold text-slate-800"
                    >
                      {c.name}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {inr(spent)} spent
                    </Text>
                  </View>
                  <View className="w-28 flex-row items-center rounded-xl border border-slate-200 bg-white px-2.5">
                    <Text className="text-xs text-slate-400">₹</Text>
                    <TextInput
                      className="flex-1 py-2 text-right text-sm text-slate-900"
                      value={amountFor(c.id)}
                      onChangeText={(t) =>
                        setAmountDrafts((current) => ({
                          ...current,
                          [c.id]: formatAmountInput(t),
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.faint}
                      editable={isAdmin}
                    />
                  </View>
                </View>
                {budgetPaise > 0 && (
                  <View className="mt-3">
                    <Bar used={spent} total={budgetPaise} />
                    <View className="mt-1.5 flex-row items-center justify-between">
                      <Text
                        className={`text-xs ${over ? 'font-semibold text-rose-600' : nearLimit ? 'font-semibold text-amber-600' : 'text-slate-500'}`}
                      >
                        {over
                          ? `Over budget by ${inr(spent - budgetPaise)}`
                          : nearLimit
                            ? `80%+ used (${inr(budgetPaise - spent)} left)`
                            : `${inr(budgetPaise - spent)} remaining`}
                      </Text>
                      <Text
                        className={`text-[11px] ${over ? 'text-rose-600' : nearLimit ? 'text-amber-600' : 'text-slate-400'}`}
                      >
                        {Math.round(pct)}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          {isAdmin && (
            <Btn
              label={save.isPending ? 'Saving…' : 'Save Budget'}
              onPress={submit}
              disabled={save.isPending}
            />
          )}
        </>
      )}
    </Screen>
  );
}
