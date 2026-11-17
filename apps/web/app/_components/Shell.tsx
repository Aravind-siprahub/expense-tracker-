'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Ellipsis,
  House,
  LayoutDashboard,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Tag,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { api, getToken, setToken } from '../_lib/api';
import type { Me } from '../_lib/types';
import { Avatar, Loading, Notice, Panel, btn, btnGhost, input, type Tone } from './ui';
import { InstallBanner } from './InstallApp';

// Everything the pages import from here lives in ui.tsx; re-exported so imports stay short.
export * from './ui';

const nav: { href: string; label: string; icon: LucideIcon; tone: Tone }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tone: 'blue' },
  { href: '/expenses', label: 'Expenses', icon: Receipt, tone: 'purple' },
  { href: '/income', label: 'Income', icon: Wallet, tone: 'amber' },
  { href: '/budget', label: 'Budget', icon: Target, tone: 'red' },
  { href: '/reports', label: 'Reports', icon: BarChart3, tone: 'teal' },
  { href: '/family', label: 'Family', icon: Users, tone: 'blue' },
  { href: '/categories', label: 'Categories', icon: Tag, tone: 'amber' },
  { href: '/settings', label: 'Settings', icon: Settings, tone: 'slate' },
];

const ICON_COLOR: Record<Tone, string> = {
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  red: 'text-rose-500',
  amber: 'text-amber-500',
  purple: 'text-violet-500',
  teal: 'text-teal-500',
  slate: 'text-slate-400',
};

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api<Me>('GET', '/me'), retry: false });

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
    // The one-click email link passes a long token; typing the short verification code sends `code`.
    mutationFn: (token?: string) =>
      api('POST', '/invites/accept', token ? { token: token.trim() } : { code: code.trim() }),
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-slate-500">Create your family group, or join one with the verification code from your invite email.</p>
      </div>
      <Panel title="Create a family" icon={House}>
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
      <Panel title="Join with a verification code" icon={Users} tone="green">
        <Notice error={join.error} />
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            join.mutate(undefined);
          }}
        >
          <input
            className={`${input} text-center font-mono text-lg uppercase tracking-[0.3em]`}
            placeholder="ABCD-2345"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={20}
            autoComplete="off"
            required
          />
          <p className="text-xs text-slate-500">
            Use the 8-character code from the email, and sign in with the same email address the invite was sent to.
          </p>
          <button className={`${btnGhost} w-full`} disabled={join.isPending || code.trim().length < 6}>
            {join.isPending ? 'Checking…' : 'Join Family'}
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
    try {
      sessionStorage.removeItem('fet_invite');
    } catch {
      /* storage unavailable */
    }
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
  const roleLabel = family?.role === 'ADMIN' ? 'Family Admin' : 'Family Member';

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/80 backdrop-blur md:flex">
        <div className="flex items-center gap-3 px-5 pb-4 pt-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-nav">
            <House size={22} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold leading-5 text-primary-800">Family Expense</div>
            <div className="truncate text-xs text-slate-500">{family?.name ?? 'No family yet'}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {family &&
            nav.map((n) => {
              const on = active(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    on
                      ? 'bg-primary-600 text-white shadow-nav'
                      : 'text-slate-600 hover:bg-primary-50 hover:text-slate-900'
                  }`}
                >
                  <n.icon size={19} className={on ? 'text-white' : ICON_COLOR[n.tone]} />
                  {n.label}
                </Link>
              );
            })}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-card">
          <Avatar name={user.name} size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{family ? roleLabel : 'No family'}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">
          {family && <InstallBanner />}
          {family ? children : <Onboarding name={user.name} />}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      {family && (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-around border-t border-slate-200/70 bg-white/95 px-2 pt-1.5 backdrop-blur md:hidden"
          // Keeps the bar above the home indicator on phones when the app is installed.
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {[nav[0], nav[1]].map((n) => (
            <MobileTab key={n.href} href={n.href} label={n.label} icon={n.icon} on={active(n.href)} />
          ))}
          <Link
            href="/expenses/new"
            aria-label="Add expense"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-nav"
          >
            <Plus size={28} />
          </Link>
          <MobileTab href="/reports" label="Reports" icon={BarChart3} on={active('/reports')} />
          <MobileTab href="/more" label="More" icon={Ellipsis} on={active('/more')} />
        </nav>
      )}
    </div>
  );
}

function MobileTab({ href, label, icon: Icon, on }: { href: string; label: string; icon: LucideIcon; on: boolean }) {
  return (
    <Link href={href} className={`flex w-16 flex-col items-center gap-0.5 py-1 text-[11px] ${on ? 'font-semibold text-primary-700' : 'text-slate-500'}`}>
      <Icon size={21} />
      {label}
    </Link>
  );
}
