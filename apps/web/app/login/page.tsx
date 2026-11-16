'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken } from '../_lib/api';
import { Notice, btn, input } from '../_components/Shell';

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [invited, setInvited] = useState(false);

  // ?expired=1 comes from the API client when the session ended; ?invite=1&email=... comes
  // from the invite email, so the invited address is pre-filled and sign-up is offered first.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setExpired(q.get('expired') === '1');
    if (q.get('invite') === '1') {
      setInvited(true);
      setMode('register');
      const e = q.get('email');
      if (e) setEmail(e);
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ token: string }>(
        'POST',
        mode === 'login' ? '/auth/login' : '/auth/register',
        mode === 'login' ? { email, password } : { name, email, password },
      );
      setToken(res.token);
      qc.clear();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">Family Expense Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'login' ? 'Log in to your family account.' : 'Create your account.'}
        </p>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          {expired && !error && <Notice tone="warn">Your session expired. Please log in again.</Notice>}
          {invited && (
            <Notice tone="success">
              You&apos;ve been invited to join a family. Create an account (or log in) using the invited email address and you&apos;ll be added automatically.
            </Notice>
          )}
          <Notice error={error} />
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Full name</label>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Priya Sharma" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="priya@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1} placeholder="At least 8 characters" />
          </div>
          <button className={`${btn} w-full`} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="w-full rounded-lg border border-primary-600 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            {mode === 'login' ? 'Create a new account' : 'I already have an account'}
          </button>
          {mode === 'login' && (
            <div className="text-center text-sm">
              <Link href="/forgot" className="text-primary-600 hover:underline">Forgot password?</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
