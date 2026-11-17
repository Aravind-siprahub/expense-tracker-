'use client';

import Link from 'next/link';
import { ChevronRight, Settings, Tag, Target, Users, Wallet } from 'lucide-react';
import { IconTile, PageHeader, Panel } from '../../_components/ui';

const items = [
  { href: '/income', label: 'Income', icon: Wallet, tone: 'amber' },
  { href: '/budget', label: 'Budget', icon: Target, tone: 'red' },
  { href: '/categories', label: 'Categories', icon: Tag, tone: 'amber' },
  { href: '/family', label: 'Family', icon: Users, tone: 'blue' },
  { href: '/settings', label: 'Settings', icon: Settings, tone: 'slate' },
] as const;

export default function More() {
  return (
    <>
      <PageHeader title="More" />
      <Panel className="!p-2">
        <ul className="divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-3.5 transition hover:bg-slate-50">
                <IconTile icon={i.icon} tone={i.tone} />
                <span className="flex-1 text-sm font-medium text-slate-800">{i.label}</span>
                <ChevronRight size={18} className="text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
