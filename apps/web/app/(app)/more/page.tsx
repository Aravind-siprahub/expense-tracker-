import Link from 'next/link';
import { PageHeader, Panel } from '../../_components/Shell';

const items = [
  ['/income', '💰 Income'],
  ['/budget', '🎯 Budget'],
  ['/categories', '🏷️ Categories'],
  ['/family', '👨‍👩‍👧 Family'],
  ['/settings', '⚙️ Settings'],
];

export default function More() {
  return (
    <>
      <PageHeader title="More" />
      <Panel>
        <ul className="divide-y divide-gray-100">
          {items.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block py-3 text-sm font-medium">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
