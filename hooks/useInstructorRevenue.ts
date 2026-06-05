import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type RevenuePayment = {
  id: string;
  amount_cents: number;
  hours_purchased: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  plan: string;
  student_name: string;
};

const COMMISSION_BPS = 1500; // 15 % plateforme

export function useInstructorRevenue() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['instructor-revenue', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async () => {
      // Élèves du moniteur
      const { data: students, error: e1 } = await supabase
        .from('students')
        .select('id, profiles(first_name, last_name)')
        .eq('instructor_id', profile!.id);
      if (e1) throw e1;

      const ids = (students ?? []).map((s: { id: string }) => s.id);
      const nameById = new Map<string, string>();
      for (const s of students ?? []) {
        const row = s as unknown as {
          id: string;
          profiles: { first_name: string; last_name: string } | null;
        };
        nameById.set(
          row.id,
          row.profiles ? `${row.profiles.first_name} ${row.profiles.last_name[0] ?? ''}.` : 'Élève'
        );
      }

      if (ids.length === 0) {
        return { payments: [] as RevenuePayment[], grossCents: 0, netCents: 0, count: 0 };
      }

      const { data: payments, error: e2 } = await supabase
        .from('payments')
        .select('id, student_id, amount_cents, hours_purchased, status, paid_at, created_at, plan')
        .in('student_id', ids)
        .order('created_at', { ascending: false })
        .limit(100);
      if (e2) throw e2;

      const list: RevenuePayment[] = (payments ?? []).map((p) => {
        const row = p as {
          id: string;
          student_id: string;
          amount_cents: number;
          hours_purchased: number;
          status: string;
          paid_at: string | null;
          created_at: string;
          plan: string;
        };
        return {
          id: row.id,
          amount_cents: row.amount_cents,
          hours_purchased: row.hours_purchased,
          status: row.status,
          paid_at: row.paid_at,
          created_at: row.created_at,
          plan: row.plan,
          student_name: nameById.get(row.student_id) ?? 'Élève',
        };
      });

      const succeeded = list.filter((p) => p.status === 'succeeded');
      const grossCents = succeeded.reduce((s, p) => s + p.amount_cents, 0);
      const netCents = Math.round(grossCents * (1 - COMMISSION_BPS / 10_000));

      return { payments: list, grossCents, netCents, count: succeeded.length };
    },
  });
}
