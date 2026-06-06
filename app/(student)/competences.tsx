import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { CompetencesList } from '../../components/shared/CompetencesList';
import { ProgressRing } from '../../components/shared/ProgressRing';
import { useCompetencesCatalog, useStudentCompetences } from '../../hooks/useCompetences';

export default function StudentCompetences() {
  const { data: catalog = [] } = useCompetencesCatalog();
  const { data: states = [] } = useStudentCompetences();

  const summary = useMemo(() => {
    const subs = catalog.filter((c) => c.parent_id != null);
    const total = subs.length;
    const stateMap = new Map(states.map((s) => [s.competence_id, s.status]));
    let acquired = 0;
    let inProgress = 0;
    for (const c of subs) {
      const st = stateMap.get(c.id) ?? 'not_started';
      if (st === 'acquired') acquired++;
      else if (st === 'in_progress') inProgress++;
    }
    return {
      total,
      acquired,
      inProgress,
      notStarted: total - acquired - inProgress,
      progress: total > 0 ? acquired / total : 0,
    };
  }, [catalog, states]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Mes compétences (REMC)" />

      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
        {/* résumé global */}
        {summary.total > 0 ? (
          <View className="mx-5 mb-3 bg-card border border-border rounded-2xl px-4 py-3 flex-row items-center gap-4">
            <ProgressRing progress={summary.progress} label="acquis" />
            <View className="flex-1 gap-1.5">
              <LegendRow color="#00C896" label="Acquises" value={summary.acquired} />
              <LegendRow color="#FFB230" label="En cours" value={summary.inProgress} />
              <LegendRow color="#454B57" label="À aborder" value={summary.notStarted} />
            </View>
          </View>
        ) : null}

        <Text className="text-muted text-xs px-5 mb-3 leading-5">
          Le Référentiel Éducatif de la Conduite découpe l'apprentissage en 4 grandes
          compétences. Ton moniteur valide chaque sous-compétence au fil des séances.
        </Text>
        <CompetencesList catalog={catalog} states={states} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ backgroundColor: color }} className="w-2.5 h-2.5 rounded-full" />
      <Text className="text-muted text-[12px] flex-1">{label}</Text>
      <Text className="text-text text-[12px] font-bold">{value}</Text>
    </View>
  );
}
