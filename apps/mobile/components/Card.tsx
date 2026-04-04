/// <reference path="./className.d.ts" />
import { View, Text } from 'react-native';

interface CardProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function Card({ title, subtitle, className }: CardProps) {
  return (
    <View
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className ?? ''}`}
    >
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      {subtitle ? (
        <Text className="mt-1 text-sm text-gray-500">{subtitle}</Text>
      ) : null}
    </View>
  );
}
