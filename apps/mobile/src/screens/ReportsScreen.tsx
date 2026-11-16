import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { currentMonth, inr, monthLabel, openHistory } from '../lib/format';
import type { Summary } from '../lib/types';
import { Bar, Loading, MonthSwitcher, Notice, Panel, Screen } from '../ui';

export function ReportsScreen() {
  const nav = useNavigation<any>();
  const [month, setMonth] = useState(currentMonth());
  const q = useQuery({ queryKey: ['summary', month], queryFn: () => api<Summary>('GET', `/summary?month=${month}`) });
  const s = q.data;
  const p = s?.previousMonth;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <MonthSwitcher value={month} onChange={setMonth} />
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && p && (
        <>
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3">
              <Text className="text-xs text-gray-500">Total spent</Text>
              <Text className="mt-1 text-lg font-bold">{inr(s.expensesPaise)}</Text>
            </View>
            <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3">
              <Text className="text-xs text-gray-500">Biggest category</Text>
              <Text className="mt-1 text-lg font-bold" numberOfLines={1}>{s.byCategory[0]?.name ?? '—'}</Text>
            </View>
          </View>

          <Panel title="Compared to last month">
            {p.expensesPaise === 0 ? (
              <Text className="text-sm text-gray-400">No spending recorded in {monthLabel(p.month)}.</Text>
            ) : (
              <>
                <Text className={`text-2xl font-bold ${p.changePaise > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {p.changePaise > 0 ? '▲' : p.changePaise < 0 ? '▼' : ''} {inr(p.changePaise)}
                  {p.changePercent !== null ? ` (${Math.abs(p.changePercent)}%)` : ''}
                </Text>
                <Text className="text-xs text-gray-500">{monthLabel(p.month)}: {inr(p.expensesPaise)}</Text>
              </>
            )}
          </Panel>

          <Panel title="Income vs. expenses">
            {[
              { label: monthLabel(p.month), income: p.incomePaise, expenses: p.expensesPaise },
              { label: monthLabel(s.month), income: s.incomePaise, expenses: s.expensesPaise },
            ].map((row) => {
              const max = Math.max(row.income, row.expenses, 1);
              return (
                <View key={row.label} className="mb-4">
                  <Text className="mb-1 text-sm font-medium text-gray-700">{row.label}</Text>
                  <View className="mb-1 flex-row items-center gap-2">
                    <Text className="w-20 text-xs text-gray-500">Income</Text>
                    <View className="flex-1"><Bar used={row.income} total={max} tone="blue" /></View>
                    <Text className="w-24 text-right text-xs">{inr(row.income)}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="w-20 text-xs text-gray-500">Expenses</Text>
                    <View className="flex-1"><Bar used={row.expenses} total={max} /></View>
                    <Text className="w-24 text-right text-xs">{inr(row.expenses)}</Text>
                  </View>
                </View>
              );
            })}
          </Panel>

          <Panel title="Category-wise spending">
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
        </>
      )}
    </Screen>
  );
}
