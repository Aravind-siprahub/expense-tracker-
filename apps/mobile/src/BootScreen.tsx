import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn, colors } from './ui';
import { DashboardSkeleton } from './Skeleton';
import { useWaitElapsedMs } from './lib/connection';
import { WAKING_MESSAGE, waitStage } from './lib/waiting';

/**
 * What the person sees while the app has nothing to show yet (first launch, or no saved data): the logo and an outline
 * of the dashboard, never a blank page. After 15 seconds it explains that the free server is waking up; after 40 seconds
 * it offers a Retry button. If the request failed outright it says so and offers Retry (and Log out).
 */
export function BootScreen({ error, onRetry, onLogout }: { error?: string | null; onRetry?: () => void; onLogout?: () => void }) {
  const elapsed = useWaitElapsedMs(!error);
  const stage = waitStage(elapsed);
  const showRetry = !!onRetry && (!!error || stage === 'retry');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-5 items-center">
          <Image source={require('../assets/splash-icon.png')} style={{ width: 88, height: 88 }} accessibilityLabel="Family Expense Tracker" />
          <View accessibilityLiveRegion="polite" className="mt-3 items-center gap-1.5">
            {error ? (
              <Text className="text-center text-sm font-medium text-rose-700">{error}</Text>
            ) : (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-sm text-slate-600">{stage === 'normal' ? 'Loading your account…' : WAKING_MESSAGE}</Text>
              </View>
            )}
            {!error && stage === 'retry' ? (
              <Text className="text-center text-xs text-slate-500">Still trying. You can retry now, or keep waiting.</Text>
            ) : null}
          </View>
          {showRetry ? (
            <View className="mt-3 w-full max-w-xs gap-2">
              <Btn label="Retry" onPress={onRetry!} />
              {error && onLogout ? <Btn label="Log out" variant="ghost" onPress={onLogout} /> : null}
            </View>
          ) : null}
        </View>
        <DashboardSkeleton />
      </ScrollView>
    </SafeAreaView>
  );
}
