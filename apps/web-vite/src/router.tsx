import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { Shell } from './app/_components/Shell';
import ErrorBoundary from './app/error';
import NotFound from './app/not-found';
import { Loading } from './app/_components/ui';

/**
 * Route table: one place that lists every screen, replacing Next's folder-based routing.
 * Each page is loaded the first time it is opened, so the first screen downloads less code.
 */
const page = (load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

/** The logged-in screens share one layout: the navigation Shell (sidebar, bottom bar, login check). */
function AppLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    // Shown while the first screen's code is still downloading (pages load on demand).
    hydrateFallbackElement: <Loading />,
    children: [
      // Home page: go straight to the dashboard.
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Public screens
      { path: 'login', ...page(() => import('./app/login/page')) },
      { path: 'forgot', ...page(() => import('./app/forgot/page')) },
      { path: 'reset', ...page(() => import('./app/reset/page')) },
      { path: 'join', ...page(() => import('./app/join/page')) },

      // Logged-in screens
      {
        element: <AppLayout />,
        children: [
          { path: 'dashboard', ...page(() => import('./app/(app)/dashboard/page')) },
          { path: 'expenses', ...page(() => import('./app/(app)/expenses/page')) },
          { path: 'expenses/new', ...page(() => import('./app/(app)/expenses/new/page')) },
          { path: 'expenses/:id', ...page(() => import('./app/(app)/expenses/[id]/page')) },
          { path: 'income', ...page(() => import('./app/(app)/income/page')) },
          { path: 'budget', ...page(() => import('./app/(app)/budget/page')) },
          { path: 'categories', ...page(() => import('./app/(app)/categories/page')) },
          { path: 'reports', ...page(() => import('./app/(app)/reports/page')) },
          { path: 'family', ...page(() => import('./app/(app)/family/page')) },
          { path: 'settings', ...page(() => import('./app/(app)/settings/page')) },
          { path: 'more', ...page(() => import('./app/(app)/more/page')) },
        ],
      },

      // Anything else
      { path: '*', element: <NotFound /> },
    ],
  },
]);
