import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useReferralStats() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['referral-stats', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('id, reward_type, reward_claimed')
        .eq('referrer_id', profile!.id);
      if (error) throw error;
      const rows = (data ?? []) as { id: string; reward_type: string | null; reward_claimed: boolean }[];
      const free = rows.filter((r) => r.reward_type === 'free_lesson').length;
      const discount = rows.filter((r) => r.reward_type === 'discount_50').length;
      return {
        count: rows.length,
        free_lessons: free,
        discount_eur: discount * 50,
      };
    },
  });
}

export function useInstructorReferralCount() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['instructor-referrals', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, referred_by')
        .eq('instructor_id', profile!.id)
        .not('referred_by', 'is', null);
      return (data ?? []).length;
    },
  });
}
