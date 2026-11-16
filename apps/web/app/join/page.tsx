'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { getToken } from '../_lib/api';

// Target of the "Join" link in the invite email: /join?token=...&email=...
export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <Join />
    </Suspense>
  );
}

function Join() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const token = sp.get('token');
    const email = sp.get('email') ?? '';
    if (token) {
      try {
        sessionStorage.setItem('fet_invite', token);
      } catch {
        /* storage unavailable */
      }
    }
    // Logged in: the dashboard accepts the saved invite automatically.
    // Not logged in: sign up or log in first, with the invited email pre-filled.
    if (getToken()) router.replace('/dashboard');
    else router.replace(`/login?invite=1&email=${encodeURIComponent(email)}`);
  }, [router, sp]);

  return <p className="py-20 text-center text-sm text-gray-400">Opening your invite…</p>;
}
