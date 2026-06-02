import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { useBookSlot, type Lesson } from '../../hooks/useLessons';
import { typeLabel } from '../../lib/lessons';

type Props = {
  visible: boolean;
  onClose: () => void;
  slot: Lesson | null;
  balanceHours: number;
};

// Récap avant réservation : date, heure, type, impact sur le solde.
// Remplace le tap → Alert direct par une confirmation explicite, avec
// redirection Boutique si le solde est insuffisant.
export function BookSlotSheet({ visible, onClose, slot, balanceHours }: Props) {
  const router = useRouter();
  const book = useBookSlot();

  if (!slot) return null;

  const date = new Date(slot.scheduled_at);
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const hourLabel = `${String(date.getHours()).padStart(2, '0')}h00`;
  const balanceAfter = balanceHours - 1;
  const hasBudget = balanceHours > 0;

  async function confirm() {
    if (!slot) return;
    try {
      await book.mutateAsync(slot.id);
      onClose();
    } catch (e: unknown) {
      Alert.alert('Réservation impossible', e instanceof Error ? e.message : 'Erreur');
    }
  }

  function goToShop() {
    onClose();
    router.push('/(student)/(tabs)/shop');
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Réserver cette séance</Text>
      <Text className="text-muted text-xs mb-4">
        Ton moniteur la confirmera dans la foulée.
      </Text>

      <View className="bg-card2 rounded-2xl px-4 py-3 mb-3 gap-1.5">
        <Row label="Quand" value={`${dateLabel} · ${hourLabel}`} />
        <Row label="Type" value={typeLabel(slot.type)} />
        <Row label="Durée" value="1 heure" />
      </View>

      <View
        className={`rounded-2xl px-4 py-3 mb-4 ${
          hasBudget ? 'bg-student/10 border border-student/30' : 'bg-danger/10 border border-danger/30'
        }`}
      >
        <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-1">Ton forfait</Text>
        {hasBudget ? (
          <Text className="text-text text-sm">
            <Text className="font-bold">{balanceHours}h</Text> dispo → <Text className="font-bold">{balanceAfter}h</Text> après cette réservation
          </Text>
        ) : (
          <Text className="text-text text-sm">
            <Text className="font-bold">0h dispo.</Text> Achète un pack d'heures pour pouvoir réserver.
          </Text>
        )}
      </View>

      {hasBudget ? (
        <Button
          label="Confirmer la réservation"
          variant="student"
          onPress={confirm}
          loading={book.isPending}
        />
      ) : (
        <Button label="Acheter un pack" variant="student" onPress={goToShop} />
      )}
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-muted2 text-[10px] uppercase tracking-wider">{label}</Text>
      <Text className="text-text text-sm font-medium">{value}</Text>
    </View>
  );
}
