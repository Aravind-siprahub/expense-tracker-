'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep devices in sync: refresh when the tab regains focus and every 30 seconds
            // while it is open, so an expense added on a phone shows up on the web.
            refetchOnWindowFocus: true,
            refetchInterval: 30_000,
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
