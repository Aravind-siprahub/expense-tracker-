import { ImageResponse } from 'next/og';
import { brandIcon } from './_lib/brandIcon';

// Icon iPhones and iPads use for "Add to Home Screen". iOS rounds the corners itself, so it is full-bleed.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(brandIcon(180, 'maskable'), { ...size });
}
