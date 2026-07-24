import '../global.css';
import { useEffect } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isExpoGo } from '../lib/isExpoGo';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { useAuthBootstrap } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { usePushRegistration } from '../hooks/usePushNotifications';
import { identify, initObservability, reset as resetObservability } from '../lib/observability';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

initObservability();

// require() conditionnel : un `import` statique de @stripe/stripe-react-native
// ferait planter Expo Go au chargement du bundle (module natif absent).
const StripeProvider: ComponentType<{
  publishableKey: string;
  merchantIdentifier: string;
  children: ReactNode;
}> = isExpoGo
  ? ({ children }) => children
  : require('@stripe/stripe-react-native').StripeProvider;

// Defaults pensés mobile : on évite les refetch redondants (chaque écran
// remonté re-déclenchait un fetch réseau). Les mutations + Realtime + le
// pull-to-refresh invalident explicitement quand c'est nécessaire.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 s : les données restent "fraîches", pas de refetch au montage
      gcTime: 5 * 60_000, // 5 min en cache avant garbage collection
      retry: 1, // une seule nouvelle tentative en cas d'échec réseau
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function RootNav() {
  useAuthBootstrap();
  usePushRegistration();
  const { session, profile, loading } = useAuthStore();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inLegal = segments[0] === 'legal';

    if (!session) {
      resetObservability();
      if (!inAuth && !inLegal) router.replace('/(auth)/login');
      return;
    }
    // Identify dès qu'on a l'id (attribution crash sur l'écran verify inclus).
    // L'effet se rejoue quand `profile` charge → le rôle s'enrichit ensuite,
    // donc pas de propriété figée à undefined.
    if (session.user.id) identify(session.user.id, profile ? { role: profile.role } : undefined);
    // Email non vérifié → on bloque sur l'écran "verify"
    if (!session.user.email_confirmed_at && segments[1] !== 'verify') {
      router.replace('/(auth)/verify');
      return;
    }
    if (!profile) return; // wait for profile fetch
    if (profile.role === 'admin' && segments[0] !== '(admin)') {
      router.replace('/(admin)/home');
    } else if (profile.role === 'instructor' && segments[0] !== '(instructor)') {
      router.replace('/(instructor)/home');
    } else if (profile.role === 'student' && segments[0] !== '(student)') {
      router.replace('/(student)/home');
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#7C75FF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0C0D0F' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(instructor)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="legal" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMMono_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#7C75FF" />
      </View>
    );
  }

  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0C0D0F' }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StripeProvider publishableKey={stripeKey} merchantIdentifier="merchant.com.driveapp.mobile">
            <StatusBar style="light" />
            <ErrorBoundary>
              <RootNav />
            </ErrorBoundary>
          </StripeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
