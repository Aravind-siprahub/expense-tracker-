import { useEffect } from 'react';
import { Link, useNavigate, useRouteError } from 'react-router-dom';
import { AlertCircle, RotateCcw, House } from 'lucide-react';
import { btn, btnGhost } from './_components/ui';

/** Shown by the router (as its errorElement) when a screen crashes. */
export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm">
        <AlertCircle size={28} />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">Something went wrong</h2>
      <p className="mt-1.5 max-w-md text-sm text-slate-500">
        An unexpected error occurred. You can try reloading this section or return to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => navigate(0)} className={btn}>
          <RotateCcw size={16} /> Try Again
        </button>
        <Link to="/dashboard" className={btnGhost}>
          <House size={16} /> Dashboard
        </Link>
      </div>
    </div>
  );
}
