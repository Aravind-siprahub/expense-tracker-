import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSession } from './session';
import { Btn, Loading, Notice, useMe } from './ui';
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

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>
);

const Empty = () => null;

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1d4ed8' }}>
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Dashboard', tabBarLabel: 'Home', tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Expense History', tabBarIcon: icon('🧾') }} />
      <Tab.Screen
        name="Add"
        component={Empty}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={{ marginTop: -22, height: 56, width: 56, borderRadius: 28, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
              <Text style={{ color: 'white', fontSize: 32, lineHeight: 36 }}>+</Text>
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
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: icon('📊') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarIcon: icon('☰') }} />
    </Tab.Navigator>
  );
}

function Main() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Expense', presentation: 'modal' }} />
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
  const me = useMe();

  let body;
  if (!ready) body = <Loading />;
  else if (!signedIn) body = <AuthScreen />;
  else if (me.isLoading) body = <Loading />;
  else if (me.error || !me.data) {
    body = (
      <SafeAreaView className="flex-1 justify-center gap-4 bg-gray-50 p-6">
        <Notice error={me.error} />
        <Btn label="Try again" onPress={() => me.refetch()} />
        <Btn label="Log out" variant="ghost" onPress={signOut} />
      </SafeAreaView>
    );
  } else if (!me.data.family) body = <OnboardingScreen name={me.data.user.name} />;
  else body = <Main />;

  return (
    <>
      {body}
      <StatusBar style="auto" />
    </>
  );
}
