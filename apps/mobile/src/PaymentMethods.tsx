import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Check, CreditCard, Eye, EyeOff, Landmark, Pencil, Plus, Star, Trash2, X } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import type { SavedMethod } from './lib/types';
import { Btn, IconTile, Loading, Notice, Panel, colors } from './ui';
import { RefField, type InputRef } from './screens/AuthScreen';

export const SAVED_METHODS_KEY = ['payment-methods'];

/** The logged-in user's saved cards and bank accounts. Shared by Settings and Add Expense. */
export function useSavedMethods() {
  return useQuery({
    queryKey: SAVED_METHODS_KEY,
    queryFn: async () => (await api<{ items: SavedMethod[] }>('GET', '/payment-methods')).items,
  });
}

const digits = (s: string) => s.replace(/\D/g, '');

/** Settings section: add, edit, delete and choose defaults for cards and bank accounts. */
export function PaymentMethodsSection() {
  const methods = useSavedMethods();
  const items = methods.data ?? [];
  return (
    <View className="mt-2 gap-3">
      <View>
        <Text className="text-lg font-bold tracking-tight text-slate-900">Payment methods</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Save your cards and bank accounts to pick them quickly when adding an expense. Only you can see them.
        </Text>
      </View>
      <Notice error={methods.error} />
      {methods.isLoading ? (
        <Loading />
      ) : (
        <>
          <Section kind="CARD" items={items.filter((m) => m.type === 'CARD')} />
          <Section kind="BANK" items={items.filter((m) => m.type === 'BANK')} />
        </>
      )}
    </View>
  );
}

function Section({ kind, items }: { kind: 'CARD' | 'BANK'; items: SavedMethod[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<'add' | string | null>(null); // 'add' or the id being edited
  const isCard = kind === 'CARD';
  const refresh = () => {
    for (const key of [SAVED_METHODS_KEY[0], 'expenses', 'expense']) qc.invalidateQueries({ queryKey: [key] });
  };
  const makeDefault = useMutation({
    mutationFn: (id: string) => api('POST', `/payment-methods/${id}/default`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api('DELETE', `/payment-methods/${id}`),
    onSuccess: refresh,
  });
  const confirmDelete = (id: string) =>
    Alert.alert(`Delete this ${isCard ? 'card' : 'bank account'}?`, 'Past expenses that used it are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  const busy = makeDefault.isPending || remove.isPending;

  return (
    <Panel
      title={isCard ? 'Cards' : 'Bank accounts'}
      icon={isCard ? CreditCard : Landmark}
      tone={isCard ? 'purple' : 'teal'}
      action={
        form === null ? (
          <Pressable
            onPress={() => setForm('add')}
            accessibilityRole="button"
            accessibilityLabel={isCard ? 'Add card' : 'Add bank account'}
            hitSlop={6}
            className="flex-row items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 active:bg-slate-50"
          >
            <Plus size={14} color={colors.text2} />
            <Text className="text-xs font-semibold text-slate-700">{isCard ? 'Add card' : 'Add bank account'}</Text>
          </Pressable>
        ) : undefined
      }
    >
      <Notice error={makeDefault.error ?? remove.error} />
      {form !== null && (
        <View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <MethodForm
            kind={kind}
            existing={form === 'add' ? undefined : items.find((m) => m.id === form)}
            onDone={() => {
              setForm(null);
              refresh();
            }}
            onCancel={() => setForm(null)}
          />
        </View>
      )}
      {items.length === 0 && form === null ? (
        <Text className="py-3 text-sm text-slate-500">
          {isCard
            ? 'No saved cards yet. Save a card to pick it quickly when you add an expense. Only the last 4 digits are stored.'
            : 'No saved bank accounts yet. Your account number is stored encrypted.'}
        </Text>
      ) : (
        items.map((m, idx) => (
          <View key={m.id} className={`py-3.5 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
            <View className="flex-row items-center gap-3">
              <IconTile icon={isCard ? CreditCard : Landmark} tone={isCard ? 'purple' : 'teal'} />
              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text numberOfLines={1} className="shrink text-sm font-semibold text-slate-800">
                    {m.nickname || (isCard ? 'Card' : 'Bank account')}
                  </Text>
                  {isCard && m.cardType ? (
                    <View className="rounded-full bg-slate-100 px-2 py-0.5">
                      <Text className="text-[11px] font-medium text-slate-500">{m.cardType === 'CREDIT' ? 'Credit' : 'Debit'}</Text>
                    </View>
                  ) : null}
                  {m.isDefault ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5">
                      <Star size={11} color={colors.primaryDark} />
                      <Text className="text-[11px] font-medium text-primary-700">Default</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs tracking-wide text-slate-500">{m.maskedNumber}</Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  className="p-2"
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${m.nickname || (isCard ? 'card' : 'bank account')} ${m.maskedNumber}`}
                  onPress={() => setForm(m.id)}
                >
                  <Pencil size={16} color={colors.faint} />
                </Pressable>
                <Pressable
                  className={`p-2 ${busy ? 'opacity-50' : ''}`}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${m.nickname || (isCard ? 'card' : 'bank account')} ${m.maskedNumber}`}
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={() => confirmDelete(m.id)}
                >
                  <Trash2 size={16} color={colors.faint} />
                </Pressable>
              </View>
            </View>
            {!m.isDefault && (
              <Pressable
                className="ml-[52px] mt-1 self-start py-1"
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Set ${m.nickname || (isCard ? 'card' : 'bank account')} as default`}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => makeDefault.mutate(m.id)}
              >
                <Text className="text-xs font-medium text-primary-600">Set default</Text>
              </Pressable>
            )}
            {!isCard && <RevealAccount id={m.id} />}
          </View>
        ))
      )}
    </Panel>
  );
}

