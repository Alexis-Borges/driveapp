import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useInstructorStripeStatus() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['instructor-stripe', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructors')
        .select('stripe_account_id, is_verified')
        .eq('id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { stripe_account_id: string | null; is_verified: boolean } | null;
    },
  });
}

export function useStripeConnectOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: {},
      });
      if (error) throw error;
      const { url } = data as { url: string };
      await WebBrowser.openAuthSessionAsync(url, 'driveapp://stripe/return');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-stripe'] }),
  });
}

export function useLinkedInstructorStripe(instructorId: string | null) {
  return useQuery({
    queryKey: ['linked-instructor-stripe', instructorId],
    enabled: !!instructorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructors')
        .select('is_verified')
        .eq('id', instructorId!)
        .maybeSingle();
      if (error) throw error;
      return data as { is_verified: boolean } | null;
    },
  });
}
