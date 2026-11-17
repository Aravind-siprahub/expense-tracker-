'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken } from '../_lib/api';
import { Label, Notice, btn, input } from '../_components/ui';
import { AuthShell } from '../_components/AuthShell';

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
    <AuthShell
      title={mode === 'login' ? 'Welcome back' : 'Create your account'}
      subtitle={mode === 'login' ? 'Log in to your family account.' : 'Start tracking your family spending.'}
    >
      <form className="space-y-4" onSubmit={submit}>
        {expired && !error && <Notice tone="warn">Your session expired. Please log in again.</Notice>}
        {invited && (
          <Notice tone="success">
            You&apos;ve been invited to join a family. Create an account (or log in) using the invited email address and you&apos;ll be added automatically.
          </Notice>
        )}
        <Notice error={error} />
        {mode === 'register' && (
          <div>
            <Label>Full name</Label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Priya Sharma" />
          </div>
        )}
        <div>
          <Label>Email</Label>
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="priya@example.com" />
        </div>
        <div>
          <Label>Password</Label>
          <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} />
        </div>
        <button className={`${btn} w-full !py-3`} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
        {mode === 'login' && (
          <div className="text-center text-sm">
            <Link href="/forgot" className="font-medium text-primary-600 hover:underline">Forgot password?</Link>
          </div>
        )}
        <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="font-semibold text-primary-600 hover:underline"
          >
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
