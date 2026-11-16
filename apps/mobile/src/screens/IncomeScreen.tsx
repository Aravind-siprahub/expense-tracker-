import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { currentMonth, formatAmountInput, inr, monthLabel, toPaise, toRupeesText } from '../lib/format';
import type { FamilyInfo, IncomeEntry } from '../lib/types';
import { Btn, Chip, Field, Loading, MonthSwitcher, Notice, Panel, Screen, useMe } from '../ui';

export function IncomeScreen() {
  const qc = useQueryClient();
  const me = useMe();
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [type, setType] = useState<'SALARY' | 'OTHER'>('SALARY');
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });
  const list = useQuery({
    queryKey: ['income', month],
    queryFn: () => api<{ totalPaise: number; items: IncomeEntry[] }>('GET', `/income?month=${month}`),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['income'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };
  const reset = () => {
    setEditing(null);
    setType('SALARY');
    setMemberId('');
    setAmount('');
    setNote('');
  };
  const save = useMutation({
    mutationFn: (body: object) => (editing ? api('PATCH', `/income/${editing.id}`, body) : api('POST', '/income', body)),
    onSuccess: () => {
      refresh();
      reset();
    },
  });
  const del = useMutation({ mutationFn: (id: string) => api('DELETE', `/income/${id}`), onSuccess: refresh });

  function submit() {
    setFormError(null);
    const paise = toPaise(amount);
    if (!paise) return setFormError('Enter an amount greater than 0');
    save.mutate({
      type,
      amountPaise: paise,
      month,
      note: note.trim() || undefined,
      ...(memberId ? { userId: memberId } : {}),
    });
  }
  const confirmDelete = (id: string) =>
    Alert.alert('Delete income', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);

  const myId = me.data?.user.id;
  const isAdmin = me.data?.family?.role === 'ADMIN';

  return (
    <Screen onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <MonthSwitcher value={month} onChange={setMonth} />
      <View className="rounded-xl border border-gray-200 bg-white p-4">
        <Text className="text-xs text-gray-500">Total family income · {monthLabel(month)}</Text>
        <Text className="mt-1 text-3xl font-bold text-green-600">{inr(list.data?.totalPaise ?? 0)}</Text>
      </View>

      <Panel title={editing ? 'Edit income' : 'Add income'}>
        <Notice error={formError ?? save.error} />
        <View className="mb-3 flex-row gap-2">
          <Chip label="Salary" active={type === 'SALARY'} onPress={() => setType('SALARY')} />
          <Chip label="Other" active={type === 'OTHER'} onPress={() => setType('OTHER')} />
        </View>
        <Text className="mb-1 text-xs font-medium text-gray-600">Earned by</Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Chip label="Me" active={!memberId || memberId === me.data?.user.id} onPress={() => setMemberId('')} />
          {fam.data?.members
            .filter((m) => m.userId !== me.data?.user.id)
            .map((m) => (
              <Chip key={m.userId} label={m.name} active={memberId === m.userId} onPress={() => setMemberId(m.userId)} />
            ))}
        </View>
        <View className="gap-3">
          <Field label="Amount (₹)" value={amount} onChangeText={(t) => setAmount(formatAmountInput(t))} keyboardType="decimal-pad" placeholder="75000" />
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Freelance work" maxLength={200} />
          <Btn label={save.isPending ? 'Saving…' : 'Save'} onPress={submit} disabled={save.isPending} />
          {editing && <Btn label="Cancel edit" variant="ghost" onPress={reset} />}
        </View>
      </Panel>

      <Notice error={list.error ?? del.error} />
      {list.isLoading ? (
        <Loading />
      ) : list.data?.items.length ? (
        <Panel title="Entries">
          {list.data.items.map((e) => (
            <View key={e.id} className="border-b border-gray-100 py-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-medium text-gray-900">
                    {e.type === 'SALARY' ? 'Salary' : 'Other'}
                    {e.note ? ` · ${e.note}` : ''}
                  </Text>
                  <Text className="text-xs text-gray-500">{e.member}</Text>
                </View>
                <Text className="font-semibold text-green-600">+{inr(e.amountPaise)}</Text>
              </View>
              {(isAdmin || e.userId === myId || e.createdById === myId) && (
                <View className="mt-2 flex-row gap-5">
                  <Text
                    className="text-sm text-primary-600"
                    onPress={() => {
                      setEditing(e);
                      setType(e.type);
                      setMemberId(e.userId);
                      setAmount(toRupeesText(e.amountPaise));
                      setNote(e.note ?? '');
                    }}
                  >
                    Edit
                  </Text>
                  <Text className="text-sm text-red-600" onPress={() => confirmDelete(e.id)}>Delete</Text>
                </View>
              )}
            </View>
          ))}
        </Panel>
      ) : (
        <Text className="py-6 text-center text-gray-400">No income recorded for this month.</Text>
      )}
    </Screen>
  );
}
