import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  currentMonth,
  formatAmountInput,
  inr,
  monthLabel,
  toPaise,
  toRupeesText,
} from '../lib/format';
import type { FamilyInfo, IncomeEntry } from '../lib/types';
import { RefField, type InputRef } from './AuthScreen';
import {
  Avatar,
  Btn,
  Chip,
  EmptyState,
  Loading,
  MonthSwitcher,
  Notice,
  Panel,
  Screen,
  StatCard,
  useMe,
} from '../ui';

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
  const noteRef = useRef<InputRef>(null);

  const fam = useQuery({
    queryKey: ['family'],
    queryFn: () => api<FamilyInfo>('GET', '/family'),
  });
  const list = useQuery({
    queryKey: ['income', month],
    queryFn: () =>
      api<{ totalPaise: number; items: IncomeEntry[] }>(
        'GET',
        `/income?month=${month}`
      ),
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
    mutationFn: (body: object) =>
      editing
        ? api('PATCH', `/income/${editing.id}`, body)
        : api('POST', '/income', body),
    onSuccess: () => {
      refresh();
      reset();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api('DELETE', `/income/${id}`),
    onSuccess: refresh,
  });

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
  // The dialog names the entry (type, note and amount) so the person can see which one they are deleting.
  const confirmDelete = (id: string, summary: string) =>
    Alert.alert(
      'Delete income',
      `${summary}

This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
      ]
    );

  const myId = me.data?.user.id;
  const isAdmin = me.data?.family?.role === 'ADMIN';

  return (
    <Screen
      title="Income"
      subtitle="Money coming into the family"
      onRefresh={() => list.refetch()}
      refreshing={list.isRefetching}
    >
      <MonthSwitcher value={month} onChange={setMonth} />
      {list.isLoading ? (
        <Panel>
          <Loading />
        </Panel>
      ) : list.data ? (
        <StatCard
          label="Total family income"
          value={inr(list.data.totalPaise)}
          tone="green"
          icon={Wallet}
          hint={monthLabel(month)}
        />
      ) : null}

      <Panel
        title={editing ? 'Edit income' : 'Add income'}
        icon={Wallet}
        tone="blue"
      >
        <Notice error={formError ?? save.error} />
        <View className="gap-3.5">
          <View>
            <Text className="mb-1.5 text-xs font-medium text-slate-500">
              Type
            </Text>
            <View className="flex-row gap-2">
              <Chip
                label="Salary"
                active={type === 'SALARY'}
                onPress={() => setType('SALARY')}
              />
              <Chip
                label="Other"
                active={type === 'OTHER'}
                onPress={() => setType('OTHER')}
              />
            </View>
          </View>
          <View>
            <Text className="mb-1.5 text-xs font-medium text-slate-500">
              Earned by
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="Me"
                active={!memberId || memberId === me.data?.user.id}
                onPress={() => setMemberId('')}
              />
              {fam.data?.members
                .filter((m) => m.userId !== me.data?.user.id)
                .map((m) => (
                  <Chip
                    key={m.userId}
                    label={m.name}
                    active={memberId === m.userId}
                    onPress={() => setMemberId(m.userId)}
                  />
                ))}
            </View>
          </View>
          <RefField
            label="Amount (₹)"
            value={amount}
            onChangeText={(t) => setAmount(formatAmountInput(t))}
            keyboardType="decimal-pad"
            placeholder="75000"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => noteRef.current?.focus()}
          />
          <RefField
            ref={noteRef}
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Freelance work"
            maxLength={200}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!save.isPending) submit();
            }}
          />
          <Btn
            label={save.isPending ? 'Saving…' : 'Save'}
            onPress={submit}
            disabled={save.isPending}
          />
          {editing && <Btn label="Cancel" variant="ghost" onPress={reset} />}
        </View>
      </Panel>

      <Notice error={list.error ?? del.error} />
      {list.isLoading ? null : list.data?.items.length ? (
        <Panel title={monthLabel(month)}>
          {list.data.items.map((e, i) => (
            <View
              key={e.id}
              className={`flex-row items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <Avatar
                name={e.type === 'SALARY' ? 'Salary' : 'Other'}
                size={38}
              />
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-semibold text-slate-800"
                >
                  {e.type === 'SALARY' ? 'Salary' : 'Other'}
                </Text>
                <Text numberOfLines={1} className="text-xs text-slate-500">
                  {e.note ? `${e.note} · ` : ''}
                  {e.member}
                </Text>
                {(isAdmin || e.userId === myId || e.createdById === myId) && (
                  <View className="mt-1.5 flex-row gap-4">
                    <Pressable
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit income ${e.type === 'SALARY' ? 'Salary' : 'Other'} for ${e.member}`}
                      className="py-1"
                      onPress={() => {
                        setEditing(e);
                        setType(e.type);
                        setMemberId(e.userId);
                        setAmount(toRupeesText(e.amountPaise));
                        setNote(e.note ?? '');
                        setMonth(e.month);
                      }}
                    >
                      <Text className="text-sm font-medium text-primary-600">
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete income ${e.type === 'SALARY' ? 'Salary' : 'Other'} for ${e.member}`}
                      className="py-1"
                      onPress={() =>
                        confirmDelete(
                          e.id,
                          `${e.type === 'SALARY' ? 'Salary' : 'Other'}${e.note ? ` (${e.note})` : ''}: ${inr(e.amountPaise)}`
                        )
                      }
                    >
                      <Text className="text-sm font-medium text-rose-600">
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                className="shrink-0 text-sm font-semibold text-emerald-600"
              >
                +{inr(e.amountPaise)}
              </Text>
            </View>
          ))}
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon={Wallet}
            title="No income recorded"
            text="Add a salary or other income for this month."
          />
        </Panel>
      )}
    </Screen>
  );
}
