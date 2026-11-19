import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../../_lib/api';
import { dayLabel, inr, METHOD_LABEL } from '../../_lib/format';
import type { Category, ExpenseListResponse, FamilyInfo } from '../../_lib/types';
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

export default function ExpenseHistory() {
  const qc = useQueryClient();
  const me = useMe();
  const [sp] = useSearchParams();
  // Filters can arrive from the Dashboard, Reports and Family screens as URL parameters.
  const [from, setFrom] = useState(sp.get('from') ?? '');
  const [to, setTo] = useState(sp.get('to') ?? '');
  const [categoryId, setCategoryId] = useState(sp.get('categoryId') ?? '');
  const [userId, setUserId] = useState(sp.get('userId') ?? '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);
  const limit = 25;

  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('GET', '/categories') });
  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (categoryId) params.set('categoryId', categoryId);
  if (userId) params.set('userId', userId);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);
  if (search.trim()) params.set('q', search.trim());
  const [sortBy, sortOrder] = sort.split('_');
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  params.set('page', String(page));
  params.set('limit', String(limit));

  const list = useQuery({
    queryKey: ['expenses', from, to, categoryId, userId, paymentMethod, search, sort, page],
    queryFn: () => api<ExpenseListResponse>('GET', `/expenses?${params}`),
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
  const filtered = !!(from || to || categoryId || userId || paymentMethod || search);
  const rangeInvalid = !!from && !!to && from > to;

  const totalCount = list.data?.totalCount ?? list.data?.items.length ?? 0;
  const totalPages = list.data?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setCategoryId('');
    setUserId('');
    setPaymentMethod('');
    setSearch('');
    setSort('date_desc');
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Expense History"
        subtitle="Search, edit and delete transactions"
        action={
          <Link to="/expenses/new" className={btn}>
            <Plus size={16} /> Add Expense
          </Link>
        }
      />

      <Panel className="mb-5 space-y-4">
        {/* Search bar & Sort */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </span>
            <input
              className={`${input} !pl-10`}
              placeholder="Search by note, description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ArrowUpDown size={15} />
              </span>
              <select
                className={`${input} !pl-9`}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="date_desc">Date: Newest first</option>
                <option value="date_asc">Date: Oldest first</option>
                <option value="amount_desc">Amount: Highest first</option>
                <option value="amount_asc">Amount: Lowest first</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>From</Label>
            <input
              className={input}
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label>To</Label>
            <input
              className={input}
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className={input}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Family member</Label>
            <select
              className={input}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All members</option>
              {fam.data?.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Payment method</Label>
            <select
              className={input}
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All methods</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
          <div>
            {filtered ? (
              <button className={`${btnGhost} !px-3 !py-1 text-xs`} onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span>
              Total:{' '}
              <b className="text-base font-bold text-slate-900">{inr(list.data?.totalPaise ?? 0)}</b>
            </span>
          </div>
        </div>
      </Panel>

      {rangeInvalid && <Notice tone="warn">&quot;From&quot; is after &quot;To&quot;, so nothing can match.</Notice>}
      <Notice error={list.error ?? del.error} />

      {list.isLoading ? (
        <Loading />
      ) : (
        <Panel className="!p-0 overflow-hidden">
          {list.data?.items.length ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="py-3">Category</th>
                      <th className="py-3">Note</th>
                      <th className="py-3">By</th>
                      <th className="py-3">Payment</th>
                      <th className="py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-right" />
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
                          <td className="py-3.5 text-slate-600">{t.note || <span className="text-slate-300">—</span>}</td>
                          <td className="py-3.5 text-slate-600">{t.by}</td>
                          <td className="py-3.5 text-slate-600">
                            {METHOD_LABEL[t.paymentMethod]}
                            {t.paymentMethodLabel && (
                              <div
                                className={`text-xs ${
                                  t.paymentMethodRemoved
                                    ? 'text-slate-400 line-through decoration-slate-300'
                                    : 'text-slate-400'
                                }`}
                              >
                                {t.paymentMethodLabel}
                                {t.paymentMethodRemoved && <span className="ml-1 no-underline">(removed)</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 text-right font-semibold text-slate-900">{inr(t.amountPaise)}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            {canEdit && (
                              <span className="inline-flex gap-1">
                                <Link
                                  to={`/expenses/${t.id}`}
                                  aria-label="Edit"
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600"
                                >
                                  <Pencil size={16} />
                                </Link>
                                <button
                                  aria-label="Delete"
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => confirm('Are you sure you want to delete this expense?') && del.mutate(t.id)}
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

              {/* Mobile Responsive Card List View (< 640px) */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {list.data.items.map((t) => {
                  const canEdit = isAdmin || t.userId === myId;
                  const { Icon, tone } = categoryVisual(t.category);
                  return (
                    <div key={t.id} className="p-4 transition hover:bg-slate-50/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <IconTile icon={Icon} tone={tone} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-800">
                              {t.note || t.category}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {t.category} · {dayLabel(t.date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-slate-900">{inr(t.amountPaise)}</div>
                          <div className="text-[11px] text-slate-400">{METHOD_LABEL[t.paymentMethod]}</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2 text-xs text-slate-400">
                        <span>By {t.by}{t.paymentMethodLabel ? ` · ${t.paymentMethodLabel}` : ''}</span>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/expenses/${t.id}`}
                              aria-label="Edit"
                              className="rounded-lg p-2 text-slate-400 hover:bg-primary-50 hover:text-primary-600"
                            >
                              <Pencil size={15} />
                            </Link>
                            <button
                              aria-label="Delete"
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => confirm('Are you sure you want to delete this expense?') && del.mutate(t.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                  <div className="text-xs">
                    Showing <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-800">{Math.min(page * limit, totalCount)}</span> of{' '}
                    <span className="font-semibold text-slate-800">{totalCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={`${btnGhost} !px-3 !py-1 text-xs disabled:opacity-40`}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-xs font-medium text-slate-600">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className={`${btnGhost} !px-3 !py-1 text-xs disabled:opacity-40`}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              art={<DocSearchArt className="h-32 w-44" />}
              title="No transactions found."
              text={filtered ? 'Try changing or clearing the filters.' : 'Add an expense to start tracking your family spending.'}
              action={
                <Link to="/expenses/new" className={btn}>
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