/** "Show full account number": needs the password again and hides itself after 15 seconds. */
function RevealAccount({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [number, setNumber] = useState<string | null>(null);
  const reveal = useMutation({
    mutationFn: () => api<{ accountNumber: string }>('POST', `/payment-methods/${id}/reveal`, { password }),
    onSuccess: (r) => {
      setNumber(r.accountNumber);
      setPassword('');
    },
  });

  useEffect(() => {
    if (!number) return;
    const timer = setTimeout(() => setNumber(null), 15_000);
    return () => clearTimeout(timer);
  }, [number]);

  const close = () => {
    setOpen(false);
    setNumber(null);
    setPassword('');
    reveal.reset();
  };

  if (!open) {
    return (
      <Pressable
        className="ml-[52px] mt-1 flex-row items-center gap-1.5 self-start py-1"
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Show full account number"
        onPress={() => setOpen(true)}
      >
        <Eye color={colors.muted} size={14} />
        <Text className="text-xs font-medium text-slate-500">Show full account number</Text>
      </Pressable>
    );
  }
  if (number) {
    return (
      <View className="ml-[52px] mt-2 gap-1.5">
        <Text selectable className="self-start rounded-lg bg-slate-100 px-3 py-1.5 text-sm tracking-wider text-slate-800">
          {number}
        </Text>
        <Text className="text-xs text-slate-400">Hides itself in 15 seconds</Text>
        <Pressable
          className="flex-row items-center gap-1 self-start py-1"
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Hide full account number"
          onPress={close}
        >
          <EyeOff color={colors.muted} size={14} />
          <Text className="text-xs font-medium text-slate-500">Hide</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View className="ml-[52px] mt-2 gap-2">
      <RefField
        label="Your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Enter your password"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={() => {
          if (password && !reveal.isPending) reveal.mutate();
        }}
      />
      {reveal.error && <Text accessibilityRole="alert" className="text-xs text-rose-600">{reveal.error.message}</Text>}
      <View className="flex-row gap-3">
        <View className="flex-1"><Btn label={reveal.isPending ? 'Checking…' : 'Show'} onPress={() => reveal.mutate()} disabled={reveal.isPending || !password} /></View>
        <View className="flex-1"><Btn variant="ghost" label="Cancel" onPress={close} /></View>
      </View>
    </View>
  );
}

function MethodForm({
  kind,
  existing,
  onDone,
  onCancel,
}: {
  kind: 'CARD' | 'BANK';
  existing?: SavedMethod;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isCard = kind === 'CARD';
  const editing = !!existing;
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [cardType, setCardType] = useState<'CREDIT' | 'DEBIT'>(existing?.cardType ?? 'CREDIT');
  const [lastFour, setLastFour] = useState(isCard ? (existing?.lastFour ?? '') : '');
  const [account, setAccount] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [changeNumber, setChangeNumber] = useState(!editing);
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [error, setError] = useState<string | null>(null);
  const lastFourRef = useRef<InputRef>(null);
  const accountRef = useRef<InputRef>(null);
  const confirmRef = useRef<InputRef>(null);
  const nicknameRef = useRef<InputRef>(null);

  const save = useMutation({
    mutationFn: (body: object) =>
      editing ? api('PATCH', `/payment-methods/${existing!.id}`, body) : api('POST', '/payment-methods', body),
    onSuccess: onDone,
  });

  function submit() {
    setError(null);
    const body: Record<string, unknown> = {};
    if (!editing) body.type = kind;
    if (isCard) {
      if (nickname.trim().length < 2) return setError('Give the card a nickname, for example "HDFC Credit Card".');
      if (!/^\d{4}$/.test(lastFour)) return setError('Enter exactly the last 4 digits of the card.');
      Object.assign(body, { nickname: nickname.trim(), cardType, lastFour });
    } else {
      if (nickname.trim()) body.nickname = nickname.trim();
      if (changeNumber) {
        const a = digits(account);
        if (a.length < 9 || a.length > 18) return setError('Account number must be 9 to 18 digits.');
        if (a !== digits(confirmAccount)) return setError('The account numbers do not match.');
        body.accountNumber = a;
        body.confirmAccountNumber = digits(confirmAccount);
      }
    }
    if (isDefault && !existing?.isDefault) body.isDefault = true;
    if (editing && !Object.keys(body).length) return onCancel();
    save.mutate(body);
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-800">
          {editing ? 'Edit' : 'Add'} {isCard ? 'card' : 'bank account'}
        </Text>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={`Close ${editing ? 'edit' : 'add'} ${isCard ? 'card' : 'bank account'} form`} onPress={onCancel}>
          <X size={16} color={colors.faint} />
        </Pressable>
      </View>
      <Notice error={error ?? save.error} />
      {isCard ? (
        <>
          <RefField
            label="Card nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. HDFC Credit Card"
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => lastFourRef.current?.focus()}
          />
          <View>
            <Text className="mb-1.5 text-xs font-medium text-slate-500">Card type</Text>
            <View className="flex-row gap-2" accessibilityRole="radiogroup">
              {(['CREDIT', 'DEBIT'] as const).map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityLabel={t === 'CREDIT' ? 'Credit card' : 'Debit card'}
                  accessibilityState={{ selected: cardType === t }}
                  onPress={() => setCardType(t)}
                  className={`flex-1 items-center rounded-xl border px-3 py-2.5 ${
                    cardType === t ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text className={`text-sm ${cardType === t ? 'font-semibold text-primary-700' : 'text-slate-600'}`}>
                    {t === 'CREDIT' ? 'Credit' : 'Debit'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <RefField
            ref={lastFourRef}
            label="Last 4 digits"
            value={lastFour}
            onChangeText={(t) => setLastFour(digits(t).slice(0, 4))}
            keyboardType="number-pad"
            placeholder="1234"
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Text className="text-xs text-slate-400">We never ask for the full card number, expiry, CVV or PIN.</Text>
        </>
      ) : (
        <>
          {editing && !changeNumber ? (
            <View className="flex-row items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5">
              <Text numberOfLines={1} className="shrink tracking-wider text-slate-600">{existing!.maskedNumber}</Text>
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Change account number" onPress={() => setChangeNumber(true)}>
                <Text className="text-xs font-medium text-primary-600">Change account number</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <RefField
                ref={accountRef}
                label="Account number"
                value={account}
                onChangeText={(t) => setAccount(digits(t).slice(0, 18))}
                secureTextEntry
                keyboardType="number-pad"
                placeholder="Account number"
                autoComplete="off"
                textContentType="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <RefField
                ref={confirmRef}
                label="Confirm account number"
                value={confirmAccount}
                onChangeText={(t) => setConfirmAccount(digits(t).slice(0, 18))}
                keyboardType="number-pad"
                placeholder="Re-enter account number"
                autoComplete="off"
                textContentType="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => nicknameRef.current?.focus()}
              />
            </>
          )}
          <RefField
            ref={nicknameRef}
            label="Nickname (optional)"
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. Salary account"
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Text className="text-xs text-slate-400">Stored encrypted. Only the last 4 digits are ever shown.</Text>
        </>
      )}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Set as default ${isCard ? 'card' : 'bank account'}`}
        accessibilityState={{ checked: isDefault || !!existing?.isDefault, disabled: !!existing?.isDefault }}
        onPress={() => !existing?.isDefault && setIsDefault(!isDefault)}
        className={`flex-row items-center gap-2 ${existing?.isDefault ? 'opacity-60' : ''}`}
      >
        <View className={`h-5 w-5 items-center justify-center rounded border ${isDefault ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'}`}>
          {isDefault && <Check color={colors.white} size={14} />}
        </View>
        <Text className="flex-1 text-sm text-slate-600">
          Set as default {isCard ? 'card' : 'bank account'}
          {existing?.isDefault ? ' (already the default)' : ''}
        </Text>
      </Pressable>
      <View className="flex-row gap-3">
        <View className="flex-1"><Btn label={save.isPending ? 'Saving…' : 'Save'} icon={Check} onPress={submit} disabled={save.isPending} /></View>
        <View className="flex-1"><Btn variant="ghost" label="Cancel" onPress={onCancel} /></View>
      </View>
    </View>
  );
}
