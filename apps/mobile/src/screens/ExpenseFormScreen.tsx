import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { dateString, formatAmountInput, inr, toPaise, toRupeesText } from '../lib/format';
import type { Category, Expense } from '../lib/types';
import { Btn, Chip, Field, Loading, Notice, Panel, Screen } from '../ui';

const methods = [
  ['CASH', 'Cash'],
  ['UPI', 'UPI'],
  ['CARD', 'Card'],
  ['BANK_TRANSFER', 'Bank Transfer'],
] as const;

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
  const [note, setNote] = useState(initial?.note ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

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
    save.mutate({ amountPaise: paise, categoryId, date, paymentMethod: method, note: note.trim() || undefined });
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
            <Chip key={value} label={label} active={method === value} onPress={() => setMethod(value)} />
          ))}
        </View>
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
