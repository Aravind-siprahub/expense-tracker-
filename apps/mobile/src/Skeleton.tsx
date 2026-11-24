import { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue, type ViewStyle } from 'react-native';
import { cardShadow } from './ui';

/** A grey block that gently pulses, standing in for content that has not loaded yet. */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: ViewStyle }) {
  const [opacity] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: '#dbe4f3', opacity }, style]} />;
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="rounded-2xl border border-slate-200/70 bg-white p-4" style={cardShadow}>
    {children}
  </View>
);

/** Placeholder with the same shape as the Dashboard: title, summary cards, a chart card and a few rows. */
export function DashboardSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading dashboard" className="gap-4">
      <View className="gap-2">
        <Skeleton width="55%" height={26} />
        <Skeleton width="35%" height={14} />
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Card>
            <Skeleton width="50%" height={12} />
            <Skeleton width="75%" height={24} style={{ marginTop: 10 }} />
          </Card>
        </View>
        <View className="flex-1">
          <Card>
            <Skeleton width="50%" height={12} />
            <Skeleton width="75%" height={24} style={{ marginTop: 10 }} />
          </Card>
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Card>
            <Skeleton width="50%" height={12} />
            <Skeleton width="75%" height={24} style={{ marginTop: 10 }} />
          </Card>
        </View>
        <View className="flex-1">
          <Card>
            <Skeleton width="50%" height={12} />
            <Skeleton width="75%" height={24} style={{ marginTop: 10 }} />
          </Card>
        </View>
      </View>
      <Card>
        <Skeleton width="40%" height={14} />
        <View className="mt-4 items-center">
          <Skeleton width={140} height={140} radius={70} />
        </View>
      </Card>
      <Card>
        <Skeleton width="45%" height={14} />
        {[0, 1, 2].map((i) => (
          <View key={i} className="mt-4 flex-row items-center gap-3">
            <Skeleton width={36} height={36} radius={12} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={12} />
              <Skeleton width="35%" height={10} />
            </View>
            <Skeleton width={56} height={14} />
          </View>
        ))}
      </Card>
    </View>
  );
}
