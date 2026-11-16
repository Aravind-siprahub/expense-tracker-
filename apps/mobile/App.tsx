import './global.css';

import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from './src/session';
import { Root } from './src/Root';

// Keep devices in sync: refresh every 30 seconds while the app is open, and again
// whenever the app returns to the foreground.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5_000, refetchInterval: 30_000 } },
});

export default function App() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <Root />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
