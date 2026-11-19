import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../_lib/api';
import { Notice, btn, input } from '../_components/ui';
import { AuthShell } from '../_components/AuthShell';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const send = useMutation({ mutationFn: () => api('POST', '/auth/forgot', { email: email.trim() }) });

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a code to choose a new password.">
      {send.isSuccess ? (
        <div className="space-y-4">
          <Notice tone="success">
            If an account exists for {email.trim()}, we&apos;ve emailed a reset code. It expires in 30 minutes.
          </Notice>
          <Link to={`/reset?email=${encodeURIComponent(email.trim())}`} className={`${btn} w-full !py-3`}>
            I have my code
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <Notice error={send.error} />
          <input className={input} type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className={`${btn} w-full !py-3`} disabled={send.isPending}>
            {send.isPending ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      )}
      <div className="mt-5 text-center text-sm">
        <Link to="/login" className="font-medium text-primary-600 hover:underline">Back to log in</Link>
      </div>
    </AuthShell>
  );
}
