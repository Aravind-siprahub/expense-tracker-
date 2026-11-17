'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../_lib/api';
import { Label, Notice, btn, input } from '../_components/ui';
import { AuthShell } from '../_components/AuthShell';

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
    <AuthShell title="Choose a new password" subtitle="Enter the code from your email.">
      {reset.isSuccess ? (
        <div className="space-y-4">
          <Notice tone="success">Your password has been changed. You can log in now.</Notice>
          <Link href="/login" className={`${btn} w-full !py-3`}>Go to log in</Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            reset.mutate();
          }}
        >
          <Notice error={reset.error} />
          <div>
            <Label>Email</Label>
            <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Reset code from your email</Label>
            <input className={`${input} font-mono uppercase tracking-widest`} required placeholder="ABCD-2345" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>New password</Label>
            <input className={input} type="password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className={`${btn} w-full !py-3`} disabled={reset.isPending}>
            {reset.isPending ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}
      <div className="mt-5 text-center text-sm">
        <Link href="/forgot" className="font-medium text-primary-600 hover:underline">Send me a new code</Link>
      </div>
    </AuthShell>
  );
}
