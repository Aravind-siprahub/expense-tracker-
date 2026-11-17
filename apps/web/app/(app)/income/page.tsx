'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { api } from '../../_lib/api';
import { currentMonth, formatAmountInput, inr, monthLabel, toPaise, toRupeesText } from '../../_lib/format';
import type { FamilyInfo, IncomeEntry } from '../../_lib/types';
import {
  Avatar,
  EmptyState,
  Label,
  Loading,
  MonthPicker,
  Notice,
  PageHeader,
  Panel,
  btn,
  btnGhost,
  input,
  useMe,
} from '../../_components/Shell';
import { MoneyBagArt } from '../../_components/Illustrations';

export default function Income() {
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
    mutationFn: (body: object) =>
      editing ? api('PATCH', `/income/${editing.id}`, body) : api('POST', '/income', body),
    onSuccess: () => {
      refresh();
      reset();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api('DELETE', `/income/${id}`),
    onSuccess: refresh,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
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

  function startEdit(i: IncomeEntry) {
    setEditing(i);
    setType(i.type);
    setMemberId(i.userId);
    setAmount(toRupeesText(i.amountPaise));
    setNote(i.note ?? '');
    setMonth(i.month);
  }

  const myId = me.data?.user.id;
  const isAdmin = me.data?.family?.role === 'ADMIN';

  return (
    <>
      <PageHeader title="Income" subtitle="Money coming into the family" />
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title={editing ? 'Edit income' : 'Add income'} icon={Wallet} tone="blue" className="lg:col-span-2">
          <Notice error={formError ?? save.error} />
          <form className="space-y-3.5" onSubmit={submit}>
            <div>
              <Label>Type</Label>
              <select className={input} value={type} onChange={(e) => setType(e.target.value as 'SALARY' | 'OTHER')}>
                <option value="SALARY">Salary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label>Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input className={`${input} !pl-8`} placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Month</Label>
              <MonthPicker value={month} onChange={setMonth} />
            </div>
            <div>
              <Label>Earned by</Label>
              <select className={input} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">Me</option>
                {fam.data?.members.filter((m) => m.userId !== myId).map((m) => (
                  <option key={m.userId} value={m.userId}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <input className={input} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className={`${btn} flex-1`} disabled={save.isPending}>Save</button>
              {editing && <button type="button" className={btnGhost} onClick={reset}>Cancel</button>}
            </div>
          </form>
        </Panel>

        <Panel className="lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">{monthLabel(month)}</h2>
              <div className="mt-3 text-sm text-slate-500">Total family income</div>
              <div className="text-4xl font-bold tracking-tight text-emerald-600">{inr(list.data?.totalPaise ?? 0)}</div>
            </div>
            <MoneyBagArt className="hidden h-28 w-40 sm:block" />
          </div>

          <div className="mt-5">
            <Notice error={list.error ?? del.error} />
            {list.isLoading ? <Loading /> : list.data?.items.length ? (
              <ul className="divide-y divide-slate-100">
                {list.data.items.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3.5">
                    <Avatar name={e.type === 'SALARY' ? 'Salary' : 'Other'} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800">
                        {e.type === 'SALARY' ? 'Salary' : 'Other'}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {e.note ? `${e.note} · ` : ''}{e.member} · {monthLabel(e.month)}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">+{inr(e.amountPaise)}</span>
                    {(isAdmin || e.userId === myId || e.createdById === myId) && (
                      <span className="flex gap-3 text-sm">
                        <button className="font-medium text-primary-600 hover:underline" onClick={() => startEdit(e)}>Edit</button>
                        <button className="font-medium text-rose-600 hover:underline" onClick={() => confirm('Are you sure?') && del.mutate(e.id)}>Delete</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Wallet} title="No income recorded" text="Add a salary or other income for this month." />
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
