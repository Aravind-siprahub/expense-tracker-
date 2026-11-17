import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import type { SavedMethod } from './lib/types';
import { Btn, Chip, Field, Loading, Notice, Panel } from './ui';

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
    <View className="gap-3">
      <Text className="mt-2 text-lg font-bold text-gray-900">Payment methods</Text>
      <Text className="-mt-2 text-sm text-gray-500">
        Save your cards and bank accounts to pick them quickly when adding an expense. Only you can see them.
      </Text>
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

  return (
    <Panel title={isCard ? 'Cards' : 'Bank accounts'}>
      <Notice error={makeDefault.error ?? remove.error} />
      {form !== null ? (
        <MethodForm
          kind={kind}
          existing={form === 'add' ? undefined : items.find((m) => m.id === form)}
          onDone={() => {
            setForm(null);
            refresh();
          }}
          onCancel={() => setForm(null)}
        />
      ) : (
        <>
          {items.length === 0 && (
            <Text className="mb-3 text-sm text-gray-500">
              {isCard
                ? 'No saved cards yet. Only the last 4 digits are stored.'
                : 'No saved bank accounts yet. Your account number is stored encrypted.'}
            </Text>
          )}
          {items.map((m) => (
            <View key={m.id} className="border-b border-gray-100 py-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-gray-900">
                    {m.nickname || (isCard ? 'Card' : 'Bank account')}
                    {m.cardType ? `  ·  ${m.cardType === 'CREDIT' ? 'Credit' : 'Debit'}` : ''}
                    {m.isDefault ? '  ★ Default' : ''}
                  </Text>
                  <Text className="mt-0.5 text-xs tracking-wider text-gray-500">{m.maskedNumber}</Text>
                </View>
              </View>
              <View className="mt-2 flex-row flex-wrap gap-x-5 gap-y-1">
                {!m.isDefault && (
                  <Text className="text-sm text-primary-600" onPress={() => makeDefault.mutate(m.id)}>Set default</Text>
                )}
                <Text className="text-sm text-primary-600" onPress={() => setForm(m.id)}>Edit</Text>
                <Text className="text-sm text-red-600" onPress={() => confirmDelete(m.id)}>Delete</Text>
              </View>
              {!isCard && <RevealAccount id={m.id} />}
            </View>
          ))}
          <View className="mt-3">
            <Btn variant="ghost" label={isCard ? '+ Add card' : '+ Add bank account'} onPress={() => setForm('add')} />
          </View>
        </>
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
      <Text className="mt-2 text-sm text-gray-500" onPress={() => setOpen(true)}>👁 Show full account number</Text>
    );
  }
  if (number) {
    return (
      <View className="mt-2 gap-1">
        <Text selectable className="rounded-lg bg-gray-100 px-3 py-2 font-semibold tracking-widest text-gray-900">{number}</Text>
        <Text className="text-xs text-gray-400">Hides itself in 15 seconds</Text>
        <Text className="text-sm text-primary-600" onPress={close}>Hide</Text>
      </View>
    );
  }
  return (
    <View className="mt-2 gap-2">
      <Field value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter your password" autoCapitalize="none" />
      {reveal.error && <Text className="text-xs text-red-600">{reveal.error.message}</Text>}
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
    <View className="gap-3">
      <Text className="font-semibold text-gray-900">
        {editing ? 'Edit' : 'Add'} {isCard ? 'card' : 'bank account'}
      </Text>
      <Notice error={error ?? save.error} />
      {isCard ? (
        <>
          <Field label="Card nickname" value={nickname} onChangeText={setNickname} placeholder="e.g. HDFC Credit Card" maxLength={40} />
          <View>
            <Text className="mb-1 text-xs font-medium text-gray-600">Card type</Text>
            <View className="flex-row gap-2">
              <Chip label="Credit" active={cardType === 'CREDIT'} onPress={() => setCardType('CREDIT')} />
              <Chip label="Debit" active={cardType === 'DEBIT'} onPress={() => setCardType('DEBIT')} />
            </View>
          </View>
          <Field label="Last 4 digits" value={lastFour} onChangeText={(t) => setLastFour(digits(t).slice(0, 4))} keyboardType="number-pad" placeholder="1234" maxLength={4} />
          <Text className="text-xs text-gray-400">We never ask for the full card number, expiry, CVV or PIN.</Text>
        </>
      ) : (
        <>
          {editing && !changeNumber ? (
            <View className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-3">
              <Text className="tracking-wider text-gray-600">{existing!.maskedNumber}</Text>
              <Text className="text-sm text-primary-600" onPress={() => setChangeNumber(true)}>Change number</Text>
            </View>
          ) : (
            <>
              <Field label="Account number" value={account} onChangeText={(t) => setAccount(digits(t).slice(0, 18))} secureTextEntry keyboardType="number-pad" placeholder="Account number" />
              <Field label="Confirm account number" value={confirmAccount} onChangeText={(t) => setConfirmAccount(digits(t).slice(0, 18))} keyboardType="number-pad" placeholder="Re-enter account number" />
            </>
          )}
          <Field label="Nickname (optional)" value={nickname} onChangeText={setNickname} placeholder="e.g. Salary account" maxLength={40} />
          <Text className="text-xs text-gray-400">Stored encrypted. Only the last 4 digits are ever shown.</Text>
        </>
      )}
      <Pressable
        onPress={() => !existing?.isDefault && setIsDefault(!isDefault)}
        className={`flex-row items-center gap-2 ${existing?.isDefault ? 'opacity-60' : ''}`}
      >
        <View className={`h-5 w-5 items-center justify-center rounded border ${isDefault ? 'border-primary-600 bg-primary-600' : 'border-gray-300 bg-white'}`}>
          {isDefault && <Text className="text-xs font-bold text-white">✓</Text>}
        </View>
        <Text className="text-sm text-gray-700">
          Set as default {isCard ? 'card' : 'bank account'}
          {existing?.isDefault ? ' (already the default)' : ''}
        </Text>
      </Pressable>
      <View className="flex-row gap-3">
        <View className="flex-1"><Btn label={save.isPending ? 'Saving…' : 'Save'} onPress={submit} disabled={save.isPending} /></View>
        <View className="flex-1"><Btn variant="ghost" label="Cancel" onPress={onCancel} /></View>
      </View>
    </View>
  );
}
