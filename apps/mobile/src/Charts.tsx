import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { colors } from './ui';

// Chart-only colors: the category palette and the ring/axis tints have no matching UI token.
// 18 colours: the app ships 14 categories and families add their own, and neighbouring slices must never share a colour.
export const CHART_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b',
  '#0d9488', '#4f46e5', '#eab308', '#0ea5e9', '#92400e', '#c026d3', '#be123c', '#1e3a8a',
];

const TRACK_DONUT = '#eef2ff';
const TRACK_EMPTY = '#e0ecff';
const TRACK_RING = '#e8f0fe';
const GRID = '#e2e8f0';
const INCOME_BAR = '#34d399';
const EXPENSE_BAR = '#2563eb';
const RING_OVER = '#f43f5e';
const RING_WARN = '#f59e0b';
const HIDDEN_FROM_READERS = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

const money = (v: number) =>
  '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });

const compact = (v: number) => {
  if (v >= 10_000_000) return `${+(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `${+(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}K`;
  return String(v);
};

/** Ring geometry shared by the donut charts: a 36-unit viewBox with radius 15.9155 (circumference 100). */
function Ring36({
  size,
  track,
  stroke,
  rotate,
  children,
}: {
  size: number;
  track: string;
  stroke: number;
  rotate?: number;
  children?: React.ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" {...HIDDEN_FROM_READERS}>
      <G rotation={rotate ?? 0} origin="18, 18">
        <Circle cx={18} cy={18} r={15.9155} fill="none" stroke={track} strokeWidth={stroke} />
        {children}
      </G>
    </Svg>
  );
}

export function Donut({
  data,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; onPress?: () => void }[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 15.9155;
  // Each arc starts where the previous one ended; the circle begins at 12 o'clock (offset 25).
  const startOffsets = data.map((_, i) => 25 - data.slice(0, i).reduce((s, x) => s + (x.value / total) * 100, 0));
  const size = 176;
  const summary = `Spending by category${centerValue ? `, total ${centerValue}` : ''}: ${data
    .map((d) => `${d.label} ${Math.round(d.value).toLocaleString('en-IN')} rupees, ${Math.round((d.value / total) * 100)} percent`)
    .join('; ')}`;
  return (
    <View className="items-center gap-5">
      <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={summary}>
        <Ring36 size={size} track={TRACK_DONUT} stroke={3.6}>
          {data.map((d, i) => {
            const pct = (d.value / total) * 100;
            const len = Math.max(pct - 0.6, 0);
            return (
              <Circle
                key={d.label}
                cx={18}
                cy={18}
                r={r}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={3.6}
                strokeDasharray={`${len} ${100 - len}`}
                strokeDashoffset={startOffsets[i]}
              />
            );
          })}
        </Ring36>
        {centerLabel || centerValue ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center" {...HIDDEN_FROM_READERS}>
            {centerLabel ? <Text className="text-[11px] text-slate-400">{centerLabel}</Text> : null}
            {centerValue ? <Text className="text-base font-bold text-slate-800">{centerValue}</Text> : null}
          </View>
        ) : null}
      </View>
      <View className="w-full gap-0.5">
        {data.map((d, i) => (
          <Pressable
            key={d.label}
            disabled={!d.onPress}
            onPress={d.onPress}
            accessibilityRole={d.onPress ? 'button' : 'text'}
            accessibilityLabel={`${d.label}, ${Math.round(d.value).toLocaleString('en-IN')} rupees${d.onPress ? '. Show expenses' : ''}`}
            className="flex-row items-center gap-2 rounded-lg px-1.5 py-1.5 active:bg-slate-50"
          >
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <Text numberOfLines={2} className="flex-1 text-sm text-slate-600">{d.label}</Text>
            <Text className="text-sm font-medium text-slate-800">{money(d.value)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function EmptyDonut({ label = 'No data', small = false }: { label?: string; small?: boolean }) {
  const size = small ? 128 : 176;
  return (
    <View className="items-center">
      <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={`Chart: ${label}`}>
        <Ring36 size={size} track={TRACK_EMPTY} stroke={3.6} />
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Text className="text-sm text-slate-400">{label}</Text>
        </View>
      </View>
    </View>
  );
}

export function Ring({ percent, over }: { percent: number; over?: boolean }) {
  const p = Math.max(0, Math.min(100, percent));
  const size = 144;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Budget used: ${Math.round(percent)} percent${over ? ', over budget' : ''}`}
    >
      <Ring36 size={size} track={TRACK_RING} stroke={3.4} rotate={-90}>
        <Circle
          cx={18}
          cy={18}
          r={15.9155}
          fill="none"
          stroke={over ? RING_OVER : p > 85 ? RING_WARN : colors.primary}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeDasharray={`${p} ${100 - p}`}
        />
      </Ring36>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <Text className="text-2xl font-bold text-slate-800">{Math.round(percent)}%</Text>
      </View>
    </View>
  );
}

