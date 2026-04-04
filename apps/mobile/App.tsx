import './global.css';

import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from '@repo/api-client';
import { AppContent } from './AppContent';

if (__DEV__) {
  const host =
    process.env.EXPO_PUBLIC_API_URL ??
    (Platform.OS === 'android'
      ? 'http://10.0.2.2:3001'
      : 'http://localhost:3001');
  configure({ baseURL: host });
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
