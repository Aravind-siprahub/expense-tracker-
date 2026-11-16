import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Family Expense Tracker',
  description: 'Track family income, expenses and budgets',
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
      </body>
    </html>
  );
}
