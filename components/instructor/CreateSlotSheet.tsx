import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { useCreateSlot, type LessonType } from '../../hooks/useLessons';
import { BOOKABLE_HOURS } from '../../lib/planning';
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

export function CreateSlotSheet({ visible, onClose, date, takenHours, initialHour }: Props) {
  const create = useCreateSlot();
  const [hour, setHour] = useState<number | null>(null);
  const [type, setType] = useState<LessonType>('city');
  const [pickup, setPickup] = useState('');

  const available = useMemo(
    () => BOOKABLE_HOURS.filter((h) => !takenHours.has(h) || h === initialHour),
    [takenHours, initialHour]
  );

  // Pré-sélectionne l'heure tapée dans la grille à l'ouverture.
  useEffect(() => {
    if (visible) setHour(initialHour ?? null);
  }, [visible, initialHour]);

  async function submit() {
    if (hour == null) {
      Alert.alert('Choisir une heure');
      return;
    }
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    try {
      await create.mutateAsync({
        scheduled_at: d.toISOString(),
        type,
        pickup_address: pickup.trim() || undefined,
      });
      setHour(null);
      setPickup('');
      setType('city');
      onClose();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-base font-bold mb-1">Nouveau créneau</Text>
      <Text className="text-muted text-xs mb-3">
        {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      <Text className="text-muted2 text-[10px] uppercase tracking-wider mb-1.5">Heure</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
      >
        {available.length === 0 ? (
          <Text className="text-muted2 text-xs">Toutes les heures sont prises.</Text>
        ) : (
          available.map((h) => (
            <Pressable
              key={h}
              onPress={() => setHour(h)}
              className={`px-3 py-2 rounded-xl border min-w-[56px] items-center ${
                hour === h ? 'bg-instructor border-instructor' : 'bg-card border-border'
              }`}
            >
              <Text className={hour === h ? 'text-white font-bold' : 'text-text font-medium'}>
                {String(h).padStart(2, '0')}h
              </Text>
            </Pressable>
          ))
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
        label={create.isPending ? 'Création…' : 'Créer le créneau'}
        variant="instructor"
        onPress={submit}
        loading={create.isPending}
      />
    </BottomSheet>
  );
}
