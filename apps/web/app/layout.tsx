import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { PwaRegister } from './_components/PwaRegister';

export const metadata: Metadata = {
  title: 'Family Expense Tracker',
  description: 'Track family income, expenses and budgets',
  applicationName: 'Family Expense Tracker',
  // Makes "Add to Home Screen" on iPhone open the app full screen with its own name.
  appleWebApp: { capable: true, title: 'Expenses', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  // Older iOS versions look for this tag by its Apple name.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  // Lets the app draw under phone notches; the bottom bar adds its own safe-area padding.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
