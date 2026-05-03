import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const tabIcon = (emoji: string) => ({ color }: { color: string }) =>
  <Text style={{ fontSize: 18, color }}>{emoji}</Text>;

export default function StudentTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#131517',
          borderTopColor: '#2A2D33',
          height: 72,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#00C896',
        tabBarInactiveTintColor: '#454B57',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Accueil', tabBarIcon: tabIcon('🏠') }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning', tabBarIcon: tabIcon('📅') }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: tabIcon('💬') }} />
      <Tabs.Screen name="shop" options={{ title: 'Boutique', tabBarIcon: tabIcon('🛒') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}
