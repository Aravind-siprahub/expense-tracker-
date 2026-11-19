import { Link } from 'react-router-dom';
import { House, Compass } from 'lucide-react';
import { btn } from './_components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-sm">
        <Compass size={32} />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you are looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-6">
        <Link to="/dashboard" className={btn}>
          <House size={16} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
