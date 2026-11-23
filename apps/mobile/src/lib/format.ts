const pad = (n: number) => String(n).padStart(2, '0');

/** Paise → "₹1,234.50" (whole rupees shown without decimals). */
export const inr = (paise: number) => {
  const hasPaise = Math.abs(paise) % 100 !== 0;
  return (
    '₹' +
    (Math.abs(paise) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
};

/** Indian digit grouping: 1234567 → "12,34,567". */
const groupIndian = (digits: string) => {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
};

/**
 * Live formatting for amount fields: adds commas while typing ("1250000.5" → "12,50,000.5"),
 * keeps at most 2 decimals and drops anything that isn't a digit or a dot.
 */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  const intPart = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '').slice(0, 10);
  const grouped = groupIndian(intPart);
  if (dot === -1) return grouped;
  const dec = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return `${grouped || '0'}.${dec}`;
}

/** What the user typed ("1,250.50") → integer paise, or null if invalid. */
export function toPaise(text: string): number | null {
  const n = Number(text.replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Paise → text for an amount field, with commas ("125050" → "1,250.5"). */
export const toRupeesText = (paise: number) => formatAmountInput(String(paise / 100));

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** "2026-11" → first and last day, for the History date-range filter. */
export const monthBounds = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
};

export type HistoryFilters = { month?: string; categoryId?: string; userId?: string };

/** Open Expense History pre-filtered (Dashboard, Reports and Family tap-through). */
export const openHistory = (nav: { navigate: (...args: any[]) => void }, f: HistoryFilters) => {
  const range = f.month ? monthBounds(f.month) : { from: '', to: '' };
  nav.navigate('Tabs', {
    screen: 'History',
    params: { ...range, categoryId: f.categoryId ?? '', userId: f.userId ?? '', stamp: Date.now() },
  });
};

export const dateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
};

/** "2026-11-19" → a local Date at noon (noon avoids daylight-saving edge cases), or null when invalid. */
export const parseISODate = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
};

/** A Date → "2026-11-19" using the local calendar day. */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
