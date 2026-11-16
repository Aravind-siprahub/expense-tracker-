import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { currentMonth, dayLabel, inr, METHOD_LABEL, monthBounds, shiftMonth } from '../lib/format';
import type { Category, Expense, FamilyInfo } from '../lib/types';
import { Chip, Field, Loading, Notice, Panel, Screen, useMe } from '../ui';

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function HistoryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const me = useMe();
  const thisMonth = monthBounds(currentMonth());
  const [from, setFrom] = useState(thisMonth.from);
  const [to, setTo] = useState(thisMonth.to);
  const [categoryId, setCategoryId] = useState('');
  const [userId, setUserId] = useState('');

  // Filters sent from the Dashboard, Reports or Family screens.
  const p = route.params as
    | { from?: string; to?: string; categoryId?: string; userId?: string; stamp?: number }
    | undefined;
  useEffect(() => {
    if (!p?.stamp) return;
    setFrom(p.from ?? '');
    setTo(p.to ?? '');
    setCategoryId(p.categoryId ?? '');
    setUserId(p.userId ?? '');
  }, [p?.stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });

  const validFrom = from && isDate(from) ? from : '';
  const validTo = to && isDate(to) ? to : '';
  const params = new URLSearchParams();
  if (validFrom) params.set('from', validFrom);
  if (validTo) params.set('to', validTo);
  if (categoryId) params.set('categoryId', categoryId);
  if (userId) params.set('userId', userId);
  const list = useQuery({
    queryKey: ['expenses', validFrom, validTo, categoryId, userId],
    queryFn: () => api<{ totalPaise: number; items: Expense[] }>('GET', `/expenses?${params}`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['budget'] });
    },
  });
  const confirmDelete = (id: string) =>
    Alert.alert('Delete expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);

  const setMonthRange = (m: string) => {
    const b = monthBounds(m);
    setFrom(b.from);
    setTo(b.to);
  };
  const shownMonth = from.slice(0, 7);
  const isFullMonth = !!from && from.slice(0, 7) === to.slice(0, 7) && monthBounds(shownMonth).from === from && monthBounds(shownMonth).to === to;

  const myId = me.data?.user.id;
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const badDates = (!!from && !isDate(from)) || (!!to && !isDate(to));

  return (
    <Screen onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <Panel title="Date range">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <Chip label="This month" active={isFullMonth && shownMonth === currentMonth()} onPress={() => setMonthRange(currentMonth())} />
          <Chip label="Last month" active={isFullMonth && shownMonth === shiftMonth(currentMonth(), -1)} onPress={() => setMonthRange(shiftMonth(currentMonth(), -1))} />
          <Chip label="All time" active={!from && !to} onPress={() => { setFrom(''); setTo(''); }} />
        </ScrollView>
        <View className="flex-row gap-3">
          <View className="flex-1"><Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
          <View className="flex-1"><Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
        </View>
        {badDates && <Text className="mt-2 text-xs text-amber-700">Dates must look like 2026-11-16.</Text>}
        {validFrom && validTo && validFrom > validTo && <Text className="mt-2 text-xs text-amber-700">&quot;From&quot; is after &quot;To&quot;.</Text>}
      </Panel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All categories" active={!categoryId} onPress={() => setCategoryId('')} />
        {cats.data?.map((c) => (
          <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All members" active={!userId} onPress={() => setUserId('')} />
        {fam.data?.members.map((m) => (
          <Chip key={m.userId} label={m.name} active={userId === m.userId} onPress={() => setUserId(m.userId)} />
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between px-1">
        <Text className="text-sm text-gray-500">{list.data?.items.length ?? 0} transactions</Text>
        <Text className="text-sm text-gray-600">
          Total: <Text className="font-bold text-gray-900">{inr(list.data?.totalPaise ?? 0)}</Text>
        </Text>
      </View>

      <Notice error={list.error ?? del.error} />
      {list.isLoading ? (
        <Loading />
      ) : list.data?.items.length ? (
        <Panel>
          {list.data.items.map((t) => {
            const canEdit = isAdmin || t.userId === myId;
            return (
              <View key={t.id} className="border-b border-gray-100 py-3">
                <Pressable disabled={!canEdit} onPress={() => nav.navigate('ExpenseForm', { id: t.id })} className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-medium text-gray-900">{t.note || t.category}</Text>
                    <Text className="text-xs text-gray-500">
                      {t.category} · {t.by} · {METHOD_LABEL[t.paymentMethod]} · {dayLabel(t.date)}
                    </Text>
                  </View>
                  <Text className="font-semibold text-gray-900">{inr(t.amountPaise)}</Text>
                </Pressable>
                {canEdit && (
                  <View className="mt-2 flex-row gap-5">
                    <Text className="text-sm text-primary-600" onPress={() => nav.navigate('ExpenseForm', { id: t.id })}>Edit</Text>
                    <Text className="text-sm text-red-600" onPress={() => confirmDelete(t.id)}>Delete</Text>
                  </View>
                )}
              </View>
            );
          })}
        </Panel>
      ) : (
        <Text className="py-8 text-center text-gray-400">No transactions found.</Text>
      )}
    </Screen>
  );
}
