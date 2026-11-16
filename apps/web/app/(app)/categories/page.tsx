'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import type { Category } from '../../_lib/types';
import { Loading, Notice, PageHeader, Panel, btn, input, useMe } from '../../_components/Shell';

const examples: Record<string, string> = {
  'Food & Dining': 'Restaurants, takeaway, cafes',
  Groceries: 'Vegetables, milk, monthly provisions',
  'Rent & Housing': 'Rent, maintenance, repairs',
  'Electricity & Bills': 'Electricity, water, gas, internet, mobile',
  'Medical & Healthcare': 'Doctor visits, medicines, tests',
  Entertainment: 'Movies, subscriptions, outings',
  'Transport & Fuel': 'Petrol, bus, metro, auto, cab',
  Education: 'School fees, books, tuition',
  Shopping: 'Clothes, electronics, household items',
  Travel: 'Tickets, hotels, trips',
  Insurance: 'Health, life, vehicle premiums',
  'EMI & Loans': 'Home, car and personal loan payments',
  'Personal Expenses': 'Salon, gym, hobbies',
  Others: 'Anything that does not fit above',
};

export default function Categories() {
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [name, setName] = useState('');
  const list = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });
  const add = useMutation({
    mutationFn: () => api('POST', '/categories', { name }),
    onSuccess: () => { setName(''); refresh(); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api('DELETE', `/categories/${id}`),
    onSuccess: refresh,
  });

  const defaults = list.data?.filter((c) => c.isDefault) ?? [];
  const custom = list.data?.filter((c) => !c.isDefault) ?? [];

  return (
    <>
      <PageHeader title="Categories" subtitle="14 ready-made categories plus your own" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Add category">
          <Notice error={add.error} />
          <form className="space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }}>
            <input className={input} placeholder="e.g. Pet Care" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} />
            <button className={`${btn} w-full`} disabled={add.isPending}>Add Category</button>
          </form>
        </Panel>
        <Panel title="All categories" className="lg:col-span-2">
          <Notice error={del.error} />
          {list.isLoading ? <Loading /> : (
            <ul className="divide-y divide-gray-100">
              {defaults.map((c) => (
                <li key={c.id} className="py-3 text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{examples[c.name]}</div>
                </li>
              ))}
              {custom.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="font-medium">{c.name} <span className="ml-1 rounded bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700">Custom</span></div>
                  {isAdmin && (
                    <button className="text-red-600 hover:underline" onClick={() => confirm('Delete this category?') && del.mutate(c.id)}>Delete</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
