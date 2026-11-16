import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Panel, Screen, useMe } from '../ui';

const items = [
  ['Income', '💰 Income'],
  ['Budget', '🎯 Budget'],
  ['Categories', '🏷️ Categories'],
  ['Family', '👨‍👩‍👧 Family'],
  ['Settings', '⚙️ Settings'],
] as const;

export function MoreScreen() {
  const nav = useNavigation<any>();
  const me = useMe();
  return (
    <Screen>
      <View className="px-1">
        <Text className="text-lg font-semibold text-gray-900">{me.data?.user.name}</Text>
        <Text className="text-sm text-gray-500">{me.data?.family?.name}</Text>
      </View>
      <Panel>
        {items.map(([route, label], i) => (
          <Pressable
            key={route}
            onPress={() => nav.navigate(route)}
            className={`flex-row items-center justify-between py-4 ${i < items.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <Text className="text-base text-gray-900">{label}</Text>
            <Text className="text-gray-400">›</Text>
          </Pressable>
        ))}
      </Panel>
    </Screen>
  );
}
