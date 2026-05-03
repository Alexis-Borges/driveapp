import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type Balance = {
  hours_paid: number;
  hours_booked: number;
  balance_hours: number;
};

export function useStudentBalance() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['student-balance', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async (): Promise<Balance> => {
      const { data, error } = await supabase
        .from('student_balance')
        .select('hours_paid, hours_booked, balance_hours')
        .eq('student_id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return (
        (data as Balance | null) ?? { hours_paid: 0, hours_booked: 0, balance_hours: 0 }
      );
    },
  });
}

export function useStudentPackage() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['student-package', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('package_total_hours, package_started_at, instructor_id, referral_code')
        .eq('id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        package_total_hours: number;
        package_started_at: string | null;
        instructor_id: string | null;
        referral_code: string;
      } | null;
    },
  });
}
