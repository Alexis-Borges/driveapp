import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { InvoiceRow } from '../types/database';

export function useStudentInvoices() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['invoices', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', profile!.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });
}

export async function getInvoiceUrl(paymentId: string) {
  const { data, error } = await supabase.functions.invoke('invoice-pdf', {
    body: { payment_id: paymentId },
  });
  if (error) throw error;
  return data as { url?: string } | string;
}
