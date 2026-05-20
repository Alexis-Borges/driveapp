import { useMemo, useState } from 'react';
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
};

const TYPES: { value: LessonType; label: string; icon: IconName }[] = [
  { value: 'city', label: 'Ville', icon: 'pin' },
  { value: 'highway', label: 'Autoroute', icon: 'car' },
  { value: 'parking', label: 'Parking', icon: 'home' },
  { value: 'evaluation', label: 'Évaluation', icon: 'clipboard' },
  { value: 'mock_exam', label: 'Examen blanc', icon: 'graduation' },
  { value: 'other', label: 'Autre', icon: 'more' },
];

export function CreateSlotSheet({ visible, onClose, date, takenHours }: Props) {
  const create = useCreateSlot();
  const [hour, setHour] = useState<number | null>(null);
  const [type, setType] = useState<LessonType>('city');
  const [pickup, setPickup] = useState('');

  const available = useMemo(
    () => BOOKABLE_HOURS.filter((h) => !takenHours.has(h)),
    [takenHours]
  );

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
            className={`px-3 py-2 rounded-xl border flex-row items-center gap-1.5 ${
              type === t.value ? 'bg-instructor/20 border-instructor' : 'bg-card border-border'
            }`}
          >
            <Icon
              name={t.icon}
              size={13}
              color={type === t.value ? '#7C75FF' : '#EEEEF0'}
            />
            <Text className={type === t.value ? 'text-instructor font-bold text-xs' : 'text-text text-xs'}>
              {t.label}
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
