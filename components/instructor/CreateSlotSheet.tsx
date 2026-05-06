import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { useCreateSlot, type LessonType } from '../../hooks/useLessons';

type Props = {
  visible: boolean;
  onClose: () => void;
  date: Date;
  takenHours: Set<number>;
};

const HOURS = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21];

const TYPES: { value: LessonType; label: string; emoji: string }[] = [
  { value: 'city', label: 'Ville', emoji: '🏙' },
  { value: 'highway', label: 'Autoroute', emoji: '🛣' },
  { value: 'parking', label: 'Parking', emoji: '🅿️' },
  { value: 'evaluation', label: 'Évaluation', emoji: '📋' },
  { value: 'mock_exam', label: 'Examen blanc', emoji: '🎓' },
  { value: 'other', label: 'Autre', emoji: '⋯' },
];

export function CreateSlotSheet({ visible, onClose, date, takenHours }: Props) {
  const create = useCreateSlot();
  const [hour, setHour] = useState<number | null>(null);
  const [type, setType] = useState<LessonType>('city');
  const [pickup, setPickup] = useState('');

  const available = useMemo(() => HOURS.filter((h) => !takenHours.has(h)), [takenHours]);

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
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

      <Text className="text-muted2 text-[10px] uppercase tracking-wider mb-1.5 mt-2">Type</Text>
      <View className="flex-row flex-wrap gap-1.5 mb-4">
        {TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setType(t.value)}
            className={`px-3 py-2 rounded-xl border ${
              type === t.value ? 'bg-instructor/20 border-instructor' : 'bg-card border-border'
            }`}
          >
            <Text className={type === t.value ? 'text-instructor font-bold text-xs' : 'text-text text-xs'}>
              {t.emoji} {t.label}
            </Text>
          </Pressable>
        ))}
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
