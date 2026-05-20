import { Tabs } from 'expo-router';
import { Icon, type IconName } from '../../../components/ui/Icon';

const tabIcon = (name: IconName) => ({ color }: { color: string }) =>
  <Icon name={name} size={22} color={color} strokeWidth={2} />;

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
      <Tabs.Screen name="home" options={{ title: 'Accueil', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: tabIcon('message') }} />
      <Tabs.Screen name="shop" options={{ title: 'Boutique', tabBarIcon: tabIcon('shop') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
