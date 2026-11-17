'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, Landmark, Smartphone, TriangleAlert, type LucideIcon } from 'lucide-react';
import { api } from '../_lib/api';
import { formatAmountInput, inr, toPaise, toRupeesText, today } from '../_lib/format';
import type { Category, Expense } from '../_lib/types';
import { Label, Loading, Notice, PageHeader, Panel, btn, btnGhost, input } from './Shell';

const methods: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
];

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
  const [amount, setAmount] = useState(initial ? toRupeesText(initial.amountPaise) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [method, setMethod] = useState<string>(initial?.paymentMethod ?? 'UPI');
  const [note, setNote] = useState(initial?.note ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: object) =>
      id ? api<Expense>('PATCH', `/expenses/${id}`, body) : api<Expense>('POST', '/expenses', body),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['budget'] });
      qc.invalidateQueries({ queryKey: ['family'] });
      if (saved.alert) setAlert(`${saved.alert.category} is now over budget by ${inr(saved.alert.overByPaise)}.`);
      else router.push('/dashboard');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const paise = toPaise(amount);
    if (!paise) return setFormError('Enter an amount greater than 0');
    if (!categoryId) return setFormError('Choose a category');
    save.mutate({ amountPaise: paise, categoryId, date, paymentMethod: method, note: note.trim() || undefined });
  }

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
                    onClick={() => setMethod(value)}
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
