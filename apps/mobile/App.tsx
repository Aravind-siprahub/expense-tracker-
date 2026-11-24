import './global.css';

import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from './src/session';
import { Root } from './src/Root';
import { ErrorBoundary } from './src/ErrorBoundary';
import { BootScreen } from './src/BootScreen';
import { clearPersistedCache, flushCache, restoreCache, startPersisting } from './src/lib/cache';
import { warmUpServer } from './src/lib/warmup';

// Wake the (free, sleeping) server the moment the app starts, before anything has drawn. Never blocks, never throws.
void warmUpServer();

// Data refreshes when the app returns to the foreground and when the network comes back. Only the screens that
// show shared family data also poll (see useLiveRefetch in src/ui.tsx), and only while they are on screen.
// gcTime is long so data restored from the phone's saved copy is not thrown away before a screen asks for it.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000, gcTime: 24 * 60 * 60 * 1000, refetchInterval: false } },
});

/**
 * Puts the last saved account and dashboard data back before the first screen draws (so a returning user sees their
 * data at once while fresh data loads), and keeps saving it while signed in. A failed or missing copy just means a normal start.
 */
function CacheGate({ children }: { children: ReactNode }) {
  const { ready, signedIn } = useSession();
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    restoreCache(queryClient).finally(() => {
      if (active) setRestored(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Not signed in (or logged out): nothing saved may stay on the phone.
  useEffect(() => {
    if (ready && !signedIn) void clearPersistedCache();
  }, [ready, signedIn]);

  useEffect(() => {
    if (!restored || !signedIn) return;
    const stop = startPersisting(queryClient);
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') void flushCache(queryClient);
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [restored, signedIn]);

  if (!restored) return <BootScreen />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <CacheGate>
              <Root />
            </CacheGate>
          </SessionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
