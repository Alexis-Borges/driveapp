import { Linking, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const SUPPORT_EMAIL = 'support@driveapp.fr';

export function AppFooter() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View className="px-5 mt-6 items-center gap-1.5">
      <View className="flex-row gap-3">
        <Pressable onPress={() => router.push('/legal/cgu')}>
          <Text className="text-muted text-[11px] underline">CGU</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/legal/privacy')}>
          <Text className="text-muted text-[11px] underline">Confidentialité</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/legal/mentions')}>
          <Text className="text-muted text-[11px] underline">Mentions légales</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() =>
          Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support%20DriveApp`)
        }
      >
        <Text className="text-muted text-xs underline">Contacter le support</Text>
      </Pressable>
      <Text className="text-muted2 text-[10px]">DriveApp · v{version}</Text>
    </View>
  );
}
