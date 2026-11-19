import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { getToken } from '../_lib/api';

// Target of the "Join" link in the invite email: /join?token=...&email=...
export default function Join() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

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
    if (getToken()) navigate('/dashboard', { replace: true });
    else navigate(`/login?invite=1&email=${encodeURIComponent(email)}`, { replace: true });
  }, [navigate, sp]);

  return <p className="py-20 text-center text-sm text-gray-400">Opening your invite…</p>;
}
