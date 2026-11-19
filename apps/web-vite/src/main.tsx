import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { initSession } from './app/_lib/api';
import { setupNative } from './native';

async function start() {
  // Read the saved sign-in token first, so the very first screen already knows whether you are logged in.
  // (Never throws and gives up after a few seconds, so a storage problem cannot leave a blank page.)
  await initSession().catch(() => undefined);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );

  // Phone app only: status bar, back button, splash screen. Not awaited: the app is already showing.
  void setupNative().catch((e) => console.warn('[native] setup failed:', e));
}

void start();
