import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 22 }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A0F0A',
          borderTopColor: '#3D2618',
        },
        tabBarActiveTintColor: '#E8722A',
        tabBarInactiveTintColor: '#78716c',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log Wings',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '🍗' : '🍖'} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'My Stats',
          tabBarIcon={() => <Icon label="📊" />},
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon={() => <Icon label="🏆" />},
        }}
      />
    </Tabs>
  );
}
