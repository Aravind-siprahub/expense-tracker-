import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  AlertTriangle,
  PiggyBank,
  Plus,
  Receipt,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react-native';
import { api } from '../lib/api';
import { effectiveBudget } from '../lib/budget';
import {
  currentMonth,
  dayLabel,
  inr,
  METHOD_LABEL,
  monthLabel,
  openHistory,
} from '../lib/format';
import type { BudgetView, Summary } from '../lib/types';
import { categoryVisual } from '../categoryIcons';
import { Donut, EmptyDonut, Progress } from '../Charts';
import { DashboardSkeleton } from '../Skeleton';
import {
  Btn,
  colors,
  EmptyState,
  IconTile,
  MonthSwitcher,
  Notice,
  Panel,
  Screen,
  StatCard,
  useLiveRefetch,
  useMe,
  PageHeader,
} from '../ui';

const DISMISSED_ALERTS_KEY = 'dashboard-dismissed-alerts-v1';
const MAX_SAVED_DISMISSALS = 60;

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const [month, setMonth] = useState(currentMonth());
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [dismissalsLoaded, setDismissalsLoaded] = useState(false);
  const me = useMe();
  const userId = me.data?.user.id ?? 'none';
  const familyId = me.data?.family?.id ?? 'none';
  const alertKey = (type: 'over' | 'near', name: string) =>
    `${userId}:${familyId}:${month}:${type}:${name}`;
  const live = useLiveRefetch();
  const q = useQuery({
    queryKey: ['summary', month],
    queryFn: () => api<Summary>('GET', `/summary?month=${month}`),
    refetchInterval: live,
  });
  const budget = useQuery({
    queryKey: ['budget', month],
    queryFn: () => api<BudgetView>('GET', `/budgets?month=${month}`),
  });
  const s = q.data;
  const refetchSummary = q.refetch;
  const refetchBudget = budget.refetch;

  // Tab screens stay mounted. Refresh as soon as the user returns from editing a budget,
  // instead of briefly showing the old "Not set" value until the polling interval runs.
  useFocusEffect(
    useCallback(() => {
      void refetchSummary();
      void refetchBudget();
    }, [refetchBudget, refetchSummary])
  );

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(DISMISSED_ALERTS_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === 'string')
        ) {
          setDismissed(parsed.slice(-MAX_SAVED_DISMISSALS));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setDismissalsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const dismissedKeys = new Set(dismissed);
  const activeOverBudget =
    s?.overBudget.filter(
      (o) => dismissalsLoaded && !dismissedKeys.has(alertKey('over', o.name))
    ) ?? [];
  const allNearBudget =
    s?.budgetAlerts?.nearBudget ??
    s?.byCategory.filter(
      (c) =>
        c.budgetPaise > 0 &&
        c.spentPaise >= c.budgetPaise * 0.8 &&
        c.spentPaise <= c.budgetPaise
    ) ??
    [];
  const nearBudget = allNearBudget.filter(
    (n) => dismissalsLoaded && !dismissedKeys.has(alertKey('near', n.name))
  );

  const saveDismissals = (keys: string[]) =>
    setDismissed((current) => {
      const next = [...new Set([...current, ...keys])].slice(
        -MAX_SAVED_DISMISSALS
      );
      SecureStore.setItemAsync(
        DISMISSED_ALERTS_KEY,
        JSON.stringify(next)
      ).catch(() => undefined);
      return next;
    });
  const dismissOver = () =>
    saveDismissals(activeOverBudget.map((o) => alertKey('over', o.name)));
  const dismissNear = () =>
    saveDismissals(nearBudget.map((n) => alertKey('near', n.name)));

  const prev = s?.previousMonth;
  // Older/cached summary responses can have a null total even though every category budget is
  // present. Derive the same effective total on the phone so Remaining Budget never says "Not set"
  // when category budgets are configured.
  const resolvedBudget = effectiveBudget(
    s?.totalBudgetPaise ?? budget.data?.totalPaise ?? 0,
    budget.data?.categories.map((category) => category.budgetPaise) ??
      s?.byCategory.map((category) => category.budgetPaise) ??
      []
  );
  const configuredBudgetPaise = resolvedBudget.totalPaise;
  const remainingBudget =
    s && configuredBudgetPaise > 0
      ? s.totalBudgetPaise !== null
        ? (s.remainingBudgetPaise ?? configuredBudgetPaise - s.expensesPaise)
        : configuredBudgetPaise - s.expensesPaise
      : null;

  return (
    <Screen
      onRefresh={() => {
        void q.refetch();
        void budget.refetch();
      }}
      refreshing={q.isRefetching || budget.isRefetching}
    >
      <PageHeader
        title="Dashboard"
        subtitle={`${monthLabel(month)}${me.data?.family?.name ? ` · ${me.data.family.name}` : ''}`}
      />
      <MonthSwitcher value={month} onChange={setMonth} />
      <Notice error={q.error} />
      {q.isLoading && <DashboardSkeleton />}
      {s && (
        <>
          {activeOverBudget.length > 0 ? (
            <View className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
              <View className="flex-row items-start gap-3">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                  <AlertTriangle size={18} color={colors.danger} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-rose-900">
                    Budget exceeded
                  </Text>
                  <Text className="mt-0.5 text-xs leading-5 text-rose-700">
                    {activeOverBudget.length === 1
                      ? `${activeOverBudget[0].name} is over by ${inr(activeOverBudget[0].overByPaise)}.`
                      : `${activeOverBudget.length} categories are over their monthly budgets.`}
                  </Text>
                  <Pressable
                    onPress={() => nav.navigate('Budget')}
                    accessibilityRole="button"
                    accessibilityLabel="Review budget"
                    className="mt-1.5 self-start py-1.5 pr-3"
                  >
                    <Text className="text-xs font-semibold text-rose-800">
                      Review budget
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={dismissOver}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss budget alert for this month"
                  className="h-10 w-10 shrink-0 items-center justify-center rounded-xl active:bg-rose-100"
                >
                  <X size={18} color={colors.dangerDark} />
                </Pressable>
              </View>
            </View>
          ) : nearBudget.length > 0 ? (
            <View className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
              <View className="flex-row items-start gap-3">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <AlertTriangle size={18} color={colors.warn} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-amber-900">
                    Budget almost reached
                  </Text>
                  <Text className="mt-0.5 text-xs leading-5 text-amber-800">
                    {nearBudget.length === 1
                      ? `${nearBudget[0].name} has used ${Math.round((nearBudget[0].spentPaise / nearBudget[0].budgetPaise) * 100)}% of its budget.`
                      : `${nearBudget.length} categories have used at least 80% of their budgets.`}
                  </Text>
                  <Pressable
                    onPress={() => nav.navigate('Budget')}
                    accessibilityRole="button"
                    accessibilityLabel="Review budget"
                    className="mt-1.5 self-start py-1.5 pr-3"
                  >
                    <Text className="text-xs font-semibold text-amber-900">
                      Review budget
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={dismissNear}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss budget warning for this month"
                  className="h-10 w-10 shrink-0 items-center justify-center rounded-xl active:bg-amber-100"
                >
                  <X size={18} color={colors.warnDark} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <StatCard
              compact
              label="Monthly Income"
              value={inr(s.incomePaise)}
              tone="green"
              icon={TrendingUp}
              hint={
                prev?.incomePaise
                  ? `vs ${inr(prev.incomePaise)} last mo`
                  : 'Total recorded income'
              }
            />
            <StatCard
              compact
              label="Monthly Expenses"
              value={inr(s.expensesPaise)}
              tone="red"
              icon={TrendingDown}
              hint={
                prev && prev.changePercent !== null
                  ? `${prev.changePercent > 0 ? '+' : ''}${prev.changePercent}% vs last mo`
                  : 'Total spending'
              }
            />
            <StatCard
              compact
              label="Remaining Budget"
              value={
                configuredBudgetPaise > 0 && remainingBudget !== null
                  ? (remainingBudget < 0 ? '-' : '') +
                    inr(Math.abs(remainingBudget))
                  : 'Not set'
              }
              tone={
                configuredBudgetPaise > 0 && remainingBudget !== null
                  ? remainingBudget < 0
                    ? 'red'
                    : 'blue'
                  : 'slate'
              }
              icon={Target}
              hint={
                configuredBudgetPaise > 0
                  ? `${Math.round((s.expensesPaise / configuredBudgetPaise) * 100)}% of ${inr(configuredBudgetPaise)}${resolvedBudget.derived ? ' category total' : ''} · Tap to edit`
                  : 'Tap to configure'
              }
              onPress={() => nav.navigate('Budget')}
            />
            <StatCard
              compact
              label="Net Savings"
              value={
                (s.remainingPaise < 0 ? '-' : '') +
                inr(Math.abs(s.remainingPaise))
              }
              tone={s.remainingPaise < 0 ? 'red' : 'green'}
              icon={PiggyBank}
              hint={
                s.savingsRate !== undefined
                  ? `${s.savingsRate}% savings rate`
                  : 'Income minus expenses'
              }
            />
          </View>

          <Panel title="Spending by category" icon={Tag} tone="blue">
            {s.byCategory.length ? (
              <Donut
                centerLabel="Total"
                centerValue={inr(s.expensesPaise)}
                data={s.byCategory.map((c) => ({
                  label: c.name,
                  value: c.spentPaise / 100,
                  onPress: () =>
                    openHistory(nav, { month, categoryId: c.categoryId }),
                }))}
              />
            ) : (
              <View className="py-2">
                <EmptyDonut label="No expenses" small />
                <Text className="mt-3 text-center text-sm text-slate-400">
                  No expenses this month.
                </Text>
              </View>
            )}
          </Panel>

          <Panel title="Spending by member" icon={Users} tone="purple">
            {s.byMember.length ? (
              <View className="gap-2">
                {s.byMember.map((m) => (
                  <Pressable
                    key={m.userId}
                    onPress={() =>
                      openHistory(nav, { month, userId: m.userId })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View expenses by ${m.name}`}
                    className="rounded-xl p-2 active:bg-slate-50"
                  >
                    <View className="mb-1.5 flex-row justify-between">
                      <Text className="text-sm font-medium text-slate-700">
                        {m.name}
                      </Text>
                      <Text className="text-sm font-semibold text-slate-800">
                        {inr(m.spentPaise)}
                      </Text>
                    </View>
                    <Progress used={m.spentPaise} total={s.expensesPaise} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                icon={Users}
                title="No spending yet"
                text="No expenses this month."
              />
            )}
          </Panel>

          <Panel
            title="Recent transactions"
            icon={Receipt}
            tone="teal"
            action={
              s.recent.length ? (
                <Pressable
                  onPress={() => openHistory(nav, { month })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="View all transactions"
                >
                  <Text className="text-sm font-medium text-primary-600">
                    View all
                  </Text>
                </Pressable>
              ) : undefined
            }
          >
            {s.recent.length ? (
              <View>
                {s.recent.map((t, i) => {
                  const { Icon, tone } = categoryVisual(t.category);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() =>
                        openHistory(nav, { month, categoryId: t.categoryId })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${t.note || t.category}, ${t.category}. View expenses in this category`}
                      className={`flex-row items-center gap-3 rounded-xl px-1 py-3 active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <IconTile icon={Icon} tone={tone} />
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-sm font-medium text-slate-800"
                        >
                          {t.note || t.category}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="text-xs text-slate-500"
                        >
                          {t.category} · {t.by} ·{' '}
                          {METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod} ·{' '}
                          {dayLabel(t.date)}
                        </Text>
                      </View>
                      <Text className="text-sm font-semibold text-rose-600">
                        -{inr(t.amountPaise)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon={Receipt}
                title="Nothing yet"
                text="Add your first expense to track spending."
                action={
                  <Btn
                    label="Add Your First Expense"
                    icon={Plus}
                    onPress={() => nav.navigate('ExpenseForm')}
                  />
                }
              />
            )}
          </Panel>
        </>
      )}
    </Screen>
  );
}
