import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Mentions() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
        <Pressable
          onPress={() => router.back()}
          className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
        >
          <Text className="text-muted text-sm">‹</Text>
        </Pressable>
        <Text className="text-text text-base font-bold">Mentions légales</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-text text-sm font-bold mb-2">Éditeur</Text>
        <Text className="text-muted text-[12px] leading-5 mb-4">
          DriveApp SAS — Capital social : à compléter{'\n'}
          Siège social : à compléter{'\n'}
          SIRET : à compléter — RCS : à compléter{'\n'}
          TVA intracommunautaire : à compléter{'\n'}
          Directeur de la publication : à compléter
        </Text>

        <Text className="text-text text-sm font-bold mb-2">Hébergeur</Text>
        <Text className="text-muted text-[12px] leading-5 mb-4">
          Supabase Inc. — 970 Toa Payoh North #07-04 Singapore 318992{'\n'}
          (données stockées en UE — région eu-central-1)
        </Text>

        <Text className="text-text text-sm font-bold mb-2">Contact</Text>
        <Text className="text-muted text-[12px] leading-5">
          Support : support@driveapp.fr{'\n'}
          DPO : dpo@driveapp.fr
        </Text>

        <Text className="text-muted2 text-[10px] mt-6 italic">
          À compléter avec les informations légales réelles avant publication.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
