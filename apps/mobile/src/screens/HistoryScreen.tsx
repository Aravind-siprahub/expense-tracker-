import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react-native';
import { api } from '../lib/api';
import {
  currentMonth,
  dayLabel,
  inr,
  METHOD_LABEL,
  monthBounds,
  rangePresets,
} from '../lib/format';
import { useSavedMethods } from '../PaymentMethods';
import type { Category, Expense, FamilyInfo } from '../lib/types';
import { categoryVisual } from '../categoryIcons';
import {
  Chip,
  DateField,
  EmptyState,
  IconTile,
  Loading,
  Notice,
  Panel,
  Screen,
  cardShadow,
  colors,
  useLiveRefetch,
  useMe,
} from '../ui';

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

interface ExpenseListResponse {
  totalPaise: number;
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items: Expense[];
}

const SORTS: [string, string][] = [
  ['date_desc', 'Newest first'],
  ['date_asc', 'Oldest first'],
  ['amount_desc', 'Highest first'],
  ['amount_asc', 'Lowest first'],
];
// "mode:X" filters by payment mode; "saved:<id>" (added below) filters by one of the person's own saved cards / accounts.
const METHODS: [string, string][] = [
  ['', 'All methods'],
  ['mode:UPI', 'UPI'],
  ['mode:CASH', 'Cash'],
  ['mode:CARD', 'Any card'],
  ['mode:BANK_TRANSFER', 'Any bank transfer'],
];

const Label = ({ children }: { children: string }) => (
  <Text className="mb-1.5 mt-1 text-xs font-medium text-slate-500">
    {children}
  </Text>
);

