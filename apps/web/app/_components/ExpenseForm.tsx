'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Check, CreditCard, Landmark, Smartphone, Star, TriangleAlert, type LucideIcon } from 'lucide-react';
import { api } from '../_lib/api';
import { formatAmountInput, inr, toPaise, toRupeesText, today } from '../_lib/format';
import type { Category, Expense, SavedMethod } from '../_lib/types';
import { Label, Loading, Notice, PageHeader, Panel, btn, btnGhost, input, useMe } from './Shell';
import { useSavedMethods } from './PaymentMethods';

const methods: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
];

/** Which kind of saved method a payment method can use (Cash and UPI use none). */
const savedKind = (method: string): 'CARD' | 'BANK' | null =>
  method === 'CARD' ? 'CARD' : method === 'BANK_TRANSFER' ? 'BANK' : null;

export function ExpenseForm({ id }: { id?: string }) {
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const existing = useQuery({
    queryKey: ['expense', id],
    queryFn: () => api<Expense>('GET', `/expenses/${id}`),
    enabled: !!id,
  });

  if ((id && existing.isLoading) || cats.isLoading) return <Loading />;
  if (id && existing.error) return <Notice error={existing.error} />;

  return <Form key={existing.data?.id ?? 'new'} id={id} initial={existing.data} cats={cats.data ?? []} />;
}

function Form({ id, initial, cats }: { id?: string; initial?: Expense; cats: Category[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const saved = useSavedMethods();
  const [amount, setAmount] = useState(initial ? toRupeesText(initial.amountPaise) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [method, setMethod] = useState<string>(initial?.paymentMethod ?? 'UPI');
  const [savedId, setSavedId] = useState<string | null>(initial?.paymentMethodId ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  // Saved cards and accounts are private: only the person who made the expense can link or change one.
  const isOwner = !initial || initial.userId === me.data?.user.id;
  const kind = savedKind(method);
  const options: SavedMethod[] = (saved.data ?? []).filter((m) => m.type === kind);
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

  const save = useMutation({
    mutationFn: (body: object) =>
      id ? api<Expense>('PATCH', `/expenses/${id}`, body) : api<Expense>('POST', '/expenses', body),
    onSuccess: (done) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['budget'] });
      qc.invalidateQueries({ queryKey: ['family'] });
      if (done.alert) setAlert(`${done.alert.category} is now over budget by ${inr(done.alert.overByPaise)}.`);
      else router.push('/dashboard');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const paise = toPaise(amount);
    if (!paise) return setFormError('Enter an amount greater than 0');
    if (!categoryId) return setFormError('Choose a category');
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

  // A saved method that was deleted after this expense was recorded stays attached and is shown as removed.
  const removedCurrent =
    initial?.paymentMethodRemoved && initial.paymentMethodId && savedId === initial.paymentMethodId && method === initial.paymentMethod
      ? initial.paymentMethodLabel
      : null;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={id ? 'Edit Expense' : 'Add Expense'} subtitle="Takes under 30 seconds" />
      <Notice error={formError ?? save.error} />
      {alert && (
        <Notice tone="warn">
          <span className="flex items-center gap-2">
            <TriangleAlert size={16} /> {alert}{' '}
            <Link href="/dashboard" className="font-semibold underline">Go to Dashboard</Link>
          </span>
        </Notice>
      )}
      <Panel>
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <Label>Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-400">₹</span>
              <input
                inputMode="decimal"
                className={`${input} !py-3.5 !pl-10 text-2xl font-semibold`}
                placeholder="1,000"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <select className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="" disabled>Select category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>Payment method</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {methods.map(({ value, label, icon: Icon }) => {
                const on = method === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => chooseMethod(value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                      on
                        ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                );
              })}
            </div>

            {kind && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 text-xs font-medium text-slate-500">
                  {kind === 'CARD' ? 'Which card?' : 'Which bank account?'}
                </div>
                {!isOwner ? (
                  <p className="text-xs text-slate-500">
                    Saved cards and accounts are private to the person who recorded this expense.
                  </p>
                ) : saved.isLoading ? (
                  <p className="text-xs text-slate-400">Loading your saved {kind === 'CARD' ? 'cards' : 'accounts'}…</p>
                ) : saved.error ? (
                  <p className="text-xs text-rose-600">Could not load your saved methods. You can still save without one.</p>
                ) : (
                  <div role="radiogroup" aria-label="Saved payment method" className="space-y-1.5">
                    {options.map((m) => (
                      <SavedOption key={m.id} on={savedId === m.id} onSelect={() => setSavedId(m.id)} icon={kind === 'CARD' ? CreditCard : Landmark}>
                        <span className="flex-1 truncate font-medium">{m.nickname || (kind === 'CARD' ? 'Card' : 'Bank account')}</span>
                        <span className="font-mono text-xs text-slate-400">•••• {m.lastFour}</span>
                        {m.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                            <Star size={11} /> Default
                          </span>
                        )}
                      </SavedOption>
                    ))}
                    {removedCurrent && (
                      <SavedOption on onSelect={() => undefined} icon={kind === 'CARD' ? CreditCard : Landmark}>
                        <span className="flex-1 truncate font-medium">{removedCurrent}</span>
                        <span className="text-xs text-slate-400">removed</span>
                      </SavedOption>
                    )}
                    <SavedOption on={savedId === null} onSelect={() => setSavedId(null)}>
                      <span className="flex-1 text-slate-600">
                        {options.length || removedCurrent ? 'Don’t link a saved ' : 'No saved '}
                        {kind === 'CARD' ? 'card' : 'account'}
                      </span>
                    </SavedOption>
                    {options.length === 0 && (
                      <p className="pt-1 text-xs text-slate-500">
                        You have no saved {kind === 'CARD' ? 'cards' : 'bank accounts'} yet.{' '}
                        <Link href="/settings" className="font-medium text-primary-600 hover:underline">
                          Add one in Settings
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label>Note (optional)</Label>
            <input className={input} placeholder="Petrol" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" className={`${btn} flex-1 !py-3`} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
            <Link href="/expenses" className={`${btnGhost} flex-1 !py-3`}>Cancel</Link>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function SavedOption({
  on,
  onSelect,
  icon: Icon,
  children,
}: {
  on: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition ${
        on ? 'border-primary-500 bg-white text-primary-800 shadow-sm' : 'border-transparent bg-white/60 text-slate-700 hover:bg-white'
      }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300'}`}>
        {on && <Check size={11} strokeWidth={3} />}
      </span>
      {Icon && <Icon size={16} className="shrink-0 text-slate-400" />}
      {children}
    </button>
  );
}
