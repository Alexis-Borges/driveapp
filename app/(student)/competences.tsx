import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CompetencesList } from '../../components/shared/CompetencesList';
import { useCompetencesCatalog, useStudentCompetences } from '../../hooks/useCompetences';

export default function StudentCompetences() {
  const router = useRouter();
  const { data: catalog = [] } = useCompetencesCatalog();
  const { data: states = [] } = useStudentCompetences();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
        <Pressable
          onPress={() => router.back()}
          className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
        >
          <Text className="text-muted text-sm">‹</Text>
        </Pressable>
        <Text className="text-text text-base font-bold">Mes compétences (REMC)</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
        <Text className="text-muted text-xs px-5 mb-3 leading-5">
          Le Référentiel Éducatif de la Conduite découpe l'apprentissage en 4 grandes
          compétences. Ton moniteur valide chaque sous-compétence au fil des séances.
        </Text>
        <CompetencesList catalog={catalog} states={states} />
      </ScrollView>
    </SafeAreaView>
  );
}
