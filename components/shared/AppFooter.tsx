import { Linking, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';

const SUPPORT_EMAIL = 'support@driveapp.fr';

export function AppFooter() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View className="px-5 mt-6 items-center gap-1.5">
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
