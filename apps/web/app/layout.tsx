import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'StackWeave',
  description: 'Full-stack monorepo',
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
