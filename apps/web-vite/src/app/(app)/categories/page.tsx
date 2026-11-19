import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { api } from '../../_lib/api';
import type { Category } from '../../_lib/types';
import { IconTile, Loading, Notice, PageHeader, Panel, btn, input, useMe } from '../../_components/Shell';
import { categoryVisual } from '../../_components/categoryIcons';

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
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Add category" icon={Plus} tone="green" className="self-start">
          <Notice error={add.error} />
          <form className="space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }}>
            <input className={input} placeholder="e.g. Pet Care" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} />
            <button className={`${btn} w-full`} disabled={add.isPending}>Add Category</button>
          </form>
          <p className="mt-3 text-xs text-slate-400">Custom categories are shared with the whole family.</p>
        </Panel>

        <Panel title="All categories" icon={Tag} tone="blue" className="lg:col-span-2">
          <Notice error={del.error} />
          {list.isLoading ? <Loading /> : (
            <div className="grid gap-x-6 sm:grid-cols-2">
              {custom.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b border-slate-100 py-3">
                  <IconTile icon={categoryVisual(c.name).Icon} tone="slate" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{c.name}</div>
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">Custom</span>
                  </div>
                  {isAdmin && (
                    <button
                      aria-label={`Delete ${c.name}`}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => confirm('Delete this category?') && del.mutate(c.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {defaults.map((c) => {
                const { Icon, tone } = categoryVisual(c.name);
                return (
                  <div key={c.id} className="flex items-center gap-3 border-b border-slate-100 py-3">
                    <IconTile icon={Icon} tone={tone} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{c.name}</div>
                      <div className="truncate text-xs text-slate-500">{examples[c.name]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
