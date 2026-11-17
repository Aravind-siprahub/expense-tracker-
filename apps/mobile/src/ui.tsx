import { useEffect, useState, type ReactNode } from 'react';
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
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { monthLabel, shiftMonth } from './lib/format';
import type { Me } from './lib/types';

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api<Me>('GET', '/me'), retry: false });

export function Screen({
  children,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4">
      {title ? <Text className="mb-3 text-base font-semibold text-gray-800">{title}</Text> : null}
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-primary-600 active:bg-primary-700',
    ghost: 'border border-gray-300 bg-white active:bg-gray-100',
    danger: 'border border-red-300 bg-white active:bg-red-50',
  }[variant];
  const text = { primary: 'text-white', ghost: 'text-gray-700', danger: 'text-red-600' }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center rounded-xl px-4 py-3 ${styles} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-base font-semibold ${text}`}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label?: string } & TextInputProps) {
  return (
    <View>
      {label ? <Text className="mb-1 text-xs font-medium text-gray-600">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9ca3af"
        className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900"
        {...props}
      />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${active ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'}`}
    >
      <Text className={`text-sm ${active ? 'font-semibold text-primary-700' : 'text-gray-600'}`}>{label}</Text>
    </Pressable>
  );
}

export function Notice({
  error,
  tone = 'error',
  children,
}: {
  error?: unknown;
  tone?: 'error' | 'success' | 'warn';
  children?: ReactNode;
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
    if (!hasContent) setHidden(false);
  }, [hasContent]);

  if (!hasContent || hidden) return null;
  const box = {
    error: 'border-red-200 bg-red-50',
    success: 'border-green-200 bg-green-50',
    warn: 'border-amber-200 bg-amber-50',
  }[tone];
  const color = { error: 'text-red-700', success: 'text-green-700', warn: 'text-amber-800' }[tone];
  return (
    <View className={`flex-row items-start gap-3 rounded-xl border px-4 py-3 ${box}`}>
      <Text className={`flex-1 text-sm ${color}`}>{children ?? message}</Text>
      <Pressable onPress={() => setHidden(true)} hitSlop={10} accessibilityLabel="Dismiss">
        <Text className={`text-lg leading-5 ${color}`}>×</Text>
      </Pressable>
    </View>
  );
}

export function Loading() {
  return (
    <View className="items-center py-10">
      <ActivityIndicator />
    </View>
  );
}

export function MonthSwitcher({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-2 py-1">
      <Pressable className="px-4 py-2" onPress={() => onChange(shiftMonth(value, -1))}>
        <Text className="text-xl text-primary-700">‹</Text>
      </Pressable>
      <Text className="text-base font-semibold text-gray-800">{monthLabel(value)}</Text>
      <Pressable className="px-4 py-2" onPress={() => onChange(shiftMonth(value, 1))}>
        <Text className="text-xl text-primary-700">›</Text>
      </Pressable>
    </View>
  );
}

export function Bar({ used, total, tone }: { used: number; total: number; tone?: 'auto' | 'blue' }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const over = total > 0 && used > total;
  const color =
    tone === 'blue' ? 'bg-primary-500' : over ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <View className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      <View className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
