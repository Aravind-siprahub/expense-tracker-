import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, LogOut, Settings, Tag, Target, Users, Wallet, type LucideIcon } from 'lucide-react-native';
import { Avatar, IconTile, Screen, cardShadow, colors, useMe, type Tone } from '../ui';
import { useSession } from '../session';

const items: readonly (readonly [string, string, LucideIcon, Tone])[] = [
  ['Income', 'Income', Wallet, 'amber'],
  ['Budget', 'Budget', Target, 'red'],
  ['Categories', 'Categories', Tag, 'amber'],
  ['Family', 'Family', Users, 'blue'],
  ['Settings', 'Settings', Settings, 'slate'],
];

export function MoreScreen() {
  const nav = useNavigation<any>();
  const me = useMe();
  const { signOut } = useSession();
  const name = me.data?.user.name ?? '';
  const family = me.data?.family;
  return (
    <Screen title="More">
      <View
        accessible
        accessibilityLabel={`Signed in as ${name}${family ? `, ${family.name}, ${family.role === 'ADMIN' ? 'Admin' : 'Member'}` : ''}`}
        className="flex-row items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4"
        style={cardShadow}
      >
        <Avatar name={name || '?'} size={48} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-semibold text-slate-900">{name}</Text>
          {family ? (
            <Text numberOfLines={1} className="text-xs text-slate-500">
              {family.name} · {family.role === 'ADMIN' ? 'Admin' : 'Member'}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="rounded-2xl border border-slate-200/70 bg-white p-2" style={cardShadow}>
        {items.map(([route, label, icon, tone], i) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            accessibilityLabel={`Open ${label}`}
            onPress={() => nav.navigate(route)}
            className={`flex-row items-center gap-3 rounded-xl px-3 py-3.5 active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
          >
            <IconTile icon={icon} tone={tone} />
            <Text numberOfLines={2} className="flex-1 text-sm font-medium text-slate-800">{label}</Text>
            <ChevronRight color={colors.chevron} size={18} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => signOut()}
          className="flex-row items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3.5 active:bg-rose-50"
        >
          <IconTile icon={LogOut} tone="red" />
          <Text className="flex-1 text-sm font-medium text-rose-600">Log out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
