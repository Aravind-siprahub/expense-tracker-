import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { dateString, formatAmountInput, inr, toPaise, toRupeesText } from '../lib/format';
import type { Category, Expense } from '../lib/types';
import { Btn, Chip, Field, Loading, Notice, Panel, Screen, useMe } from '../ui';
import { useSavedMethods } from '../PaymentMethods';

const methods = [
  ['CASH', 'Cash'],
  ['UPI', 'UPI'],
  ['CARD', 'Card'],
  ['BANK_TRANSFER', 'Bank Transfer'],
] as const;

/** Which kind of saved method a payment method can use (Cash and UPI use none). */
const savedKind = (method: string): 'CARD' | 'BANK' | null =>
  method === 'CARD' ? 'CARD' : method === 'BANK_TRANSFER' ? 'BANK' : null;

function Radio({ on, onPress, children }: { on: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      className={`flex-row items-center gap-3 rounded-xl border px-3 py-3 ${on ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}
    >
      <View className={`h-5 w-5 items-center justify-center rounded-full border ${on ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
        {on && <Text className="text-xs font-bold text-white">✓</Text>}
      </View>
      {children}
    </Pressable>
  );
}

export function ExpenseFormScreen() {
  const route = useRoute<any>();
  const id: string | undefined = route.params?.id;
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const existing = useQuery({
    queryKey: ['expense', id],
    queryFn: () => api<Expense>('GET', `/expenses/${id}`),
    enabled: !!id,
  });

  if (cats.isLoading || (id && existing.isLoading)) {
    return <Screen><Loading /></Screen>;
  }
  if (id && existing.error) {
    return <Screen><Notice error={existing.error} /></Screen>;
  }
  return <Form key={existing.data?.id ?? 'new'} id={id} initial={existing.data} cats={cats.data ?? []} />;
}

function Form({ id, initial, cats }: { id?: string; initial?: Expense; cats: Category[] }) {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(initial ? toRupeesText(initial.amountPaise) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [date, setDate] = useState(initial?.date ?? dateString());
  const [method, setMethod] = useState<string>(initial?.paymentMethod ?? 'UPI');
  const [savedId, setSavedId] = useState<string | null>(initial?.paymentMethodId ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const me = useMe();
  const saved = useSavedMethods();
  // Saved cards and accounts are private: only the person who made the expense can link or change one.
  const isOwner = !initial || initial.userId === me.data?.user.id;
  const kind = savedKind(method);
  const options = (saved.data ?? []).filter((m) => m.type === kind);
  const defaultFor = (k: 'CARD' | 'BANK' | null) => (saved.data ?? []).find((m) => m.type === k && m.isDefault)?.id ?? null;

  // Pick the default card / account once the list has loaded (only when adding, never overriding a choice).
  useEffect(() => {
    if (!initial && isOwner && savedId === null && kind && saved.data) setSavedId(defaultFor(kind));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  function chooseMethod(value: string) {
    setMethod(value);
    // Switching between Card and Bank Transfer (or to Cash / UPI) starts over with that kind's default.
    setSavedId(isOwner ? defaultFor(savedKind(value)) : null);
  }

  // A saved method deleted after this expense was recorded stays attached and is shown as removed.
  const removedCurrent =
    initial?.paymentMethodRemoved && initial.paymentMethodId && savedId === initial.paymentMethodId && method === initial.paymentMethod
      ? initial.paymentMethodLabel
      : null;

  const save = useMutation({
    mutationFn: (body: object) =>
      id ? api<Expense>('PATCH', `/expenses/${id}`, body) : api<Expense>('POST', '/expenses', body),
    onSuccess: (saved) => {
      for (const key of ['expenses', 'expense', 'summary', 'budget', 'family']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      if (saved.alert) setAlert(`${saved.alert.category} is now over budget by ${inr(saved.alert.overByPaise)}.`);
      else nav.goBack();
    },
  });

  function submit() {
    setFormError(null);
    const paise = toPaise(amount);
    if (!paise) return setFormError('Enter an amount greater than 0');
    if (!categoryId) return setFormError('Choose a category');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setFormError('Date must look like 2026-11-16');
    save.mutate({
      amountPaise: paise,
      categoryId,
      date,
      paymentMethod: method,
      note: note.trim() || undefined,
      // Only the owner sends the saved method (null clears it); others leave it untouched.
      ...(isOwner ? { paymentMethodId: kind ? savedId : null } : {}),
    });
  }

  return (
    <Screen>
      <Notice error={formError ?? save.error} />
      {alert && (
        <>
          <Notice tone="warn">⚠️ {alert}</Notice>
          <Btn label="Done" onPress={() => nav.goBack()} />
        </>
      )}
      <Panel>
        <Field label="Amount (₹)" value={amount} onChangeText={(t) => setAmount(formatAmountInput(t))} keyboardType="decimal-pad" placeholder="1000" autoFocus={!id} />
      </Panel>
      <Panel title="Category">
        <View className="flex-row flex-wrap gap-2">
          {cats.map((c) => (
            <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>
      </Panel>
      <Panel title="Payment method">
        <View className="flex-row flex-wrap gap-2">
          {methods.map(([value, label]) => (
            <Chip key={value} label={label} active={method === value} onPress={() => chooseMethod(value)} />
          ))}
        </View>
        {kind && (
          <View className="mt-4 gap-2">
            <Text className="text-xs font-medium text-gray-600">{kind === 'CARD' ? 'Which card?' : 'Which bank account?'}</Text>
            {!isOwner ? (
              <Text className="text-xs text-gray-500">Saved cards and accounts are private to the person who recorded this expense.</Text>
            ) : saved.isLoading ? (
              <Text className="text-xs text-gray-400">Loading your saved {kind === 'CARD' ? 'cards' : 'accounts'}…</Text>
            ) : saved.error ? (
              <Text className="text-xs text-red-600">Could not load your saved methods. You can still save without one.</Text>
            ) : (
              <>
                {options.map((m) => (
                  <Radio key={m.id} on={savedId === m.id} onPress={() => setSavedId(m.id)}>
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900">{m.nickname || (kind === 'CARD' ? 'Card' : 'Bank account')}</Text>
                      <Text className="text-xs text-gray-500">•••• {m.lastFour}{m.isDefault ? '  ·  ★ Default' : ''}</Text>
                    </View>
                  </Radio>
                ))}
                {removedCurrent && (
                  <Radio on onPress={() => undefined}>
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900">{removedCurrent}</Text>
                      <Text className="text-xs text-gray-400">removed</Text>
                    </View>
                  </Radio>
                )}
                <Radio on={savedId === null} onPress={() => setSavedId(null)}>
                  <Text className="flex-1 text-gray-600">
                    {options.length || removedCurrent ? 'Don’t link a saved ' : 'No saved '}
                    {kind === 'CARD' ? 'card' : 'account'}
                  </Text>
                </Radio>
                {options.length === 0 && (
                  <Text className="text-xs text-gray-500">
                    You have no saved {kind === 'CARD' ? 'cards' : 'bank accounts'} yet. Add one in More → Settings.
                  </Text>
                )}
              </>
            )}
          </View>
        )}
      </Panel>
      <Panel title="Date">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <Chip label="Today" active={date === dateString()} onPress={() => setDate(dateString())} />
          <Chip label="Yesterday" active={date === dateString(-1)} onPress={() => setDate(dateString(-1))} />
        </ScrollView>
        <Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      </Panel>
      <Panel>
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Petrol" maxLength={200} />
      </Panel>
      <Btn label={save.isPending ? 'Saving…' : 'Save'} onPress={submit} disabled={save.isPending} />
      <Btn label="Cancel" variant="ghost" onPress={() => nav.goBack()} />
      <Text />
    </Screen>
  );
}
