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

export function useLinkedInstructorInfo(instructorId: string | null) {
  return useQuery({
    queryKey: ['linked-instructor-info', instructorId],
    enabled: !!instructorId,
    queryFn: async () => {
      const [instrRes, profRes] = await Promise.all([
        supabase
          .from('instructors')
          .select('is_verified, hourly_rate')
          .eq('id', instructorId!)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', instructorId!)
          .maybeSingle(),
      ]);
      if (instrRes.error) throw instrRes.error;
      if (profRes.error) throw profRes.error;
      const instr = instrRes.data as { is_verified: boolean; hourly_rate: number } | null;
      const prof = profRes.data as { first_name: string; last_name: string } | null;
      return {
        is_verified: !!instr?.is_verified,
        hourly_rate: instr?.hourly_rate ?? 30,
        first_name: prof?.first_name ?? '',
        last_name: prof?.last_name ?? '',
        full_name: prof ? `${prof.first_name} ${prof.last_name[0] ?? ''}.` : 'Moniteur',
      };
    },
  });
}
