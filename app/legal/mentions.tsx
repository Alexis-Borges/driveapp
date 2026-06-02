import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/shared/ScreenHeader';

export default function Mentions() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Mentions légales" />
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
