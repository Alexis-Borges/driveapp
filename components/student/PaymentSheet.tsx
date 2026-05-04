import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';

type Plan = 'one_shot' | 'three_x';

type Props = {
  visible: boolean;
  onClose: () => void;
  packLabel: string;
  hours: number;
  amountEur: number;
  instructorVerified?: boolean;
};

export function PaymentSheet({
  visible,
  onClose,
  packLabel,
  hours,
  amountEur,
  instructorVerified = true,
}: Props) {
  const [plan, setPlan] = useState<Plan>('one_shot');
  const checkout = useStripeCheckout();

  async function pay() {
    try {
      await checkout.mutateAsync({ hours, plan, label: packLabel });
      Alert.alert('Paiement validé', `${hours}h ajoutées à ton compte.`);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      if (msg !== 'cancelled') Alert.alert('Paiement', msg);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-base font-bold mb-1">Choisir le paiement</Text>
      <Text className="text-muted text-xs mb-4">{packLabel}</Text>

      <Pressable
        onPress={() => setPlan('one_shot')}
        className={`bg-card2 border rounded-2xl px-3 py-3 mb-2 flex-row justify-between items-center ${
          plan === 'one_shot' ? 'border-student' : 'border-border'
        }`}
      >
        <View>
          <Text className="text-text text-sm font-medium">1× — Paiement immédiat</Text>
          <Text className="text-muted2 text-[10px] mt-0.5">Règlement en une fois</Text>
        </View>
        <Text className="text-student text-base font-bold">{amountEur}€</Text>
      </Pressable>

      <Pressable
        onPress={() => setPlan('three_x')}
        className={`bg-card2 border rounded-2xl px-3 py-3 mb-3 flex-row justify-between items-center ${
          plan === 'three_x' ? 'border-student' : 'border-border'
        }`}
      >
        <View>
          <Text className="text-text text-sm font-medium">3× sans frais</Text>
          <Text className="text-muted2 text-[10px] mt-0.5">
            {Math.round(amountEur / 3)}€/mois · 3 mois
          </Text>
        </View>
        <Text className="text-student text-base font-bold">{Math.round(amountEur / 3)}€</Text>
      </Pressable>

      {!instructorVerified ? (
        <View className="bg-warning/10 border border-warning/25 rounded-2xl px-3 py-2.5 mb-3">
          <Text className="text-warning text-xs font-bold">Paiement indisponible</Text>
          <Text className="text-muted text-[11px] mt-0.5 leading-4">
            Ton moniteur n'a pas encore activé Stripe. Demande-lui de finaliser
            son onboarding pour pouvoir payer en ligne.
          </Text>
        </View>
      ) : null}

      <Button
        label="💳 Procéder au paiement"
        variant="student"
        onPress={pay}
        loading={checkout.isPending}
        disabled={!instructorVerified}
      />
    </BottomSheet>
  );
}
