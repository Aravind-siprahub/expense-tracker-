import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { api, setToken } from '../_lib/api';
import { Label, Notice, btn, input } from '../_components/ui';
import { AuthShell } from '../_components/AuthShell';

function getPasswordStrength(p: string): { label: string; barColor: string; textColor: string; width: string } {
  if (!p) return { label: '', barColor: 'bg-slate-200', textColor: 'text-slate-400', width: '0%' };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;

  if (score <= 2) return { label: 'Weak (min 8 characters)', barColor: 'bg-rose-500', textColor: 'text-rose-600', width: '33%' };
  if (score <= 3) return { label: 'Good', barColor: 'bg-amber-500', textColor: 'text-amber-600', width: '66%' };
  return { label: 'Strong', barColor: 'bg-emerald-500', textColor: 'text-emerald-600', width: '100%' };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      navigate('/dashboard', { replace: true });
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
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
              placeholder="Priya Sharma"
            />
          </div>
        )}
        <div>
          <Label>Email</Label>
          <input
            className={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="priya@example.com"
          />
        </div>
        <div>
          <Label>Password</Label>
          <div className="relative">
            <input
              className={`${input} pr-10`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {mode === 'register' && password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full transition-all duration-300 ${getPasswordStrength(password).barColor}`}
                  style={{ width: getPasswordStrength(password).width }}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Password strength:</span>
                <span className={`font-medium ${getPasswordStrength(password).textColor}`}>
                  {getPasswordStrength(password).label}
                </span>
              </div>
            </div>
          )}
        </div>
        <button className={`${btn} w-full !py-3`} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
        {mode === 'login' && (
          <div className="text-center text-sm">
            <Link to="/forgot" className="font-medium text-primary-600 hover:underline">Forgot password?</Link>
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
