'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import { currentMonth, formatAmountInput, inr, monthLabel, toPaise, toRupeesText } from '../../_lib/format';
import type { FamilyInfo, IncomeEntry } from '../../_lib/types';
import { Loading, MonthPicker, Notice, PageHeader, Panel, btn, btnGhost, input, useMe } from '../../_components/Shell';

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
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={editing ? 'Edit income' : 'Add income'}>
          <Notice error={formError ?? save.error} />
          <form className="space-y-3" onSubmit={submit}>
            <select className={input} value={type} onChange={(e) => setType(e.target.value as 'SALARY' | 'OTHER')}>
              <option value="SALARY">Salary</option>
              <option value="OTHER">Other</option>
            </select>
            <input className={input} placeholder="Amount (₹)" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))} />
            <MonthPicker value={month} onChange={setMonth} />
            <select className={input} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Earned by: me</option>
              {fam.data?.members.filter((m) => m.userId !== myId).map((m) => (
                <option key={m.userId} value={m.userId}>Earned by: {m.name}</option>
              ))}
            </select>
            <input className={input} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            <div className="flex gap-2">
              <button className={`${btn} flex-1`} disabled={save.isPending}>Save</button>
              {editing && <button type="button" className={btnGhost} onClick={reset}>Cancel</button>}
            </div>
          </form>
        </Panel>
        <Panel title={monthLabel(month)} className="lg:col-span-2">
          <div className="mb-1 text-sm text-gray-500">Total family income</div>
          <div className="mb-4 text-3xl font-bold text-green-600">{inr(list.data?.totalPaise ?? 0)}</div>
          <Notice error={list.error ?? del.error} />
          {list.isLoading ? <Loading /> : list.data?.items.length ? (
            <ul className="divide-y divide-gray-100">
              {list.data.items.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{e.type === 'SALARY' ? 'Salary' : 'Other'}{e.note && ` · ${e.note}`}</div>
                    <div className="text-xs text-gray-500">{e.member} · {monthLabel(e.month)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-green-600">+{inr(e.amountPaise)}</span>
                    {(isAdmin || e.userId === myId || e.createdById === myId) && (
                      <>
                        <button className="text-primary-600 hover:underline" onClick={() => startEdit(e)}>Edit</button>
                        <button className="text-red-600 hover:underline" onClick={() => confirm('Are you sure?') && del.mutate(e.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No income recorded for this month.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
