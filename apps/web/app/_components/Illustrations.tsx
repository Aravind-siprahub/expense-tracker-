// Small flat illustrations used in empty states and page corners.
// Soft blues with a touch of gold and green, in the same style as the rest of the UI.

type Props = { className?: string };

const Defs = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#60a5fa" />
      <stop offset="1" stopColor="#2563eb" />
    </linearGradient>
    <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fcd34d" />
      <stop offset="1" stopColor="#f59e0b" />
    </linearGradient>
  </defs>
);

const Coin = ({ cx, cy, r, id }: { cx: number; cy: number; r: number; id: string }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-gold)`} />
    <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="#fffbeb" strokeOpacity="0.7" strokeWidth="1.5" />
    <text x={cx} y={cy + r * 0.3} textAnchor="middle" fontSize={r} fontWeight="700" fill="#b45309">
      ₹
    </text>
  </g>
);

const Leaves = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="0" rx="6" ry="16" fill="#86efac" transform="rotate(-25)" />
    <ellipse cx="12" cy="-6" rx="5" ry="14" fill="#4ade80" transform="rotate(20)" />
    <ellipse cx="-12" cy="-4" rx="5" ry="13" fill="#bbf7d0" transform="rotate(-50)" />
  </g>
);

/** Money bag with coins: income. */
export function MoneyBagArt({ className = 'h-28 w-36' }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Money bag">
      <Defs id="mb" />
      <ellipse cx="108" cy="112" rx="84" ry="30" fill="#e0ecff" />
      <path
        d="M108 52 C78 58 58 90 68 116 C75 134 141 134 148 116 C158 90 138 58 108 52 Z"
        fill="url(#mb-blue)"
      />
      <path d="M94 40 Q108 28 122 40 L116 56 L100 56 Z" fill="#3b82f6" />
      <rect x="96" y="54" width="24" height="6" rx="3" fill="#1d4ed8" />
      <text x="108" y="106" textAnchor="middle" fontSize="38" fontWeight="700" fill="#fff">
        ₹
      </text>
      <ellipse cx="52" cy="128" rx="28" ry="8" fill="#f59e0b" />
      <ellipse cx="52" cy="122" rx="28" ry="8" fill="#fbbf24" />
      <ellipse cx="52" cy="116" rx="28" ry="8" fill="#fcd34d" />
      <Coin cx={160} cy={126} r={13} id="mb" />
    </svg>
  );
}

/** Calendar with a coin: nothing recorded yet. */
export function CalendarArt({ className = 'h-28 w-36' }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Calendar">
      <Defs id="ca" />
      <ellipse cx="104" cy="118" rx="80" ry="22" fill="#e0ecff" />
      <rect x="52" y="22" width="104" height="92" rx="12" fill="#fff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M52 34 a12 12 0 0 1 12 -12 h80 a12 12 0 0 1 12 12 v14 h-104 z" fill="url(#ca-blue)" />
      <rect x="72" y="14" width="6" height="14" rx="3" fill="#1d4ed8" />
      <rect x="130" y="14" width="6" height="14" rx="3" fill="#1d4ed8" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={62 + c * 22}
            y={58 + r * 17}
            width="14"
            height="11"
            rx="3"
            fill={c === 2 && r === 1 ? '#93c5fd' : '#e0ecff'}
          />
        )),
      )}
      <Coin cx={150} cy={108} r={20} id="ca" />
      <Leaves x={36} y={108} />
    </svg>
  );
}

/** Document with a magnifier: no results. */
export function DocSearchArt({ className = 'h-28 w-36' }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="No results">
      <Defs id="ds" />
      <ellipse cx="104" cy="120" rx="76" ry="20" fill="#e0ecff" />
      <rect x="58" y="14" width="78" height="100" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="2" />
      <rect x="70" y="30" width="30" height="8" rx="4" fill="#93c5fd" />
      <rect x="70" y="48" width="54" height="6" rx="3" fill="#e0ecff" />
      <rect x="70" y="62" width="54" height="6" rx="3" fill="#e0ecff" />
      <rect x="70" y="76" width="36" height="6" rx="3" fill="#e0ecff" />
      <circle cx="132" cy="92" r="22" fill="#fff" fillOpacity="0.85" stroke="url(#ds-blue)" strokeWidth="6" />
      <path d="M148 108 L166 126" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

/** Laptop with a shield: settings and security. */
export function SettingsArt({ className = 'h-36 w-48' }: Props) {
  return (
    <svg viewBox="0 0 220 170" className={className} role="img" aria-label="Settings">
      <Defs id="se" />
      <ellipse cx="116" cy="140" rx="92" ry="22" fill="#e0ecff" />
      <rect x="52" y="48" width="116" height="78" rx="9" fill="#fff" stroke="#bfdbfe" strokeWidth="2" />
      <rect x="62" y="58" width="96" height="58" rx="5" fill="#eff6ff" />
      <rect x="70" y="68" width="40" height="6" rx="3" fill="#bfdbfe" />
      <rect x="70" y="80" width="56" height="6" rx="3" fill="#dbeafe" />
      <path d="M40 126 h140 l-8 12 h-124 z" fill="#93c5fd" />
      <circle cx="60" cy="44" r="22" fill="none" stroke="url(#se-blue)" strokeWidth="9" strokeDasharray="7 5" />
      <circle cx="60" cy="44" r="13" fill="#fff" stroke="#3b82f6" strokeWidth="4" />
      <path d="M150 56 l22 8 v20 c0 14 -10 24 -22 30 c-12 -6 -22 -16 -22 -30 v-20 z" fill="url(#se-blue)" />
      <path d="M140 84 l8 8 l14 -16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <Leaves x={192} y={134} />
    </svg>
  );
}

/** Group of people: family. */
export function FamilyArt({ className = 'h-28 w-36' }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Family">
      <Defs id="fa" />
      <ellipse cx="102" cy="118" rx="80" ry="22" fill="#e0ecff" />
      <circle cx="100" cy="52" r="20" fill="url(#fa-blue)" />
      <path d="M62 112 c0 -26 16 -40 38 -40 s38 14 38 40 z" fill="url(#fa-blue)" />
      <circle cx="56" cy="68" r="14" fill="#93c5fd" />
      <path d="M30 112 c0 -18 11 -28 26 -28 s26 10 26 28 z" fill="#93c5fd" />
      <circle cx="148" cy="72" r="12" fill="#bfdbfe" />
      <path d="M126 112 c0 -16 9 -24 22 -24 s22 8 22 24 z" fill="#bfdbfe" />
      <Leaves x={172} y={114} />
    </svg>
  );
}
