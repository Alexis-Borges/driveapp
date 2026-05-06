import { useStripe } from '@stripe/stripe-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type Plan = 'one_shot' | 'three_x';

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-balance'] });
      qc.invalidateQueries({ queryKey: ['student-package'] });
    },
  });
}
