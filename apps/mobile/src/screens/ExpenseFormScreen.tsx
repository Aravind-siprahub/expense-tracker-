import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Smartphone,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  dateString,
  formatAmountInput,
  inr,
  toPaise,
  toRupeesText,
} from '../lib/format';
import type { Category, Expense } from '../lib/types';
import { categoryVisual } from '../categoryIcons';
import {
  Btn,
  Chip,
  DateField,
  Field,
  IconTile,
  Loading,
  Notice,
  Panel,
  Screen,
  TONES,
  colors,
  useMe,
} from '../ui';
import { useSavedMethods } from '../PaymentMethods';

const methods: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
];

/** Which kind of saved method a payment method can use (Cash and UPI use none). */
const savedKind = (method: string): 'CARD' | 'BANK' | null =>
  method === 'CARD' ? 'CARD' : method === 'BANK_TRANSFER' ? 'BANK' : null;

const Label = ({ children }: { children: string }) => (
  <Text className="mb-1.5 text-xs font-medium text-slate-500">{children}</Text>
);

function SavedOption({
  on,
  onPress,
  icon: Icon,
  children,
}: {
  on: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      className={`flex-row items-center gap-2.5 rounded-lg border px-3 py-2.5 ${on ? 'border-primary-500 bg-white' : 'border-transparent bg-white/60'}`}
    >
      <View
        className={`h-4 w-4 items-center justify-center rounded-full border ${on ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}
      >
        {on && <Check color={colors.white} size={11} strokeWidth={3} />}
      </View>
      {Icon && <Icon size={16} color={colors.faint} />}
      {children}
    </Pressable>
  );
}

export function ExpenseFormScreen() {
  const route = useRoute<any>();
  const id: string | undefined = route.params?.id;
  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
  });
  const existing = useQuery({
    queryKey: ['expense', id],
    queryFn: () => api<Expense>('GET', `/expenses/${id}`),
    enabled: !!id,
  });

  if (cats.isLoading || (id && existing.isLoading)) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (id && existing.error) {
    return (
      <Screen>
        <Notice error={existing.error} />
      </Screen>
    );
  }
  return (
    <Form
      key={existing.data?.id ?? 'new'}
      id={id}
      initial={existing.data}
      cats={cats.data ?? []}
    />
  );
}

function Form({
  id,
  initial,
  cats,
}: {
  id?: string;
  initial?: Expense;
  cats: Category[];
}) {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(
    initial ? toRupeesText(initial.amountPaise) : ''
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [date, setDate] = useState(initial?.date ?? dateString());
  const [method, setMethod] = useState<string>(initial?.paymentMethod ?? 'UPI');
  // Undefined means the new expense is still waiting for saved methods to load;
  // null means the person explicitly chose not to attach one.
  const [savedId, setSavedId] = useState<string | null | undefined>(
    initial ? (initial.paymentMethodId ?? null) : undefined
  );
  const [note, setNote] = useState(initial?.note ?? '');
  // A validation message belongs to the values it was raised for: once the amount, category or date changes it is
  // stale, so it is hidden (no effect needed: the key simply stops matching).
  const [formError, setFormError] = useState<{
    message: string;
    key: string;
  } | null>(null);
  // True once the save succeeded: the popup is showing, so Save must not be pressed again (it would add a duplicate).
  const [savedDone, setSavedDone] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);

  const me = useMe();
  const saved = useSavedMethods();
  // Saved cards and accounts are private: only the person who made the expense can link or change one.
  const isOwner = !initial || initial.userId === me.data?.user.id;
  const kind = savedKind(method);
  const options = (saved.data ?? []).filter((m) => m.type === kind);
  const defaultFor = (k: 'CARD' | 'BANK' | null) =>
    (saved.data ?? []).find((m) => m.type === k && m.isDefault)?.id ?? null;

  // Until the person makes an explicit choice, derive the selection from the
  // loaded defaults instead of copying query data into state in an effect.
  const selectedSavedId =
    savedId === undefined && !initial && isOwner && kind && saved.data
      ? defaultFor(kind)
      : (savedId ?? null);

  function chooseMethod(value: string) {
    setMethod(value);
    // Switching between Card and Bank Transfer (or to Cash / UPI) starts over with that kind's default.
    const nextKind = savedKind(value);
    setSavedId(
      isOwner
        ? saved.data
          ? defaultFor(nextKind)
          : nextKind
            ? undefined
            : null
        : null
    );
  }

  // A saved method deleted after this expense was recorded stays attached and is shown as removed.
  const removedCurrent =
    initial?.paymentMethodRemoved &&
    initial.paymentMethodId &&
    selectedSavedId === initial.paymentMethodId &&
    method === initial.paymentMethod
      ? initial.paymentMethodLabel
      : null;

  const save = useMutation({
    mutationFn: (body: object) =>
      id
        ? api<Expense>('PATCH', `/expenses/${id}`, body)
        : api<Expense>('POST', '/expenses', body),
    onSuccess: (done) => {
      for (const key of [
        'expenses',
        'expense',
        'summary',
        'budget',
        'family',
      ]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      setSavedDone(true);
      const categoryName = cats.find((c) => c.id === categoryId)?.name ?? 'Expense';
      const lines = [`${inr(done.amountPaise)} for ${categoryName} was ${id ? 'updated' : 'added'}.`];
      if (done.alert) {
        lines.push(`Heads up: ${done.alert.category} is now over budget by ${inr(done.alert.overByPaise)}.`);
      }
      Alert.alert(id ? 'Expense updated' : 'Expense added', lines.join('\n\n'), [{ text: 'OK', onPress: () => nav.goBack() }], {
        cancelable: false,
      });
    },
  });

  const errorKey = `${amount}|${categoryId}|${date}`;
  const visibleFormError =
    formError && formError.key === errorKey ? formError.message : null;

  function submit() {
    setFormError(null);
    const fail = (message: string) => setFormError({ message, key: errorKey });
    const paise = toPaise(amount);
    if (!paise) return fail('Enter an amount greater than 0');
    if (!categoryId) return fail('Choose a category');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return fail('Date must look like 2026-11-16');
    save.mutate({
      amountPaise: paise,
      categoryId,
      date,
      paymentMethod: method,
      note: note.trim() || undefined,
      // Only the owner sends the saved method (null clears it); others leave it untouched.
      ...(isOwner ? { paymentMethodId: kind ? selectedSavedId : null } : {}),
    });
  }

  const KindIcon = kind === 'CARD' ? CreditCard : Landmark;

  return (
    <Screen
      title={id ? 'Edit Expense' : 'Add Expense'}
      subtitle="Takes under 30 seconds"
    >
      <Panel>
        <View className="gap-5">
          <View>
            <Label>Amount</Label>
            <View
              className={`flex-row items-center rounded-xl border bg-white px-4 ${amountFocused ? 'border-primary-400' : 'border-slate-200'}`}
            >
              <Text className="text-2xl font-semibold text-slate-400">₹</Text>
              <TextInput
                className="flex-1 py-3.5 pl-2 text-2xl font-semibold text-slate-900"
                value={amount}
                onChangeText={(t) => setAmount(formatAmountInput(t))}
                keyboardType="decimal-pad"
                placeholder="1,000"
                placeholderTextColor={colors.faint}
                accessibilityLabel="Amount in rupees"
                autoFocus={!id}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
              />
            </View>
          </View>

          <View>
            <Label>Category</Label>
            <View className="flex-row flex-wrap gap-2">
              {cats.map((c) => {
                const { Icon, tone } = categoryVisual(c.name);
                const on = categoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="radio"
                    accessibilityLabel={c.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => setCategoryId(c.id)}
                    className={`flex-row items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3 ${on ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}
                  >
                    <IconTile icon={Icon} tone={tone} size="sm" />
                    <Text
                      numberOfLines={1}
                      className={`text-sm ${on ? 'font-semibold text-primary-700' : 'text-slate-600'}`}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Label>Date</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
            >
              <Chip
                label="Today"
                active={date === dateString()}
                onPress={() => setDate(dateString())}
              />
              <Chip
                label="Yesterday"
                active={date === dateString(-1)}
                onPress={() => setDate(dateString(-1))}
              />
            </ScrollView>
            {/* Existing validation allows future dates, so no maximumDate. */}
            <DateField
              value={date}
              onChange={setDate}
              placeholder="Select a date"
            />
          </View>

          <View>
            <Label>Payment method</Label>
            <View className="flex-row flex-wrap gap-2">
              {methods.map(({ value, label, icon: Icon }) => {
                const on = method === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: on }}
                    onPress={() => chooseMethod(value)}
                    className={`flex-row items-center justify-center gap-2 rounded-xl border px-3 py-2.5 ${on ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}
                    style={{ width: '48.5%' }}
                  >
                    <Icon
                      size={16}
                      color={on ? colors.primaryDark : colors.muted}
                    />
                    <Text
                      className={`text-sm ${on ? 'font-semibold text-primary-700' : 'text-slate-600'}`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {kind && (
              <View
                className="mt-3 rounded-xl border border-slate-200 p-3"
                style={{ backgroundColor: TONES.slate.card }}
              >
                <Text className="mb-2 text-xs font-medium text-slate-500">
                  {kind === 'CARD' ? 'Which card?' : 'Which bank account?'}
                </Text>
                {!isOwner ? (
                  <Text className="text-xs text-slate-500">
                    Saved cards and accounts are private to the person who
                    recorded this expense.
                  </Text>
                ) : saved.isLoading ? (
                  <Text className="text-xs text-slate-400">
                    Loading your saved {kind === 'CARD' ? 'cards' : 'accounts'}…
                  </Text>
                ) : saved.error ? (
                  <Text className="text-xs text-rose-600">
                    Could not load your saved methods. You can still save
                    without one.
                  </Text>
                ) : (
                  <View className="gap-1.5">
                    {options.map((m) => (
                      <SavedOption
                        key={m.id}
                        on={selectedSavedId === m.id}
                        onPress={() => setSavedId(m.id)}
                        icon={KindIcon}
                      >
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-sm font-medium text-slate-800"
                        >
                          {m.nickname ||
                            (kind === 'CARD' ? 'Card' : 'Bank account')}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          •••• {m.lastFour}
                        </Text>
                        {m.isDefault && (
                          <View className="flex-row items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5">
                            <Star size={11} color={colors.primaryDark} />
                            <Text className="text-[11px] font-medium text-primary-700">
                              Default
                            </Text>
                          </View>
                        )}
                      </SavedOption>
                    ))}
                    {removedCurrent && (
                      <SavedOption on onPress={() => undefined} icon={KindIcon}>
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-sm font-medium text-slate-800"
                        >
                          {removedCurrent}
                        </Text>
                        <Text className="text-xs text-slate-400">removed</Text>
                      </SavedOption>
                    )}
                    <SavedOption
                      on={selectedSavedId === null}
                      onPress={() => setSavedId(null)}
                    >
                      <Text className="flex-1 text-sm text-slate-600">
                        {options.length || removedCurrent
                          ? 'Don’t link a saved '
                          : 'No saved '}
                        {kind === 'CARD' ? 'card' : 'account'}
                      </Text>
                    </SavedOption>
                    {options.length === 0 && (
                      <Text className="pt-1 text-xs text-slate-500">
                        You have no saved{' '}
                        {kind === 'CARD' ? 'cards' : 'bank accounts'} yet. Add
                        one in More → Settings.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          <Field
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Petrol"
            maxLength={200}
            returnKeyType="done"
          />
        </View>
      </Panel>
      {/* Shown right above Save so a mistake is visible where the person just pressed (the form is taller than the screen). */}
      <Notice error={visibleFormError ?? save.error} />
      <Btn
        label={save.isPending ? 'Saving…' : 'Save'}
        onPress={submit}
        disabled={save.isPending || savedDone}
      />
      <Btn label="Cancel" variant="ghost" onPress={() => nav.goBack()} />
      <View style={{ height: 16 }} />
    </Screen>
  );
}
