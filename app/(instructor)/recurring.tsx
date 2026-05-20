import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/shared/BottomSheet';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { Icon } from '../../components/ui/Icon';
import {
  useCreateRecurringSlot,
  useDeleteRecurringSlot,
  useRecurringSlots,
  useToggleRecurringSlot,
} from '../../hooks/useRecurringSlots';
import { BOOKABLE_HOURS } from '../../lib/planning';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function RecurringSlots() {
  const router = useRouter();
  const { data: rules = [] } = useRecurringSlots();
  const create = useCreateRecurringSlot();
  const toggle = useToggleRecurringSlot();
  const del = useDeleteRecurringSlot();

  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(10);

  async function add() {
    try {
      await create.mutateAsync({ weekday: day, hour });
      setOpen(false);
    } catch (e: unknown) {
      Alert.alert('Impossible', e instanceof Error ? e.message : 'Erreur');
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Supprimer cette règle ?', 'Les créneaux déjà créés ne seront pas supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
        <Pressable
          onPress={() => router.back()}
          className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
        >
          <Text className="text-muted text-sm">‹</Text>
        </Pressable>
        <Text className="text-text text-base font-bold">Créneaux récurrents</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-muted text-xs px-5 mt-3 leading-5">
          Définis tes disponibilités hebdomadaires. Les créneaux libres seront générés
          automatiquement chaque dimanche soir pour les 4 prochaines semaines.
        </Text>

        <SectionLabel>Mes règles ({rules.length})</SectionLabel>
        {rules.length === 0 ? (
          <Text className="text-muted2 text-xs px-5">Aucune règle. Ajoute ta première en bas.</Text>
        ) : (
          rules.map((r) => (
            <View
              key={r.id}
              className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-text text-sm font-bold">
                  {DAYS[r.weekday]} · {String(r.hour).padStart(2, '0')}h00
                </Text>
                <Text className="text-muted2 text-[10px] mt-0.5">{r.type}</Text>
              </View>
              <Switch
                value={r.active}
                onValueChange={(v) => toggle.mutate({ id: r.id, active: v })}
                trackColor={{ false: '#2A2D33', true: '#7C75FF' }}
              />
              <Pressable onPress={() => confirmDelete(r.id)} className="ml-3">
                <Icon name="trash" size={16} color="#FF4F4F" />
              </Pressable>
            </View>
          ))
        )}

        <View className="px-5 mt-4">
          <Button
            label="+ Ajouter une règle"
            variant="instructor"
            onPress={() => setOpen(true)}
          />
        </View>
      </ScrollView>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text className="text-text text-base font-bold mb-1">Nouveau créneau récurrent</Text>
        <Text className="text-muted text-xs mb-4">Choisis le jour et l'heure.</Text>

        <Text className="text-muted2 text-[10px] uppercase tracking-wider mb-1.5">Jour</Text>
        <View className="flex-row gap-1.5 mb-3">
          {DAYS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => setDay(i)}
              className={`flex-1 py-2 rounded-xl border items-center ${
                day === i ? 'bg-instructor border-instructor' : 'bg-card border-border'
              }`}
            >
              <Text className={day === i ? 'text-white font-bold text-xs' : 'text-text text-xs'}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-muted2 text-[10px] uppercase tracking-wider mb-1.5">Heure</Text>
        <View className="flex-row flex-wrap gap-1.5 mb-4">
          {BOOKABLE_HOURS.map((h) => (
            <Pressable
              key={h}
              onPress={() => setHour(h)}
              className={`px-3 py-2 rounded-xl border ${
                hour === h ? 'bg-instructor border-instructor' : 'bg-card border-border'
              }`}
            >
              <Text className={hour === h ? 'text-white font-bold text-xs' : 'text-text text-xs'}>
                {String(h).padStart(2, '0')}h
              </Text>
            </Pressable>
          ))}
        </View>

        <Button label="Créer la règle" variant="instructor" onPress={add} loading={create.isPending} />
      </BottomSheet>
    </SafeAreaView>
  );
}
