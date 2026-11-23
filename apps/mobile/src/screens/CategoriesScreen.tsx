import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Plus, Tag, Trash2 } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category } from '../lib/types';
import { categoryVisual } from '../categoryIcons';
import { RefField } from './AuthScreen';
import { Btn, IconTile, Loading, Notice, Panel, Screen, colors, useMe } from '../ui';

const examples: Record<string, string> = {
  'Food & Dining': 'Restaurants, takeaway, cafes',
  Groceries: 'Vegetables, milk, monthly provisions',
  'Rent & Housing': 'Rent, maintenance, repairs',
  'Electricity & Bills': 'Electricity, water, gas, internet, mobile',
  'Medical & Healthcare': 'Doctor visits, medicines, tests',
  Entertainment: 'Movies, subscriptions, outings',
  'Transport & Fuel': 'Petrol, bus, metro, auto, cab',
  Education: 'School fees, books, tuition',
  Shopping: 'Clothes, electronics, household items',
  Travel: 'Tickets, hotels, trips',
  Insurance: 'Health, life, vehicle premiums',
  'EMI & Loans': 'Home, car and personal loan payments',
  'Personal Expenses': 'Salon, gym, hobbies',
  Others: 'Anything that does not fit above',
};

export function CategoriesScreen() {
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [name, setName] = useState('');
  const list = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });
  const add = useMutation({
    mutationFn: () => api('POST', '/categories', { name: name.trim() }),
    onSuccess: () => {
      setName('');
      refresh();
    },
  });
  const del = useMutation({ mutationFn: (id: string) => api('DELETE', `/categories/${id}`), onSuccess: refresh });
  const confirmDelete = (id: string) =>
    Alert.alert('Delete category?', 'This category will be removed for the whole family.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);

  const defaults = list.data?.filter((c) => c.isDefault) ?? [];
  const custom = list.data?.filter((c) => !c.isDefault) ?? [];

  return (
    <Screen title="Categories" subtitle="14 ready-made categories plus your own">
      <Panel title="Add category" icon={Plus} tone="green">
        <Notice error={add.error} />
        <View className="gap-3">
          <RefField
            label="Category name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Pet Care"
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!add.isPending && name.trim().length >= 2) add.mutate();
            }}
          />
          <Btn label="Add Category" onPress={() => add.mutate()} disabled={add.isPending || name.trim().length < 2} />
        </View>
        <Text className="mt-3 text-xs text-slate-400">Custom categories are shared with the whole family.</Text>
      </Panel>

      <Notice error={del.error} />
      <Panel title="All categories" icon={Tag} tone="blue">
        {list.isLoading ? (
          <Loading />
        ) : (
          <View>
            {custom.map((c, i) => (
              <View key={c.id} className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                <IconTile icon={categoryVisual(c.name).Icon} tone="slate" />
                <View className="min-w-0 flex-1 items-start">
                  <Text numberOfLines={1} className="text-sm font-semibold text-slate-800">{c.name}</Text>
                  <View className="mt-0.5 rounded-full bg-primary-50 px-2 py-0.5">
                    <Text className="text-[11px] font-medium text-primary-700">Custom</Text>
                  </View>
                </View>
                {isAdmin && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete category ${c.name}`} hitSlop={8} className="rounded-lg p-2 active:bg-rose-50" onPress={() => confirmDelete(c.id)}>
                    <Trash2 size={16} color={colors.faint} />
                  </Pressable>
                )}
              </View>
            ))}
            {defaults.map((c, i) => {
              const { Icon, tone } = categoryVisual(c.name);
              return (
                <View key={c.id} className={`flex-row items-center gap-3 py-3 ${i > 0 || custom.length > 0 ? 'border-t border-slate-100' : ''}`}>
                  <IconTile icon={Icon} tone={tone} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-semibold text-slate-800">{c.name}</Text>
                    {examples[c.name] ? <Text numberOfLines={1} className="text-xs text-slate-500">{examples[c.name]}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Panel>
    </Screen>
  );
}
