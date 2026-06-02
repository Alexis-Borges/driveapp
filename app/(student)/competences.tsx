import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { CompetencesList } from '../../components/shared/CompetencesList';
import { useCompetencesCatalog, useStudentCompetences } from '../../hooks/useCompetences';

export default function StudentCompetences() {
  const { data: catalog = [] } = useCompetencesCatalog();
  const { data: states = [] } = useStudentCompetences();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Mes compétences (REMC)" />

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
