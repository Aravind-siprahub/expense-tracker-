import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { currentMonth, dayLabel, inr, METHOD_LABEL, openHistory } from '../lib/format';
import type { Summary } from '../lib/types';
import { Bar, Btn, Loading, MonthSwitcher, Notice, Panel, Screen } from '../ui';

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const [month, setMonth] = useState(currentMonth());
  const q = useQuery({ queryKey: ['summary', month], queryFn: () => api<Summary>('GET', `/summary?month=${month}`) });
  const s = q.data;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <MonthSwitcher value={month} onChange={setMonth} />
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && (
        <>
          {s.overBudget.map((o) => (
            <Notice key={o.name}>⚠️ {o.name} is over budget by {inr(o.overByPaise)}</Notice>
          ))}

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3">
              <Text className="text-xs text-gray-500">Income</Text>
              <Text className="mt-1 text-lg font-bold text-green-600">{inr(s.incomePaise)}</Text>
            </View>
            <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3">
              <Text className="text-xs text-gray-500">Expenses</Text>
              <Text className="mt-1 text-lg font-bold text-red-600">{inr(s.expensesPaise)}</Text>
            </View>
          </View>
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-xs text-gray-500">Remaining Balance</Text>
            <Text className={`mt-1 text-3xl font-bold ${s.remainingPaise < 0 ? 'text-red-600' : 'text-primary-700'}`}>
              {s.remainingPaise < 0 ? '-' : ''}
              {inr(s.remainingPaise)}
            </Text>
          </View>

          <Panel title="Spending by category">
            {s.byCategory.length ? (
              <View className="gap-3">
                {s.byCategory.map((c) => (
                  <Pressable key={c.categoryId} onPress={() => openHistory(nav, { month, categoryId: c.categoryId })}>
                    <View className="mb-1 flex-row justify-between">
                      <Text className="text-sm text-gray-700">{c.name} ›</Text>
                      <Text className="text-sm font-medium">{inr(c.spentPaise)}</Text>
                    </View>
                    <Bar used={c.spentPaise} total={s.expensesPaise} tone="blue" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-gray-400">No expenses this month.</Text>
            )}
          </Panel>

          <Panel title="Spending by member">
            {s.byMember.length ? (
              <View className="gap-3">
                {s.byMember.map((m) => (
                  <Pressable key={m.userId} onPress={() => openHistory(nav, { month, userId: m.userId })}>
                    <View className="mb-1 flex-row justify-between">
                      <Text className="text-sm text-gray-700">{m.name} ›</Text>
                      <Text className="text-sm font-medium">{inr(m.spentPaise)}</Text>
                    </View>
                    <Bar used={m.spentPaise} total={s.expensesPaise} tone="blue" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-gray-400">No expenses this month.</Text>
            )}
          </Panel>

          <Panel title="Recent transactions">
            {s.recent.length ? (
              s.recent.map((t) => (
                <Pressable key={t.id} onPress={() => openHistory(nav, { month, categoryId: t.categoryId })} className="flex-row items-center justify-between border-b border-gray-100 py-3">
                  <View className="flex-1 pr-3">
                    <Text className="font-medium text-gray-900">{t.note || t.category}</Text>
                    <Text className="text-xs text-gray-500">
                      {t.category} · {t.by} · {METHOD_LABEL[t.paymentMethod]} · {dayLabel(t.date)}
                    </Text>
                  </View>
                  <Text className="font-semibold text-red-600">-{inr(t.amountPaise)}</Text>
                </Pressable>
              ))
            ) : (
              <Text className="text-sm text-gray-400">Nothing yet. Tap + to add your first expense.</Text>
            )}
          </Panel>
          <Btn label="+ Add Expense" onPress={() => nav.navigate('ExpenseForm')} />
        </>
      )}
    </Screen>
  );
}
