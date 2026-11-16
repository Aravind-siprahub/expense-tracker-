'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken } from '../_lib/api';
import type { Me } from '../_lib/types';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/expenses', label: 'Expenses', icon: '🧾' },
  { href: '/income', label: 'Income', icon: '💰' },
  { href: '/budget', label: 'Budget', icon: '🎯' },
  { href: '/reports', label: 'Reports', icon: '📊' },
  { href: '/family', label: 'Family', icon: '👨‍👩‍👧' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export const btn =
  'inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50';
export const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50 disabled:text-gray-500';

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api<Me>('GET', '/me'), retry: false });

export function Notice({
  error,
  tone = 'error',
  children,
}: {
  error?: unknown;
  tone?: 'error' | 'success' | 'warn';
  children?: ReactNode;
}) {
  const text =
    children ??
    (typeof error === 'string' && error
      ? error
      : error instanceof Error
        ? error.message
        : error
          ? 'Something went wrong'
          : null);
  if (!text) return null;
  const color = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
  }[tone];
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${color}`}>{text}</div>;
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
    />
  );
}

export function Loading() {
  return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;
}

/** Shown to a signed-in user who is not in a family yet. */
function Onboarding({ name }: { name: string }) {
  const qc = useQueryClient();
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const done = () => qc.invalidateQueries();
  const create = useMutation({
    mutationFn: () => api('POST', '/family', { name: familyName }),
    onSuccess: done,
  });
  const join = useMutation({
    mutationFn: (token?: string) => api('POST', '/invites/accept', { token: (token ?? code).trim() }),
    onSuccess: done,
  });

  // An invite opened from the email link was saved by /join: accept it right away.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('fet_invite');
      if (saved) {
        sessionStorage.removeItem('fet_invite');
        setCode(saved);
        join.mutate(saved);
      }
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="mx-auto max-w-md space-y-4 pt-6">
      <h1 className="text-2xl font-bold">Welcome, {name}</h1>
      <p className="text-sm text-gray-500">Create your family group, or join one with an invite code.</p>
      <Panel title="Create a family">
        <Notice error={create.error} />
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <input
            className={input}
            placeholder="e.g. Sharma Family"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
            minLength={2}
          />
          <button className={`${btn} w-full`} disabled={create.isPending}>
            Create Family
          </button>
        </form>
      </Panel>
      <Panel title="Join with an invite code">
        <Notice error={join.error} />
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            join.mutate(undefined);
          }}
        >
          <input
            className={input}
            placeholder="Paste invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button className={`${btnGhost} w-full`} disabled={join.isPending}>
            Join Family
          </button>
        </form>
      </Panel>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const me = useMe();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
    else setReady(true);
  }, [router]);

  const logout = () => {
    setToken(null);
    qc.clear();
    router.replace('/login');
  };

  if (!ready || me.isLoading) return <Loading />;
  if (me.error || !me.data) {
    return (
      <div className="mx-auto max-w-sm pt-20 text-center">
        <Notice error={me.error} />
        <button className={btnGhost} onClick={logout}>
          Back to login
        </button>
      </div>
    );
  }

  const active = (href: string) => path === href || path.startsWith(href + '/');
  const { user, family } = me.data;

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="px-5 py-5">
          <div className="text-lg font-bold text-primary-700">Family Expense</div>
          <div className="text-xs text-gray-500">{family?.name ?? 'No family yet'}</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {family &&
            nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active(n.href) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            ))}
        </nav>
        <div className="space-y-2 p-3">
          {family && (
            <Link
              href="/expenses/new"
              className="block rounded-lg bg-primary-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-700"
            >
              + Add Expense
            </Link>
          )}
          <div className="flex items-center justify-between px-1 text-xs text-gray-500">
            <span className="truncate">{user.name}</span>
            <button onClick={logout} className="text-primary-600 hover:underline">
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
        {family ? children : <Onboarding name={user.name} />}
      </main>

      {family && (
        <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-gray-200 bg-white py-2 md:hidden">
          {[nav[0], nav[1]].map((n) => (
            <Link key={n.href} href={n.href} className="flex flex-col items-center text-xs text-gray-600">
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </Link>
          ))}
          <Link
            href="/expenses/new"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-3xl text-white shadow-lg"
          >
            +
          </Link>
          <Link href="/reports" className="flex flex-col items-center text-xs text-gray-600">
            <span className="text-lg">📊</span>Reports
          </Link>
          <Link href="/more" className="flex flex-col items-center text-xs text-gray-600">
            <span className="text-lg">☰</span>More
          </Link>
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      {title && <h2 className="mb-4 font-semibold text-gray-800">{title}</h2>}
      {children}
    </section>
  );
}
