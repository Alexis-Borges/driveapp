import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const { session, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg gap-4">
        <Text className="text-text text-3xl font-bold">DriveApp</Text>
        <ActivityIndicator color="#7C75FF" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#7C75FF" />
      </View>
    );
  }
  return (
    <Redirect
      href={profile.role === 'instructor' ? '/(instructor)/home' : '/(student)/home'}
    />
  );
}
