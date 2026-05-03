import { Alert, Pressable, Text, View } from 'react-native';
import { useInstructorStripeStatus, useStripeConnectOnboarding } from '../../hooks/useStripeConnect';

export function StripeConnectCard() {
  const { data: status } = useInstructorStripeStatus();
  const onboarding = useStripeConnectOnboarding();

  const verified = !!status?.is_verified;
  const started = !!status?.stripe_account_id;

  async function start() {
    try {
      await onboarding.mutateAsync();
    } catch (e: unknown) {
      Alert.alert('Stripe', e instanceof Error ? e.message : 'Erreur');
    }
  }

  if (verified) {
    return (
      <View className="mx-5 mb-2 bg-student/10 border border-student/25 rounded-2xl px-3 py-3">
        <Text className="text-student text-xs font-bold">✓ Stripe connecté</Text>
        <Text className="text-muted text-[11px] mt-1">
          Tes paiements sont versés directement sur ton compte (commission 15 %).
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={start}
      className="mx-5 mb-2 bg-instructor/10 border border-instructor/25 rounded-2xl px-3 py-3"
    >
      <Text className="text-instructor text-xs font-bold">
        {started ? '⚠ Onboarding Stripe à finaliser' : '💳 Activer les paiements'}
      </Text>
      <Text className="text-muted text-[11px] mt-1">
        {started
          ? 'Reprends le formulaire pour pouvoir recevoir les paiements de tes élèves.'
          : 'Crée ton compte Stripe Connect pour recevoir les paiements.'}
      </Text>
      <Text className="text-instructor text-[11px] font-bold mt-2">
        {onboarding.isPending ? 'Ouverture…' : started ? 'Continuer →' : 'Commencer →'}
      </Text>
    </Pressable>
  );
}