export function Progress({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const over = total > 0 && used > total;
  const color = over ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary-500';
  return (
    <View
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.round(pct)} percent used${over ? ', over budget' : ''}`}
    >
      <View className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </View>
  );
}

/** Income vs expenses, grouped bars with a labelled axis. Values are in rupees. */
export function Bars({ data, width }: { data: { label: string; a: number; b: number }[]; width: number }) {
  const maxRaw = Math.max(...data.flatMap((d) => [d.a, d.b]), 0);
  const step = maxRaw <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const top = maxRaw <= 0 ? 4 : Math.ceil(maxRaw / step) * step;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);
  const empty = maxRaw <= 0;

  const axisW = 40;
  const H = 192;
  const plotW = Math.max(width - axisW, 40);
  const groupW = plotW / data.length;
  const barW = Math.min(28, groupW / 3);
  const gap = 8;
  const summary = `Income versus expenses: ${data
    .map((d) => `${d.label}, income ${Math.round(d.a).toLocaleString('en-IN')} rupees, expenses ${Math.round(d.b).toLocaleString('en-IN')} rupees`)
    .join('; ')}`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={empty ? 'Income versus expenses: no data to display' : summary}>
      <View style={{ flexDirection: 'row', height: H }}>
        <View style={{ width: axisW, height: H, justifyContent: 'space-between', paddingRight: 8 }}>
          {ticks.map((t, i) => (
            <Text key={i} className="text-right text-[11px] text-slate-400" style={{ lineHeight: 12 }}>
              {empty ? '' : compact(t)}
            </Text>
          ))}
        </View>
        <View style={{ width: plotW, height: H }}>
          <Svg width={plotW} height={H} {...HIDDEN_FROM_READERS}>
            {ticks.map((_, i) => (
              <Line
                key={i}
                x1={0}
                x2={plotW}
                y1={Math.min(Math.max((i / 4) * H, 0.5), H - 0.5)}
                y2={Math.min(Math.max((i / 4) * H, 0.5), H - 0.5)}
                stroke={GRID}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}
            {data.map((d, i) => {
              const ha = (d.a / top) * H;
              const hb = (d.b / top) * H;
              const x0 = i * groupW + (groupW - (barW * 2 + gap)) / 2;
              return (
                <G key={d.label}>
                  <Rect x={x0} y={H - ha} width={barW} height={ha} rx={5} fill={INCOME_BAR} />
                  <Rect x={x0 + barW + gap} y={H - hb} width={barW} height={hb} rx={5} fill={EXPENSE_BAR} />
                </G>
              );
            })}
          </Svg>
          {empty ? (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <Text className="text-sm text-slate-400">No data to display</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ marginLeft: axisW, width: plotW, flexDirection: 'row' }} className="mt-2">
        {data.map((d) => (
          <Text key={d.label} numberOfLines={1} className="text-center text-xs text-slate-500" style={{ width: groupW }}>
            {d.label}
          </Text>
        ))}
      </View>
      <View className="mt-4 flex-row justify-center gap-5">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          <Text className="text-xs text-slate-600">Income</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm bg-primary-600" />
          <Text className="text-xs text-slate-600">Expenses</Text>
        </View>
      </View>
    </View>
  );
}
