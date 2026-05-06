import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type AdminInstructor = {
  id: string;
  agreement_number: string;
  is_verified: boolean;
  stripe_account_id: string | null;
  zone_geo: string | null;
  experience_years: number | null;
  created_at: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
};

export function useAdminInstructors(filter: 'all' | 'unverified' = 'unverified') {
  return useQuery({
    queryKey: ['admin-instructors', filter],
    queryFn: async (): Promise<AdminInstructor[]> => {
      let q = supabase
        .from('instructors')
        .select(
          'id, agreement_number, is_verified, stripe_account_id, zone_geo, experience_years, created_at, profiles!inner(first_name, last_name, email, phone)'
        )
        .order('created_at', { ascending: false });
      if (filter === 'unverified') q = q.eq('is_verified', false);
      const { data, error } = await q;
      if (error) throw error;
      type Row = Omit<AdminInstructor, 'profile'> & {
        profiles: AdminInstructor['profile'];
      };
      return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        agreement_number: r.agreement_number,
        is_verified: r.is_verified,
        stripe_account_id: r.stripe_account_id,
        zone_geo: r.zone_geo,
        experience_years: r.experience_years,
        created_at: r.created_at,
        profile: r.profiles,
      }));
    },
  });
}

export function useVerifyInstructor() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; verified: boolean }) => {
      if (!profile) throw new Error('Non connecté');
      const { error } = await supabase
        .from('instructors')
        .update({ is_verified: params.verified } as never)
        .eq('id', params.id);
      if (error) throw error;
      await supabase.from('audit_log').insert({
        actor_id: profile.id,
        action: params.verified ? 'instructor_verified' : 'instructor_unverified',
        target_type: 'instructor',
        target_id: params.id,
      } as never);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-instructors'] }),
  });
}
