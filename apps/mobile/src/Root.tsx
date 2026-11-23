import { View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BarChart3, Ellipsis, LayoutDashboard, Plus, Receipt, type LucideIcon } from 'lucide-react-native';
import { useSession } from './session';
import { Btn, ConnectionBanner, Loading, Notice, colors, navShadow, useMe } from './ui';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ExpenseFormScreen } from './screens/ExpenseFormScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { MoreScreen } from './screens/MoreScreen';
import { IncomeScreen } from './screens/IncomeScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const icon = (Icon: LucideIcon) => {
  const TabIcon = ({ color, size }: { color: string; size: number }) => <Icon color={color} size={size} />;
  TabIcon.displayName = `TabIcon(${Icon.displayName ?? 'icon'})`;
  return TabIcon;
};

const Empty = () => null;

/** Page header like the web: soft blue page colour, bold dark title, no divider line. */
const headerOptions = {
  headerStyle: { backgroundColor: colors.page },
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
  headerTintColor: colors.primaryDark,
  contentStyle: { backgroundColor: colors.page },
};

// The tab bar must clear the home indicator (iPhones) and the gesture bar (Android), so its height and bottom padding
// include the bottom safe-area inset instead of being a fixed number.
function Tabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={{ ...headerOptions, headerShown: false, tabBarActiveTintColor: colors.primaryDark, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 11, fontWeight: '500' }, tabBarStyle: { backgroundColor: 'rgba(255,255,255,0.97)', borderTopColor: '#e2e8f0', height: 56 + insets.bottom, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 8) } }}>
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Dashboard', tabBarLabel: 'Dashboard', tabBarIcon: icon(LayoutDashboard) }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Expense History', tabBarLabel: 'Expenses', tabBarIcon: icon(Receipt) }} />
      <Tab.Screen
        name="Add"
        component={Empty}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={{ marginTop: -22, height: 56, width: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...navShadow }}>
              <Plus color="white" size={30} />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('ExpenseForm');
          },
        })}
      />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: icon(BarChart3) }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarIcon: icon(Ellipsis) }} />
    </Tab.Navigator>
  );
}

function Main() {
  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.page, primary: colors.primary } }}>
      <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={({ route }) => ({ title: (route.params as { id?: string } | undefined)?.id ? 'Edit Expense' : 'Add Expense', presentation: 'modal' })} />
        <Stack.Screen name="Income" component={IncomeScreen} />
        <Stack.Screen name="Budget" component={BudgetScreen} options={{ title: 'Monthly Budget' }} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="Family" component={FamilyScreen} options={{ title: 'Family Members' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function Root() {
  const { ready, signedIn, signOut } = useSession();
  const me = useMe(ready && signedIn);

  let body;
  if (!ready) body = <Loading />;
  else if (!signedIn) body = <AuthScreen />;
  else if (me.isLoading) body = <Loading />;
  else if (me.error || !me.data) {
    body = (
      <SafeAreaView className="flex-1 justify-center gap-4 p-6" style={{ backgroundColor: colors.page }}>
        <Notice error={me.error} />
        <Btn label="Try again" onPress={() => me.refetch()} />
        <Btn label="Log out" variant="ghost" onPress={signOut} />
      </SafeAreaView>
    );
  } else if (!me.data.family) body = <OnboardingScreen name={me.data.user.name} />;
  else body = <Main />;

  return (
    <View style={{ flex: 1 }}>
      {body}
      <ConnectionBanner />
      <StatusBar style="dark" />
    </View>
  );
}
