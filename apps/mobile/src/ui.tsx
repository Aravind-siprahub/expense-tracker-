import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContext, useIsFocused } from '@react-navigation/native';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from './lib/api';
import { monthLabel, parseISODate, shiftMonth, toISODate } from './lib/format';
import { restartWait, useSlowConnection, useSlowElapsedMs } from './lib/connection';
import { WAKING_MESSAGE, waitStage } from './lib/waiting';
import { warmUpServer } from './lib/warmup';
import type { Me } from './lib/types';

// Look and feel copied from the web app (apps/web-vite): same palette, rounded cards with a soft blue shadow,
// icon tiles, page headers and alerts. Class names come from the shared Tailwind config.

export const colors = {
  page: '#f5f8ff',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryText: '#1e40af',
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  // Extra tokens so screens never hard-code a hex value
  text2: '#334155',
  primaryLight: '#dbeafe',
  white: '#ffffff',
  danger: '#e11d48',
  dangerDark: '#be123c',
  success: '#059669',
  successDark: '#047857',
  warn: '#d97706',
  warnDark: '#92400e',
  chevron: '#9ca3af',
};

/** The web's `shadow-card`: a faint dark edge plus a soft blue glow. */
export const cardShadow: ViewStyle = {
  shadowColor: '#2563eb',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 3,
};
/** The web's `shadow-nav`: the stronger blue glow under the active nav item and the add button. */
export const navShadow: ViewStyle = {
  shadowColor: '#2563eb',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius: 10,
  elevation: 6,
};

/** Tab screens have no native header (they show their own big title); stack screens keep the native one with a back button. */
export function useIsTabScreen() {
  const nav = useContext(NavigationContext);
  return nav?.getState()?.type === 'tab';
}

/** `enabled` lets the root wait until the saved login has been read, so we never ask "who am I?" without a token. */
export const useMe = (enabled = true) =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('GET', '/me'),
    // A sleeping server often times out the first request just before it finishes waking up, so try again
    // (twice at most) when the problem is the connection. Any other answer (for example "log in again") is final.
    retry: (count, error) => count < 2 && error instanceof ApiError && error.status === 0,
    retryDelay: 1500,
    enabled,
  });

// ── Icon tiles ───────────────────────────────────────────────────────────────

export type Tone =
  | 'blue'
  | 'green'
  | 'red'
  | 'amber'
  | 'purple'
  | 'slate'
  | 'teal';

export const TONES: Record<
  Tone,
  { tile: string; color: string; text: string; card: string }
> = {
  blue: {
    tile: 'bg-blue-50',
    color: '#2563eb',
    text: 'text-blue-600',
    card: '#eff6ff',
  },
  green: {
    tile: 'bg-emerald-50',
    color: '#059669',
    text: 'text-emerald-600',
    card: '#ecfdf5',
  },
  red: {
    tile: 'bg-rose-50',
    color: '#f43f5e',
    text: 'text-rose-600',
    card: '#fff1f2',
  },
  amber: {
    tile: 'bg-amber-50',
    color: '#d97706',
    text: 'text-amber-600',
    card: '#fffbeb',
  },
  purple: {
    tile: 'bg-violet-50',
    color: '#7c3aed',
    text: 'text-violet-600',
    card: '#f5f3ff',
  },
  teal: {
    tile: 'bg-teal-50',
    color: '#0d9488',
    text: 'text-teal-600',
    card: '#f0fdfa',
  },
  slate: {
    tile: 'bg-slate-100',
    color: '#64748b',
    text: 'text-slate-600',
    card: '#f8fafc',
  },
};

