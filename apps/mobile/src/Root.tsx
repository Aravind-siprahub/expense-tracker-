import { View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BarChart3, Ellipsis, LayoutDashboard, Plus, Receipt, type LucideIcon } from 'lucide-react-native';
import { useSession } from './session';
import { ConnectionBanner, UpdatingIndicator, colors, navShadow, useMe } from './ui';
import { BootScreen } from './BootScreen';
import { restartWait } from './lib/connection';
import { warmUpServer } from './lib/warmup';
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

  // Starts the wait over and asks the server to wake up again, then tries the account request once more.
  const retry = () => {
    restartWait();
    void warmUpServer();
    void me.refetch();
  };

  // The screen is never blank: saved (or freshly loaded) account data always wins, even if the latest request failed;
  // with no data yet we show the logo and a dashboard outline, and a Retry option if the request failed.
  let body;
  if (!ready) body = <BootScreen />;
  else if (!signedIn) body = <AuthScreen />;
  else if (me.data) body = me.data.family ? <Main /> : <OnboardingScreen name={me.data.user.name} />;
  else if (me.error) body = <BootScreen error={me.error.message} onRetry={retry} onLogout={signOut} />;
  else body = <BootScreen onRetry={retry} />;

  return (
    <View style={{ flex: 1 }}>
      {body}
      <ConnectionBanner />
      <UpdatingIndicator />
      <StatusBar style="dark" />
    </View>
  );
}
