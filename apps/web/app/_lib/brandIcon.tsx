// The app icon (blue rounded square with a white house), drawn in code so no image files are needed.
// Rendered to PNG by Next's ImageResponse for the favicon, the Apple icon and the PWA icons.

export type IconKind = 'any' | 'maskable';

/**
 * "any" icons have rounded corners. "maskable" icons are full-bleed with the house kept inside the
 * central safe zone, because Android crops them to its own shape (circle, squircle, ...).
 */
export function brandIcon(size: number, kind: IconKind = 'any') {
  const radius = kind === 'maskable' ? 0 : Math.round(size * 0.22);
  const glyph = Math.round(size * (kind === 'maskable' ? 0.5 : 0.58));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        borderRadius: radius,
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    </div>
  );
}
