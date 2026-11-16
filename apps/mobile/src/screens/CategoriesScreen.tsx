import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category } from '../lib/types';
import { Btn, Field, Loading, Notice, Panel, Screen, useMe } from '../ui';

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
    Alert.alert('Delete category', 'Delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);

  const defaults = list.data?.filter((c) => c.isDefault) ?? [];
  const custom = list.data?.filter((c) => !c.isDefault) ?? [];

  return (
    <Screen>
      <Panel title="Add a category">
        <Notice error={add.error} />
        <View className="gap-3">
          <Field value={name} onChangeText={setName} placeholder="e.g. Pet Care" maxLength={40} />
          <Btn label="Add Category" onPress={() => add.mutate()} disabled={add.isPending || name.trim().length < 2} />
        </View>
      </Panel>
      <Notice error={del.error} />
      {list.isLoading ? (
        <Loading />
      ) : (
        <>
          {custom.length > 0 && (
            <Panel title="Your categories">
              {custom.map((c) => (
                <View key={c.id} className="flex-row items-center justify-between border-b border-gray-100 py-3">
                  <Text className="font-medium text-gray-900">{c.name}</Text>
                  {isAdmin && <Text className="text-sm text-red-600" onPress={() => confirmDelete(c.id)}>Delete</Text>}
                </View>
              ))}
            </Panel>
          )}
          <Panel title="Ready-made categories">
            {defaults.map((c) => (
              <View key={c.id} className="border-b border-gray-100 py-3">
                <Text className="text-gray-900">{c.name}</Text>
              </View>
            ))}
          </Panel>
        </>
      )}
    </Screen>
  );
}
