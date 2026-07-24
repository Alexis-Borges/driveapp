import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { useCreateSlotsBatch, type LessonType } from '../../hooks/useLessons';
import { useInstructorSelf } from '../../hooks/useInstructorSelf';
import { bookableHoursFor } from '../../lib/planning';
import { Icon, type IconName } from '../ui/Icon';

type Props = {
  visible: boolean;
  onClose: () => void;
  date: Date;
  takenHours: Set<number>;
  initialHour?: number | null;
};

const TYPES: { value: LessonType; label: string; desc: string; icon: IconName }[] = [
  { value: 'city', label: 'Ville', desc: 'Conduite urbaine, intersections, priorités', icon: 'pin' },
  { value: 'highway', label: 'Autoroute', desc: 'Insertion, dépassement, vitesse', icon: 'car' },
  { value: 'parking', label: 'Manœuvres', desc: 'Créneau, bataille, demi-tour', icon: 'home' },
  { value: 'evaluation', label: 'Évaluation', desc: 'Bilan de niveau de l\'élève', icon: 'clipboard' },
  { value: 'mock_exam', label: 'Examen blanc', desc: 'Simulation des conditions d\'examen', icon: 'graduation' },
  { value: 'other', label: 'Autre', desc: 'Séance personnalisée', icon: 'more' },
];

// Multi-sélection d'heures : tu ouvres tous tes créneaux libres de la
// journée en une seule action. Tout passe en une insertion batch côté
// useCreateSlotsBatch (~1 round-trip Supabase au lieu de N).
export function CreateSlotSheet({ visible, onClose, date, takenHours, initialHour }: Props) {
  const create = useCreateSlotsBatch();
  const [hours, setHours] = useState<Set<number>>(new Set());
  const [type, setType] = useState<LessonType>('city');
  const [pickup, setPickup] = useState('');

  const { data: instr } = useInstructorSelf();
  const available = useMemo(
    () => bookableHoursFor(instr?.works_lunch_hour).filter((h) => !takenHours.has(h)),
    [takenHours, instr?.works_lunch_hour]
  );

  // Pré-sélectionne l'heure tapée dans la grille à l'ouverture.
  useEffect(() => {
    if (!visible) return;
    setHours(initialHour != null ? new Set([initialHour]) : new Set());
    setType('city');
    setPickup('');
  }, [visible, initialHour]);

  function toggleHour(h: number) {
    setHours((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function selectAll() {
    setHours(new Set(available));
  }
  function clearAll() {
    setHours(new Set());
  }

  async function submit() {
    const list = Array.from(hours).sort((a, b) => a - b);
    if (list.length === 0) {
      Alert.alert('Sélectionne au moins une heure');
      return;
    }
    try {
      const n = await create.mutateAsync({
        hours: list,
        date,
        type,
        pickup_address: pickup.trim() || undefined,
      });
      Alert.alert(
        n > 1 ? `${n} créneaux créés` : 'Créneau créé',
        n > 1 ? `Tes ${n} disponibilités sont publiées.` : 'Ta disponibilité est publiée.'
      );
      onClose();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  const count = hours.size;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-base font-bold mb-1">
        {count > 1 ? `${count} créneaux libres` : 'Nouveau créneau'}
      </Text>
      <Text className="text-muted text-xs mb-3">
        {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        {available.length > 0 ? ' · tape pour ajouter / retirer' : ''}
      </Text>

      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-muted2 text-[10px] uppercase tracking-wider">Heures</Text>
        {available.length > 0 ? (
          <View className="flex-row gap-3">
            <Pressable onPress={selectAll}>
              <Text className="text-instructor text-[11px] font-bold">Tout</Text>
            </Pressable>
            {count > 0 ? (
              <Pressable onPress={clearAll}>
                <Text className="text-muted text-[11px] font-bold">Vider</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
      >
        {available.length === 0 ? (
          <Text className="text-muted2 text-xs">Toutes les heures sont prises.</Text>
        ) : (
          available.map((h) => {
            const sel = hours.has(h);
            return (
              <Pressable
                key={h}
                onPress={() => toggleHour(h)}
                className={`px-3 py-2 rounded-xl border min-w-[56px] items-center ${
                  sel ? 'bg-instructor border-instructor' : 'bg-card border-border'
                }`}
              >
                <Text className={sel ? 'text-white font-bold' : 'text-text font-medium'}>
                  {String(h).padStart(2, '0')}h
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Text className="text-muted2 text-[10px] uppercase tracking-wider mb-1.5 mt-2">
        Type de séance
      </Text>
      <View className="gap-1.5 mb-4">
        {TYPES.map((t) => {
          const sel = type === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              className={`rounded-2xl border px-3 py-2.5 flex-row items-center gap-3 ${
                sel ? 'bg-instructor/15 border-instructor' : 'bg-card border-border'
              }`}
            >
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center ${
                  sel ? 'bg-instructor/25' : 'bg-card2'
                }`}
              >
                <Icon name={t.icon} size={17} color={sel ? '#A09BFF' : '#878D9A'} />
              </View>
              <View className="flex-1">
                <Text className={`text-sm font-bold ${sel ? 'text-instructor' : 'text-text'}`}>
                  {t.label}
                </Text>
                <Text className="text-muted2 text-[10px] mt-0.5">{t.desc}</Text>
              </View>
              <View
                className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                  sel ? 'border-instructor' : 'border-border'
                }`}
              >
                {sel ? <View className="w-2 h-2 rounded-full bg-instructor" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-muted2 text-[10px] uppercase tracking-wider mb-1.5">
        Lieu de prise en charge (optionnel)
      </Text>
      <TextInput
        value={pickup}
        onChangeText={setPickup}
        placeholder="Ex : 12 rue de la Liberté, Paris"
        placeholderTextColor="#454B57"
        className="bg-card2 border border-border rounded-2xl px-3 py-2.5 text-text mb-4"
      />

      <Button
        label={
          create.isPending
            ? 'Création…'
            : count > 1
              ? `Publier ${count} créneaux`
              : count === 1
                ? 'Publier ce créneau'
                : 'Sélectionne une heure'
        }
        variant="instructor"
        onPress={submit}
        loading={create.isPending}
        disabled={count === 0}
      />
    </BottomSheet>
  );
}
