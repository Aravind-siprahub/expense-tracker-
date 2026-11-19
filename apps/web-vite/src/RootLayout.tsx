import { Outlet } from 'react-router-dom';
import { Providers } from './app/providers';
import { PwaRegister } from './app/_components/PwaRegister';

/** The equivalent of Next's app/layout.tsx: wraps every page with the data provider and the PWA helper. */
export function RootLayout() {
  return (
    <Providers>
      <Outlet />
      <PwaRegister />
    </Providers>
  );
}
