import type { ReactNode } from 'react';
import { Shell } from '../_components/Shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
