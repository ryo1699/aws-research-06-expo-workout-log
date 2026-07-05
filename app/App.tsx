import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DATABASE_NAME, migrateDbIfNeeded } from './src/db';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Tab.Screen
            name="ホーム"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="egg-outline" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="記録"
            component={RecordScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="barbell-outline" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="履歴"
            component={HistoryScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="コレクション"
            component={CollectionScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="albums-outline" color={color} size={size} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SQLiteProvider>
  );
}
