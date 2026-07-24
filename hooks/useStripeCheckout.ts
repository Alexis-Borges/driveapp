import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { track } from '../lib/observability';
import { haptics } from '../lib/haptics';
import { isExpoGo } from '../lib/isExpoGo';

type Plan = 'one_shot' | 'three_x';

// require() conditionnel : un `import` statique planterait Expo Go (module
// natif absent). En preview Expo Go, le paiement échoue proprement avec un
// message clair au lieu de faire crasher toute l'app au démarrage.
const useStripe: () => {
  initPaymentSheet: (opts: unknown) => Promise<{ error?: { message: string } }>;
  presentPaymentSheet: () => Promise<{ error?: { message: string; code?: string } }>;
} = isExpoGo
  ? () => ({
      initPaymentSheet: async () => ({
        error: { message: 'Paiement indisponible en preview Expo Go — nécessite un build natif.' },
      }),
      presentPaymentSheet: async () => ({
        error: { message: 'Paiement indisponible en preview Expo Go.' },
      }),
    })
  : require('@stripe/stripe-react-native').useStripe;

export function useStripeCheckout() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { hours: number; plan: Plan; label: string }) => {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { hours: params.hours, plan: params.plan },
      });
      if (error) throw error;
      const { clientSecret, ephemeralKey, customer } = data as {
        clientSecret: string;
        ephemeralKey: string;
        customer: string;
      };

      // Klarna Pay-in-3 nécessite "delayed payment methods"
      const isBnpl = params.plan === 'three_x';
      const init = await initPaymentSheet({
        merchantDisplayName: 'DriveApp',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: isBnpl,
      });
      if (init.error) throw new Error(init.error.message);

      const presented = await presentPaymentSheet();
      if (presented.error) {
        if (presented.error.code === 'Canceled') {
          throw new Error('cancelled');
        }
        throw new Error(presented.error.message);
      }
      return true;
    },
    onSuccess: (_data, params) => {
      haptics.success();
      track('pack_purchased', { hours: params.hours, plan: params.plan });
      qc.invalidateQueries({ queryKey: ['student-balance'] });
      qc.invalidateQueries({ queryKey: ['student-package'] });
    },
    onError: () => {
      haptics.error();
    },
  });
}
