import { Stack } from 'expo-router';

export default function InstructorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0C0D0F' },
      }}
    />
  );
}
