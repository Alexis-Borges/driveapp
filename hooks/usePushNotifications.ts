import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C75FF',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let granted = existing === 'granted';
  if (!granted) {
    const { status } = await Notifications.requestPermissionsAsync();
    granted = status === 'granted';
  }
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenResponse.data;
}

export function usePushRegistration() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();

  useEffect(() => {
    if (!profile) return;
    let mounted = true;

    (async () => {
      try {
        const token = await registerForPushAsync();
        if (!mounted || !token) return;
        await supabase
          .from('push_tokens')
          .upsert(
            {
              user_id: profile.id,
              token,
              device_info: `${Platform.OS} ${Device.osVersion ?? ''}`.trim(),
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: 'token' }
          );
      } catch {
        // silencieux
      }
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as
        | { type?: string; chat_with?: string; lesson_id?: string }
        | undefined;
      if (!data) return;
      const isInstructor = profile.role === 'instructor';

      if (data.type === 'message' && data.chat_with) {
        if (isInstructor) router.push(`/(instructor)/chat/${data.chat_with}`);
        else router.push('/(student)/messages');
      } else if (data.type === 'booking' || data.type === 'reminder') {
        router.push(isInstructor ? '/(instructor)/planning' : '/(student)/planning');
      } else if (data.type === 'cancel') {
        router.push(isInstructor ? '/(instructor)/home' : '/(student)/home');
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [profile?.id, profile?.role, router]);
}
