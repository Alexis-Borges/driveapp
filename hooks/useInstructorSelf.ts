import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type InstructorSelf = {
  id: string;
  agreement_number: string;
  invite_code: string | null;
  hourly_rate: number;
  zone_geo: string | null;
  experience_years: number | null;
  stripe_account_id: string | null;
  is_verified: boolean;
};

export function useInstructorSelf() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['instructor-self', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async (): Promise<InstructorSelf | null> => {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, agreement_number, invite_code, hourly_rate, zone_geo, experience_years, stripe_account_id, is_verified')
        .eq('id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data as InstructorSelf | null;
    },
  });
}

export function useUpdateInstructorSelf() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      hourly_rate?: number;
      zone_geo?: string | null;
      experience_years?: number | null;
    }) => {
      if (!profile) throw new Error('Non connecté');
      const update: Record<string, unknown> = {};
      if (params.hourly_rate !== undefined) update.hourly_rate = params.hourly_rate;
      if (params.zone_geo !== undefined) update.zone_geo = params.zone_geo;
      if (params.experience_years !== undefined) update.experience_years = params.experience_years;
      const { error } = await supabase
        .from('instructors')
        .update(update as never)
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-self'] });
      qc.invalidateQueries({ queryKey: ['linked-instructor-info'] });
    },
  });
}
