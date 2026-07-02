import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../lib/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log Wings',
          tabBarIcon: function({ focused }) {
            return <Text style={{ fontSize: 22 }}>{focused ? '🍗' : '🍖'}</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'My Stats',
          tabBarIcon: function() {
            return <Text style={{ fontSize: 22 }}>📊</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: function() {
            return <Text style={{ fontSize: 22 }}>🏆</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: function() {
            return <Text style={{ fontSize: 22 }}>👤</Text>;
          },
        }}
      />
    </Tabs>
  );
}
