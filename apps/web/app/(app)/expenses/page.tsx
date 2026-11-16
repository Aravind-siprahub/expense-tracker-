'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import { dayLabel, inr, METHOD_LABEL } from '../../_lib/format';
import type { Category, Expense, FamilyInfo } from '../../_lib/types';
import { Loading, Notice, PageHeader, Panel, btn, btnGhost, input, useMe } from '../../_components/Shell';

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
        action={<Link href="/expenses/new" className={btn}>+ Add</Link>}
      />
      <Panel className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
            <input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
            <input className={input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
            <select className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Family member</label>
            <select className={input} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All members</option>
              {fam.data?.members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          {filtered ? (
            <button
              className={btnGhost}
              onClick={() => { setFrom(''); setTo(''); setCategoryId(''); setUserId(''); }}
            >Clear filters</button>
          ) : <span />}
          <span>Total: <b className="text-gray-900">{inr(list.data?.totalPaise ?? 0)}</b></span>
        </div>
      </Panel>
      {rangeInvalid && <Notice tone="warn">&quot;From&quot; is after &quot;To&quot;, so nothing can match.</Notice>}
      <Notice error={list.error ?? del.error} />
      {list.isLoading ? <Loading /> : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr><th className="pb-2">Date</th><th>Category</th><th>Note</th><th>By</th><th>Payment</th><th className="text-right">Amount</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.data?.items.map((t) => {
                  const canEdit = isAdmin || t.userId === myId;
                  return (
                    <tr key={t.id}>
                      <td className="py-3 whitespace-nowrap">{dayLabel(t.date)}</td>
                      <td>{t.category}</td><td>{t.note}</td><td>{t.by}</td><td>{METHOD_LABEL[t.paymentMethod]}</td>
                      <td className="text-right font-medium">{inr(t.amountPaise)}</td>
                      <td className="space-x-2 whitespace-nowrap pl-4 text-right">
                        {canEdit && (
                          <>
                            <Link href={`/expenses/${t.id}`} className="text-primary-600 hover:underline">Edit</Link>
                            <button
                              className="text-red-600 hover:underline"
                              onClick={() => confirm('Are you sure?') && del.mutate(t.id)}
                            >Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {list.data?.items.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
