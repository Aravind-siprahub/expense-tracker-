import type { MetadataRoute } from 'next';

// Web app manifest: lets browsers install the site as an app (served at /manifest.webmanifest).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Family Expense Tracker',
    short_name: 'Expenses',
    description: 'Track your family income, expenses and monthly budget in one place.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f8ff',
    theme_color: '#2563eb',
    lang: 'en-IN',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the app icon to jump straight to these.
    shortcuts: [
      { name: 'Add Expense', short_name: 'Add', url: '/expenses/new', icons: [{ src: '/pwa-icon/192', sizes: '192x192' }] },
      { name: 'Dashboard', short_name: 'Dashboard', url: '/dashboard', icons: [{ src: '/pwa-icon/192', sizes: '192x192' }] },
      { name: 'Budget', short_name: 'Budget', url: '/budget', icons: [{ src: '/pwa-icon/192', sizes: '192x192' }] },
    ],
  };
}
