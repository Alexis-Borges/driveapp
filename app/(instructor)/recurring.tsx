import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import {
  useCreateRecurringSlot,
  useDeleteRecurringSlot,
  useRecurringSlots,
} from '../../hooks/useRecurringSlots';
import { useInstructorSelf } from '../../hooks/useInstructorSelf';
import { bookableHoursFor } from '../../lib/planning';
import type { RecurringSlotRow } from '../../types/database';

// Lundi → Samedi (les auto-écoles travaillent rarement le dimanche).
const DAYS = [
  { idx: 1, label: 'Lun' },
  { idx: 2, label: 'Mar' },
  { idx: 3, label: 'Mer' },
  { idx: 4, label: 'Jeu' },
  { idx: 5, label: 'Ven' },
  { idx: 6, label: 'Sam' },
];

function keyOf(weekday: number, hour: number) {
  return `${weekday}-${hour}`;
}

export default function RecurringSlots() {
  const { data: rules = [] } = useRecurringSlots();
  const { data: instr } = useInstructorSelf();
  const bookableHours = bookableHoursFor(instr?.works_lunch_hour);
  const create = useCreateRecurringSlot();
  const del = useDeleteRecurringSlot();

  const byKey = useMemo(() => {
    const m = new Map<string, RecurringSlotRow>();
    for (const r of rules) m.set(keyOf(r.weekday, r.hour), r);
    return m;
  }, [rules]);

  function toggleCell(weekday: number, hour: number) {
    const existing = byKey.get(keyOf(weekday, hour));
    if (existing) {
      del.mutate(existing.id);
    } else {
      create.mutate(
        { weekday, hour },
        {
          onError: (e: unknown) =>
            Alert.alert('Impossible', e instanceof Error ? e.message : 'Erreur'),
        }
      );
    }
  }

  const activeCount = rules.length;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Créneaux récurrents" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-muted text-xs px-5 mt-3 leading-5">
          Appuie sur une case pour définir tes disponibilités hebdomadaires. Les créneaux
          libres seront générés automatiquement chaque dimanche soir pour les 4 prochaines
          semaines.
        </Text>

        <SectionLabel>Ma semaine type · {activeCount} créneaux</SectionLabel>

        <View className="mx-5 bg-card border border-border rounded-2xl p-2.5">
          {/* en-tête jours */}
          <View className="flex-row mb-1.5">
            <View style={{ width: 34 }} />
            {DAYS.map((d) => (
              <View key={d.idx} className="flex-1 items-center">
                <Text className="text-muted2 text-[10px] font-bold uppercase">{d.label}</Text>
              </View>
            ))}
          </View>

          {/* lignes heures */}
          {bookableHours.map((h) => (
            <View key={h} className="flex-row items-center mb-1">
              <Text className="font-mono text-[10px] text-muted2 text-right" style={{ width: 30 }}>
                {String(h).padStart(2, '0')}h
              </Text>
              {DAYS.map((d) => {
                const active = byKey.has(keyOf(d.idx, h));
                return (
                  <View key={d.idx} className="flex-1 items-center">
                    <Pressable
                      onPress={() => toggleCell(d.idx, h)}
                      className={`w-7 h-7 rounded-lg items-center justify-center ${
                        active ? 'bg-instructor' : 'bg-card2 border border-border'
                      }`}
                    >
                      {active ? (
                        <View className="w-2 h-2 rounded-full bg-white" />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View className="mx-5 mt-3 flex-row items-center gap-2">
          <View className="w-3 h-3 rounded bg-instructor" />
          <Text className="text-muted2 text-[11px]">Disponible chaque semaine</Text>
          <View className="w-3 h-3 rounded bg-card2 border border-border ml-3" />
          <Text className="text-muted2 text-[11px]">Fermé</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
