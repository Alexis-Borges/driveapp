import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
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

    return () => {
      mounted = false;
    };
  }, [profile?.id]);
}
