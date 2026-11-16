'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../_lib/api';
import { Notice, btn, input } from '../_components/Shell';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const send = useMutation({ mutationFn: () => api('POST', '/auth/forgot', { email: email.trim() }) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-primary-700">Forgot password</h1>
        {send.isSuccess ? (
          <div className="mt-4 space-y-4">
            <Notice tone="success">
              If an account exists for {email.trim()}, we&apos;ve emailed a reset code. It expires in 30 minutes.
            </Notice>
            <Link href={`/reset?email=${encodeURIComponent(email.trim())}`} className={`${btn} w-full`}>
              I have my code
            </Link>
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <p className="text-sm text-gray-500">Enter your email and we&apos;ll send you a code to choose a new password.</p>
            <Notice error={send.error} />
            <input className={input} type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className={`${btn} w-full`} disabled={send.isPending}>{send.isPending ? 'Sending…' : 'Send reset code'}</button>
          </form>
        )}
        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary-600 hover:underline">Back to log in</Link>
        </div>
      </div>
    </div>
  );
}
