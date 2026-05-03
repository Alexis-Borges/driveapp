import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type StudentSummary = {
  id: string;
  first_name: string;
  last_name: string;
  package_total_hours: number;
  hours_paid: number;
  hours_booked: number;
  balance_hours: number;
};

export function useInstructorStudents() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['instructor-students', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async (): Promise<StudentSummary[]> => {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, package_total_hours, profiles(first_name, last_name)')
        .eq('instructor_id', profile!.id);
      if (error) throw error;

      const ids = (students ?? []).map((s: { id: string }) => s.id);
      if (ids.length === 0) return [];

      const { data: balances } = await supabase
        .from('student_balance')
        .select('student_id, hours_paid, hours_booked, balance_hours')
        .in('student_id', ids);

      const byId = new Map(
        (balances ?? []).map((b: {
          student_id: string;
          hours_paid: number;
          hours_booked: number;
          balance_hours: number;
        }) => [b.student_id, b])
      );

      return (students ?? [])
        .map((s) => {
          const row = s as unknown as {
            id: string;
            package_total_hours: number;
            profiles: { first_name: string; last_name: string } | null;
          };
          const b = byId.get(row.id);
          return {
            id: row.id,
            first_name: row.profiles?.first_name ?? '',
            last_name: row.profiles?.last_name ?? '',
            package_total_hours: row.package_total_hours,
            hours_paid: b?.hours_paid ?? 0,
            hours_booked: b?.hours_booked ?? 0,
            balance_hours: b?.balance_hours ?? 0,
          };
        })
        .sort((a, b) => a.balance_hours - b.balance_hours);
    },
  });
}
