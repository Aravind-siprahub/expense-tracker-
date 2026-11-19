import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The workspace packages (@repo/api-client, @repo/types, ...) are TypeScript source files, and Vite
// compiles them directly, so nothing like Next's `transpilePackages` is needed. `dedupe` makes sure
// React and TanStack Query load once, even though several packages depend on them.
export default defineConfig(({ mode }) => {
  // `vite build --mode app` builds the phone app. Inside the phone app the page host is "localhost", so the
  // app cannot guess where the API is: refuse to build without an explicit address.
  if (mode === 'app') {
    const env = loadEnv(mode, process.cwd(), '');
    if (!env.VITE_API_URL?.trim()) {
      throw new Error(
        'VITE_API_URL is not set. Create apps/web-vite/.env.app.local containing:\n' +
          '  VITE_API_URL=https://your-api.example.com\n' +
          '(see .env.app.example), then run the build again.',
      );
    }
  }

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom', '@tanstack/react-query'],
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
