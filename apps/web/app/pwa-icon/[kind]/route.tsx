import { ImageResponse } from 'next/og';
import { brandIcon, type IconKind } from '../../_lib/brandIcon';

// PNG icons listed in the web app manifest: /pwa-icon/192, /pwa-icon/512 and /pwa-icon/maskable-512.
// Generated once at build time.
export const dynamic = 'force-static';

const ICONS: Record<string, { size: number; kind: IconKind }> = {
  '192': { size: 192, kind: 'any' },
  '512': { size: 512, kind: 'any' },
  'maskable-512': { size: 512, kind: 'maskable' },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((kind) => ({ kind }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const icon = ICONS[kind];
  if (!icon) return new Response('Not found', { status: 404 });
  return new ImageResponse(brandIcon(icon.size, icon.kind), { width: icon.size, height: icon.size });
}