export function HistoryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const me = useMe();
  const thisMonth = monthBounds(currentMonth());
  // Filters sent from the Dashboard, Reports or Family screens.
  const p = route.params as
    | {
        from?: string;
        to?: string;
        categoryId?: string;
        userId?: string;
        stamp?: number;
      }
    | undefined;
  const [from, setFrom] = useState(p?.stamp ? (p.from ?? '') : thisMonth.from);
  const [to, setTo] = useState(p?.stamp ? (p.to ?? '') : thisMonth.to);
  const [categoryId, setCategoryId] = useState(
    p?.stamp ? (p.categoryId ?? '') : ''
  );
  const [userId, setUserId] = useState(p?.stamp ? (p.userId ?? '') : '');
  const [pay, setPay] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const paymentMethod = pay.startsWith('mode:') ? pay.slice(5) : '';
  const paymentMethodId = pay.startsWith('saved:') ? pay.slice(6) : '';
  const saved = useSavedMethods();
  const presets = rangePresets();

  // Search runs shortly after typing stops, not once per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchText), 300);
    return () => clearTimeout(id);
  }, [searchText]);
  const [sort, setSort] = useState('date_desc');
  const limit = 25;

  // History is a persistent tab. Route parameters can change after it mounts,
  // so apply the new filter set on the next task without a cascading render.
  useEffect(() => {
    if (!p?.stamp) return;
    const timer = setTimeout(() => {
      setFrom(p.from ?? '');
      setTo(p.to ?? '');
      setCategoryId(p.categoryId ?? '');
      setUserId(p.userId ?? '');
    }, 0);
    return () => clearTimeout(timer);
  }, [p?.categoryId, p?.from, p?.stamp, p?.to, p?.userId]);

  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
  });
  const fam = useQuery({
    queryKey: ['family'],
    queryFn: () => api<FamilyInfo>('GET', '/family'),
  });

  const validFrom = from && isDate(from) ? from : '';
  const validTo = to && isDate(to) ? to : '';

  const filterKey = [
    validFrom,
    validTo,
    categoryId,
    userId,
    pay,
    search,
    sort,
  ].join('|');
  const [pagination, setPagination] = useState({ filterKey: '', page: 1 });
  // A changed filter identity immediately reads as page one; no synchronization
  // effect or extra render is required.
  const page = pagination.filterKey === filterKey ? pagination.page : 1;

  const params = new URLSearchParams();
  if (validFrom) params.set('from', validFrom);
  if (validTo) params.set('to', validTo);
  if (categoryId) params.set('categoryId', categoryId);
  if (userId) params.set('userId', userId);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);
  if (paymentMethodId) params.set('paymentMethodId', paymentMethodId);
  if (search.trim()) params.set('q', search.trim());
  const [sortBy, sortOrder] = sort.split('_');
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  params.set('page', String(page));
  params.set('limit', String(limit));

  const liveRefetch = useLiveRefetch();
  const list = useQuery({
    queryKey: [
      'expenses',
      validFrom,
      validTo,
      categoryId,
      userId,
      pay,
      search,
      sort,
      page,
    ],
    queryFn: () => api<ExpenseListResponse>('GET', `/expenses?${params}`),
    refetchInterval: liveRefetch,
  });
  const del = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['budget'] });
    },
  });
  const confirmDelete = (id: string) =>
    Alert.alert(
      'Delete expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
      ]
    );

  const shownMonth = from.slice(0, 7);
  const isFullMonth =
    !!from &&
    from.slice(0, 7) === to.slice(0, 7) &&
    monthBounds(shownMonth).from === from &&
    monthBounds(shownMonth).to === to;

  const myId = me.data?.user.id;
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const badDates = (!!from && !isDate(from)) || (!!to && !isDate(to));
  // The current month is the starting view, so it does not count as an active filter.
  const defaultRange = isFullMonth && shownMonth === currentMonth();
  const filtered = !!(
    ((from || to) && !defaultRange) ||
    categoryId ||
    userId ||
    pay ||
    search
  );

  const items = list.data?.items ?? [];
  const anyEditable = items.some((x) => isAdmin || x.userId === myId);
  const totalCount = list.data?.totalCount ?? items.length;
  const totalPages =
    list.data?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setCategoryId('');
    setUserId('');
    setPay('');
    setSearchText('');
    setSearch('');
    setSort('date_desc');
  };

  const [showFilters, setShowFilters] = useState(false);
  return (
    <Screen
      title="Expense History"
      subtitle="Search, edit and delete transactions"
      onRefresh={() => list.refetch()}
      refreshing={list.isRefetching}
    >
      <Panel>
        <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
          <Search size={16} color={colors.faint} />
          <TextInput
            className="flex-1 px-2.5 py-3 text-sm text-slate-900"
            placeholder="Search note, category, person or amount..."
            placeholderTextColor={colors.faint}
            accessibilityLabel="Search expenses"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>

        <View className="mb-1 flex-row items-center gap-2">
          <ArrowUpDown size={14} color={colors.faint} />
          <Text className="text-xs font-medium text-slate-500">Sort</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        >
          {SORTS.map(([v, l]) => (
            <Chip
              key={v}
              label={l}
              active={sort === v}
              onPress={() => setSort(v)}
            />
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilters }}
          onPress={() => setShowFilters((v) => !v)}
          className="mb-1 mt-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 active:bg-slate-50"
        >
          <SlidersHorizontal size={16} color={colors.primaryDark} />
          <Text className="text-sm font-semibold text-primary-700">
            {showFilters
              ? 'Hide filters'
              : filtered
                ? 'Filters (active)'
                : 'More filters'}
          </Text>
        </Pressable>
        {showFilters ? (
          <>
            <Label>Date range</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
            >
              {presets.map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  active={from === p.from && to === p.to}
                  onPress={() => {
                    setFrom(p.from);
                    setTo(p.to);
                  }}
                />
              ))}
            </ScrollView>
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <DateField
                  label="From"
                  value={from}
                  onChange={setFrom}
                  placeholder="Any date"
                  clearable
                />
              </View>
              <View className="min-w-0 flex-1">
                <DateField
                  label="To"
                  value={to}
                  onChange={setTo}
                  placeholder="Any date"
                  clearable
                />
              </View>
            </View>

            <Label>Category</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              <Chip
                label="All categories"
                active={!categoryId}
                onPress={() => setCategoryId('')}
              />
              {cats.data?.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </ScrollView>

            <Label>Family member</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              <Chip
                label="All members"
                active={!userId}
                onPress={() => setUserId('')}
              />
              {fam.data?.members.map((m) => (
                <Chip
                  key={m.userId}
                  label={m.name}
                  active={userId === m.userId}
                  onPress={() => setUserId(m.userId)}
                />
              ))}
            </ScrollView>

            <Label>Payment method</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[...METHODS, ...(saved.data ?? []).map((m): [string, string] => [`saved:${m.id}`, m.label])].map(([v, l]) => (
                <Chip key={v || 'all'} label={l} active={pay === v} onPress={() => setPay(v)} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View className="mt-4 flex-row flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <View>
            {filtered ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
                onPress={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 active:bg-slate-50"
              >
                <Text className="text-xs font-semibold text-slate-700">
                  Clear filters
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text className="text-sm text-slate-500">
            Total:{' '}
            <Text className="text-base font-bold text-slate-900">
              {inr(list.data?.totalPaise ?? 0)}
            </Text>
          </Text>
        </View>
      </Panel>

      {badDates && (
        <Notice tone="warn">Dates must look like 2026-11-16.</Notice>
      )}
      {validFrom && validTo && validFrom > validTo && (
        <Notice tone="warn">
          &quot;From&quot; is after &quot;To&quot;, so nothing can match.
        </Notice>
      )}
      <Notice error={list.error ?? del.error} />

      {list.isLoading ? (
        <Loading />
      ) : items.length ? (
        <View
          className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white"
          style={cardShadow}
        >
          {items.map((t, i) => {
            const canEdit = isAdmin || t.userId === myId;
            const { Icon, tone } = categoryVisual(t.category);
            return (
              <View
                key={t.id}
                className={`flex-row items-center gap-2.5 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <IconTile icon={Icon} tone={tone} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-semibold text-slate-800"
                  >
                    {t.note || t.category}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-slate-500">
                    {t.category} · {dayLabel(t.date)} · By {t.by}
                  </Text>
                </View>
                <View className="items-end" style={{ maxWidth: '36%' }}>
                  <Text
                    numberOfLines={1}
                    className="text-sm font-bold text-slate-900"
                  >
                    {inr(t.amountPaise)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-[11px] text-slate-400"
                  >
                    {t.paymentMethodLabel
                      ? `${t.paymentMethodLabel}${t.paymentMethodRemoved ? ' (removed)' : ''}`
                      : METHOD_LABEL[t.paymentMethod]}
                  </Text>
                </View>
                {canEdit && (
                  <View className="flex-row items-center">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit expense ${t.note || t.category}`}
                      hitSlop={2}
                      className="h-9 w-9 items-center justify-center rounded-lg active:bg-primary-50"
                      onPress={() => nav.navigate('ExpenseForm', { id: t.id })}
                    >
                      <Pencil size={16} color={colors.faint} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete expense ${t.note || t.category}`}
                      hitSlop={2}
                      className="h-9 w-9 items-center justify-center rounded-lg active:bg-rose-50"
                      onPress={() => confirmDelete(t.id)}
                    >
                      <Trash2 size={16} color={colors.faint} />
                    </Pressable>
                  </View>
                )}
                {/* Keep amounts lined up: rows the person cannot edit get an empty slot as wide as the two buttons. */}
                {!canEdit && anyEditable ? (
                  <View style={{ width: 72 }} />
                ) : null}
              </View>
            );
          })}

          {totalPages > 1 && (
            <View className="flex-row items-center justify-between border-t border-slate-100 px-4 py-3">
              <Text className="text-xs text-slate-500">
                <Text className="font-semibold text-slate-800">
                  {(page - 1) * limit + 1}
                </Text>
                –
                <Text className="font-semibold text-slate-800">
                  {Math.min(page * limit, totalCount)}
                </Text>{' '}
                of{' '}
                <Text className="font-semibold text-slate-800">
                  {totalCount}
                </Text>
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous page"
                  accessibilityState={{ disabled: page <= 1 }}
                  disabled={page <= 1}
                  onPress={() =>
                    setPagination({ filterKey, page: Math.max(1, page - 1) })
                  }
                  className={`flex-row items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 ${page <= 1 ? 'opacity-40' : ''}`}
                >
                  <ChevronLeft size={14} color={colors.text2} />
                  <Text className="text-xs font-semibold text-slate-700">
                    Prev
                  </Text>
                </Pressable>
                <Text className="text-xs font-medium text-slate-600">
                  {page} / {totalPages}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next page"
                  accessibilityState={{ disabled: page >= totalPages }}
                  disabled={page >= totalPages}
                  onPress={() =>
                    setPagination({
                      filterKey,
                      page: Math.min(totalPages, page + 1),
                    })
                  }
                  className={`flex-row items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 ${page >= totalPages ? 'opacity-40' : ''}`}
                >
                  <Text className="text-xs font-semibold text-slate-700">
                    Next
                  </Text>
                  <ChevronRight size={14} color={colors.text2} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        <Panel>
          <EmptyState
            icon={Search}
            title="No transactions found."
            text={
              filtered
                ? 'Try changing or clearing the filters.'
                : 'Add an expense to start tracking your family spending.'
            }
          />
        </Panel>
      )}
    </Screen>
  );
}
