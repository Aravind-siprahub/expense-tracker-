'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../_lib/api';
import { dayLabel, inr, METHOD_LABEL } from '../../_lib/format';
import type { Category, Expense, FamilyInfo } from '../../_lib/types';
import {
  EmptyState,
  IconTile,
  Label,
  Loading,
  Notice,
  PageHeader,
  Panel,
  btn,
  btnGhost,
  input,
  useMe,
} from '../../_components/Shell';
import { DocSearchArt } from '../../_components/Illustrations';
import { categoryVisual } from '../../_components/categoryIcons';

export default function ExpenseHistoryPage() {
  // useSearchParams needs a Suspense boundary so the page can still be pre-rendered.
  return (
    <Suspense fallback={<Loading />}>
      <ExpenseHistory />
    </Suspense>
  );
}

function ExpenseHistory() {
  const qc = useQueryClient();
  const me = useMe();
  const sp = useSearchParams();
  // Filters can arrive from the Dashboard, Reports and Family screens as URL parameters.
  const [from, setFrom] = useState(sp.get('from') ?? '');
  const [to, setTo] = useState(sp.get('to') ?? '');
  const [categoryId, setCategoryId] = useState(sp.get('categoryId') ?? '');
  const [userId, setUserId] = useState(sp.get('userId') ?? '');

  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (categoryId) params.set('categoryId', categoryId);
  if (userId) params.set('userId', userId);
  const list = useQuery({
    queryKey: ['expenses', from, to, categoryId, userId],
    queryFn: () => api<{ totalPaise: number; items: Expense[] }>('GET', `/expenses?${params}`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['budget'] });
    },
  });

  const myId = me.data?.user.id;
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const filtered = !!(from || to || categoryId || userId);
  const rangeInvalid = !!from && !!to && from > to;

  return (
    <>
      <PageHeader
        title="Expense History"
        subtitle="Search, edit and delete transactions"
        action={
          <Link href="/expenses/new" className={btn}>
            <Plus size={16} /> Add
          </Link>
        }
      />
      <Panel className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>From</Label>
            <input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <input className={input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <select className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Family member</Label>
            <select className={input} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All members</option>
              {fam.data?.members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          {filtered ? (
            <button className={btnGhost} onClick={() => { setFrom(''); setTo(''); setCategoryId(''); setUserId(''); }}>
              Clear filters
            </button>
          ) : <span />}
          <span>Total: <b className="text-base text-slate-900">{inr(list.data?.totalPaise ?? 0)}</b></span>
        </div>
      </Panel>

      {rangeInvalid && <Notice tone="warn">&quot;From&quot; is after &quot;To&quot;, so nothing can match.</Notice>}
      <Notice error={list.error ?? del.error} />

      {list.isLoading ? <Loading /> : (
        <Panel className="!p-0 overflow-hidden">
          {list.data?.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Date</th><th className="py-3">Category</th><th className="py-3">Note</th>
                    <th className="py-3">By</th><th className="py-3">Payment</th>
                    <th className="py-3 text-right">Amount</th><th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.data.items.map((t) => {
                    const canEdit = isAdmin || t.userId === myId;
                    const { Icon, tone } = categoryVisual(t.category);
                    return (
                      <tr key={t.id} className="transition hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{dayLabel(t.date)}</td>
                        <td className="py-3.5">
                          <span className="flex items-center gap-2.5">
                            <IconTile icon={Icon} tone={tone} size="sm" />
                            <span className="font-medium text-slate-700">{t.category}</span>
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-600">{t.note}</td>
                        <td className="py-3.5 text-slate-600">{t.by}</td>
                        <td className="py-3.5 text-slate-600">
                          {METHOD_LABEL[t.paymentMethod]}
                          {t.paymentMethodLabel && (
                            <div className={`text-xs ${t.paymentMethodRemoved ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-400'}`}>
                              {t.paymentMethodLabel}
                              {t.paymentMethodRemoved && <span className="ml-1 no-underline">(removed)</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-slate-900">{inr(t.amountPaise)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          {canEdit && (
                            <span className="inline-flex gap-1">
                              <Link href={`/expenses/${t.id}`} aria-label="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600">
                                <Pencil size={16} />
                              </Link>
                              <button
                                aria-label="Delete"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => confirm('Are you sure?') && del.mutate(t.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              art={<DocSearchArt className="h-32 w-44" />}
              title="No transactions found."
              text={filtered ? 'Try changing or clearing the filters.' : 'Add an expense to start tracking your family spending.'}
              action={
                <Link href="/expenses/new" className={btn}>
                  <Plus size={16} /> Add Expense
                </Link>
              }
            />
          )}
        </Panel>
      )}
    </>
  );
}
