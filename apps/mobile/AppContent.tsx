import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useUsers } from '@repo/api-client';
import { Card } from './components/Card';

export function AppContent() {
  const { data: users = [], isLoading } = useUsers();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-5 pt-14">
      <Text className="mb-5 text-center text-2xl font-bold text-gray-900">
        StackWeave Mobile
      </Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Card title={item.name ?? '—'} subtitle={item.email} />
        )}
      />
      <StatusBar style="auto" />
    </View>
  );
}