export function IconTile({
  icon: Icon,
  tone = 'blue',
  size = 'md',
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
  }[size];
  const ico = { sm: 16, md: 20, lg: 24 }[size];
  return (
    <View className={`items-center justify-center ${box} ${TONES[tone].tile}`}>
      <Icon size={ico} color={TONES[tone].color} strokeWidth={2} />
    </View>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      className="items-center justify-center rounded-full bg-primary-100"
      style={{ width: size, height: size }}
    >
      <Text
        className="font-semibold text-primary-700"
        style={{ fontSize: size * 0.42 }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ── Layout pieces ────────────────────────────────────────────────────────────

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Big page title like the web's PageHeader. Stack screens already show a native title, so it is optional. */
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const isTab = useIsTabScreen();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.page }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: isTab ? insets.top + 12 : 16,
          paddingBottom: 32 + insets.bottom,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {title ? (
          <PageHeader title={title} subtitle={subtitle} action={action} />
        ) : null}
        {children}
      </ScrollView>
      {isTab ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: colors.page,
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const isTab = useIsTabScreen();
  // Stack screens already show the title in the native header: only add the subtitle and action.
  if (!isTab && !subtitle && !action) return null;
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">
        {isTab ? (
          <Text className="text-[26px] font-bold leading-8 tracking-tight text-slate-900">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className={`text-sm text-slate-500 ${isTab ? 'mt-1' : ''}`}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function Panel({
  title,
  icon,
  tone = 'blue',
  action,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      className="rounded-2xl border border-slate-200/70 bg-white p-4"
      style={cardShadow}
    >
      {title || action ? (
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-2.5">
            {icon ? <IconTile icon={icon} tone={tone} size="sm" /> : null}
            {title ? (
              <Text className="text-[15px] font-semibold text-slate-800">
                {title}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function StatCard({
  label,
  value,
  tone,
  icon,
  hint,
  compact,
  onPress,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: LucideIcon;
  hint?: string;
  /** Smaller, icon-on-top card for two-per-row grids on phones. */
  compact?: boolean;
  onPress?: () => void;
}) {
  if (compact) {
    return (
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${label}: ${value}` : undefined}
        className={`rounded-2xl border border-slate-200/70 p-3.5 ${onPress ? 'active:opacity-80' : ''}`}
        style={[
          cardShadow,
          { backgroundColor: TONES[tone].card, flexGrow: 1, flexBasis: '44%' },
        ]}
      >
        <IconTile icon={icon} tone={tone} size="md" />
        <Text className="mt-3 text-xs text-slate-500">{label}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className={`text-xl font-bold tracking-tight ${TONES[tone].text}`}
        >
          {value}
        </Text>
        {hint ? (
          <Text numberOfLines={2} className="mt-0.5 text-[11px] text-slate-400">
            {hint}
          </Text>
        ) : null}
      </Pressable>
    );
  }
  return (
    <View
      className="flex-row items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4"
      style={[cardShadow, { backgroundColor: TONES[tone].card }]}
    >
      <IconTile icon={icon} tone={tone} size="lg" />
      <View className="min-w-0 flex-1">
        <Text className="text-sm text-slate-500">{label}</Text>
        <Text
          numberOfLines={1}
          className={`text-[26px] font-bold leading-9 tracking-tight ${TONES[tone].text}`}
        >
          {value}
        </Text>
        {hint ? <Text className="text-xs text-slate-400">{hint}</Text> : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center px-4 py-6">
      {icon ? <IconTile icon={icon} tone="blue" size="lg" /> : null}
      <Text className="mt-3 text-sm font-semibold text-slate-800">{title}</Text>
      {text ? (
        <Text className="mt-1 text-center text-sm text-slate-500">{text}</Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}

// ── Buttons and inputs ───────────────────────────────────────────────────────

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  const styles = {
    primary: 'bg-primary-600 active:bg-primary-700',
    ghost: 'border border-slate-200 bg-white active:bg-slate-50',
    danger: 'border border-rose-200 bg-white active:bg-rose-50',
  }[variant];
  const text = {
    primary: 'text-white',
    ghost: 'text-slate-700',
    danger: 'text-rose-600',
  }[variant];
  const iconColor = {
    primary: colors.white,
    ghost: colors.text2,
    danger: colors.danger,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 ${styles} ${disabled ? 'opacity-50' : ''}`}
      style={
        variant === 'primary'
          ? {
              shadowColor: '#0f172a',
              shadowOpacity: 0.1,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }
          : undefined
      }
    >
      {Icon ? <Icon size={18} color={iconColor} /> : null}
      <Text className={`text-sm font-semibold ${text}`}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: { label?: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? (
        <Text className="mb-1.5 text-xs font-medium text-slate-500">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        // A read-only field (for example the family name for a non-admin) looks disabled instead of editable.
        className={`rounded-xl border px-3.5 py-3 text-sm ${
          props.editable === false
            ? 'bg-slate-50 text-slate-500'
            : 'bg-white text-slate-900'
        } ${focused ? 'border-primary-400' : 'border-slate-200'}`}
        style={
          focused
            ? {
                borderWidth: 1,
                shadowColor: '#3b82f6',
                shadowOpacity: 0.25,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
              }
            : undefined
        }
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${active ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-white'}`}
    >
      <Text
        className={`text-sm ${active ? 'font-semibold text-primary-700' : 'text-slate-600'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export function Notice({
  error,
  tone = 'error',
  children,
  onDismiss,
}: {
  error?: unknown;
  tone?: 'error' | 'success' | 'warn';
  children?: ReactNode;
  /** Called when the person closes the alert (lets the caller remember the dismissal). */
  onDismiss?: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const message =
    typeof error === 'string' && error
      ? error
      : error instanceof Error
        ? error.message
        : error
          ? 'Something went wrong'
          : null;
  const hasContent = children != null || message != null;

  // Show the alert again when a new one arrives: once the old content is gone, forget the dismissal.
  useEffect(() => {
    if (hasContent) return;
    const timer = setTimeout(() => setHidden(false), 0);
    return () => clearTimeout(timer);
  }, [hasContent]);

  if (!hasContent || hidden) return null;
  const box = {
    error: 'border-rose-200 bg-rose-50',
    success: 'border-emerald-200 bg-emerald-50',
    warn: 'border-amber-200 bg-amber-50',
  }[tone];
  const color = {
    error: 'text-rose-700',
    success: 'text-emerald-700',
    warn: 'text-amber-800',
  }[tone];
  const iconColor = {
    error: colors.dangerDark,
    success: colors.successDark,
    warn: colors.warnDark,
  }[tone];
  return (
    <View
      className={`flex-row items-start gap-3 rounded-xl border px-4 py-3 ${box}`}
    >
      <Text className={`flex-1 text-sm ${color}`}>{children ?? message}</Text>
      <Pressable
        onPress={() => {
          setHidden(true);
          onDismiss?.();
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        style={{ opacity: 0.6 }}
      >
        <X size={16} color={iconColor} />
      </Pressable>
    </View>
  );
}

export function Loading() {
  return (
    <View
      className="items-center py-16"
      style={{ backgroundColor: colors.page }}
    >
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** Full-screen centered page on the soft blue background (used by login and similar screens). */
export function PageBackground({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      {children}
    </SafeAreaView>
  );
}

// ── Month picker: a pill like the web's, with previous/next arrows ───────────

export function MonthSwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (m: string) => void;
}) {
  return (
    <View
      className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-1 py-1"
      style={cardShadow}
    >
      <Pressable
        className="p-2.5"
        hitSlop={6}
        onPress={() => onChange(shiftMonth(value, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
      >
        <ChevronLeft size={20} color={colors.primaryDark} />
      </Pressable>
      <View className="flex-row items-center gap-2">
        <CalendarDays size={16} color={colors.faint} />
        <Text className="text-sm font-medium text-slate-700">
          {monthLabel(value)}
        </Text>
      </View>
      <Pressable
        className="p-2.5"
        hitSlop={6}
        onPress={() => onChange(shiftMonth(value, 1))}
        accessibilityRole="button"
        accessibilityLabel="Next month"
      >
        <ChevronRight size={20} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

export function Bar({
  used,
  total,
  tone,
}: {
  used: number;
  total: number;
  tone?: 'auto' | 'blue';
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const over = total > 0 && used > total;
  const color =
    tone === 'blue'
      ? 'bg-primary-500'
      : over
        ? 'bg-rose-500'
        : pct >= 80
          ? 'bg-amber-500'
          : 'bg-emerald-500';
  return (
    <View className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <View
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}

// ── Native date field ────────────────────────────────────────────────────────

/**
 * Tap-to-pick date field (the phone's own calendar), replacing hand-typed YYYY-MM-DD text.
 * `value` and `onChange` use the same "YYYY-MM-DD" text the API expects.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  clearable = false,
  maximumDate,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Show a clear (x) button so the date can be emptied (used by optional filters). */
  clearable?: boolean;
  maximumDate?: Date;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const shown = parseISODate(value);
  const current = shown ?? new Date();

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChange(toISODate(d));
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };

  return (
    <View>
      {label ? (
        <Text className="mb-1.5 text-xs font-medium text-slate-500">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Date'}: ${shown ? value : 'not set'}. Double tap to change.`}
        onPress={open}
        className="flex-row items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 active:bg-slate-50"
      >
        <CalendarDays size={16} color={colors.faint} />
        <Text
          className={`flex-1 text-sm ${shown ? 'text-slate-900' : 'text-slate-400'}`}
        >
          {shown ? value : placeholder}
        </Text>
        {clearable && shown ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label ?? 'date'}`}
            hitSlop={10}
            onPress={() => onChange('')}
          >
            <X size={16} color={colors.faint} />
          </Pressable>
        ) : null}
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="inline"
          maximumDate={maximumDate}
          onChange={(_e, d) => {
            if (d) onChange(toISODate(d));
          }}
        />
      ) : null}
    </View>
  );
}

// ── Connection feedback and live refresh ─────────────────────────────────────

/**
 * Banner shown while the server is slow to answer (the free hosting plan sleeps; waking it takes a while).
 * After 15 seconds it says the server is waking up; after 40 seconds it offers a Retry button.
 */
export function ConnectionBanner() {
  const slow = useSlowConnection();
  const elapsed = useSlowElapsedMs();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  if (!slow) return null;
  const stage = waitStage(elapsed);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      // Lets taps pass through to the screen below, except on the Retry button.
      pointerEvents="box-none"
      className="items-center justify-center gap-1 border-b border-primary-200 bg-primary-50 px-4 pb-2.5"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: insets.top + 10,
      }}
    >
      <View className="flex-row items-center justify-center gap-2" pointerEvents="none">
        <Loader size={16} color={colors.primary} />
        <Text className="text-sm text-primary-800">
          {stage === 'normal' ? 'Connecting to your account. This may take a moment.' : WAKING_MESSAGE}
        </Text>
      </View>
      {stage === 'retry' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={() => {
            restartWait();
            void warmUpServer();
            void qc.refetchQueries({ type: 'active' });
          }}
          className="rounded-lg border border-primary-300 bg-white px-4 py-1.5 active:bg-primary-50"
        >
          <Text className="text-sm font-semibold text-primary-700">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A small "Updating…" chip while saved data is on screen and fresh data is being fetched in the background.
 * It appears only if the refresh takes more than a moment, and gives way to the connection banner when that shows.
 */
export function UpdatingIndicator() {
  const fetching = useIsFetching() > 0;
  const slow = useSlowConnection();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Appear only after half a second of fetching; disappear as soon as it stops.
    const id = setTimeout(() => setShow(fetching), fetching ? 500 : 0);
    return () => clearTimeout(id);
  }, [fetching]);
  if (!show || slow) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Updating"
      className="flex-row items-center gap-1.5 rounded-full border border-primary-200 bg-white/95 px-2.5 py-1"
      style={{ position: 'absolute', top: insets.top + 6, right: 12, zIndex: 40, ...cardShadow }}
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <Text className="text-xs font-medium text-primary-700">Updating…</Text>
    </View>
  );
}

/**
 * Poll interval for screens that show shared family data (so one person's change shows up for the others).
 * Polls only while the screen is in front; the app already refreshes when it returns to the foreground.
 */
export function useLiveRefetch(ms = 30_000): number | false {
  return useIsFocused() ? ms : false;
}
