import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, ChartColumn, ChartPie, Tag, Wallet } from 'lucide-react-native';
import { api } from '../lib/api';
import { currentMonth, inr, monthLabel, openHistory } from '../lib/format';
import type { Summary } from '../lib/types';
import { Bars, Donut, EmptyDonut } from '../Charts';
import { cardShadow, IconTile, Loading, MonthSwitcher, Notice, PageHeader, Panel, Screen } from '../ui';

export function ReportsScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [month, setMonth] = useState(currentMonth());
  const q = useQuery({ queryKey: ['summary', month], queryFn: () => api<Summary>('GET', `/summary?month=${month}`) });
  const s = q.data;
  const p = s?.previousMonth;
  const up = (p?.changePaise ?? 0) > 0;
  // screen padding 16*2 + panel padding 16*2 + border
  const chartW = Math.max(width - 66, 120);

  const card = 'flex-row items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4';

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <PageHeader title="Reports" subtitle="Understand spending trends" />
      <MonthSwitcher value={month} onChange={setMonth} />
      <Notice error={q.error} />
      {q.isLoading && <Loading />}
      {s && p && (
        <>
          <View className={card} style={cardShadow}>
            <IconTile icon={Wallet} tone="blue" size="lg" />
            <View className="min-w-0 flex-1">
              <Text className="text-sm text-slate-500">Total spent</Text>
              <Text numberOfLines={1} className="text-2xl font-bold tracking-tight text-slate-900">{inr(s.expensesPaise)}</Text>
            </View>
          </View>
          <View className={card} style={cardShadow}>
            <IconTile icon={Tag} tone="purple" size="lg" />
            <View className="min-w-0 flex-1">
              <Text className="text-sm text-slate-500">Biggest category</Text>
              <Text numberOfLines={1} className="text-2xl font-bold tracking-tight text-slate-900">{s.byCategory[0]?.name ?? '—'}</Text>
            </View>
          </View>
          <View className={card} style={cardShadow}>
            <IconTile icon={up ? ArrowUpRight : ArrowDownRight} tone={up ? 'red' : 'green'} size="lg" />
            <View className="min-w-0 flex-1">
              <Text className="text-sm text-slate-500">Compared to last month</Text>
              {p.expensesPaise === 0 ? (
                <Text className="mt-1 text-sm text-slate-400">No spending recorded in {monthLabel(p.month)}.</Text>
              ) : (
                <>
                  <Text
                    accessibilityLabel={`${up ? 'Up' : p.changePaise < 0 ? 'Down' : 'No change'} ${inr(Math.abs(p.changePaise))}${p.changePercent !== null ? `, ${Math.abs(p.changePercent)} percent` : ''} compared to last month`}
                    className={`text-2xl font-bold tracking-tight ${up ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {up ? '↑' : p.changePaise < 0 ? '↓' : ''} {inr(p.changePaise)}
                    {p.changePercent !== null ? ` (${Math.abs(p.changePercent)}%)` : ''}
                  </Text>
                  <Text numberOfLines={2} className="text-xs text-slate-500">{monthLabel(p.month)}: {inr(p.expensesPaise)}</Text>
                </>
              )}
            </View>
          </View>

          <Panel title="Category-wise spending" icon={ChartPie} tone="blue">
            {s.byCategory.length ? (
              <Donut
                centerLabel="Total"
                centerValue={inr(s.expensesPaise)}
                data={s.byCategory.map((c) => ({
                  label: c.name,
                  value: c.spentPaise / 100,
                  onPress: () => openHistory(nav, { month, categoryId: c.categoryId }),
                }))}
              />
            ) : (
              <View className="py-4"><EmptyDonut /></View>
            )}
          </Panel>

          <Panel title="Income vs. expenses" icon={ChartColumn} tone="teal">
            <Bars
              width={chartW}
              data={[
                { label: monthLabel(p.month), a: p.incomePaise / 100, b: p.expensesPaise / 100 },
                { label: monthLabel(s.month), a: s.incomePaise / 100, b: s.expensesPaise / 100 },
              ]}
            />
          </Panel>
        </>
      )}
    </Screen>
  );
}
