'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../_lib/api';
import { Notice, btn, input } from '../_components/Shell';

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState(sp.get('email') ?? '');
  const [code, setCode] = useState(sp.get('code') ?? '');
  const [password, setPassword] = useState('');
  const reset = useMutation({
    mutationFn: () => api('POST', '/auth/reset', { email: email.trim(), code: code.trim(), newPassword: password }),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-primary-700">Choose a new password</h1>
        {reset.isSuccess ? (
          <div className="mt-4 space-y-4">
            <Notice tone="success">Your password has been changed. You can log in now.</Notice>
            <Link href="/login" className={`${btn} w-full`}>Go to log in</Link>
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              reset.mutate();
            }}
          >
            <Notice error={reset.error} />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reset code from your email</label>
              <input className={`${input} font-mono uppercase tracking-widest`} required placeholder="ABCD-2345" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">New password</label>
              <input className={input} type="password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className={`${btn} w-full`} disabled={reset.isPending}>{reset.isPending ? 'Saving…' : 'Change password'}</button>
          </form>
        )}
        <div className="mt-4 text-center text-sm">
          <Link href="/forgot" className="text-primary-600 hover:underline">Send me a new code</Link>
        </div>
      </div>
    </div>
  );
}
