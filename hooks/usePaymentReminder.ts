import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/**
 * Envoie un rappel de paiement à un élève via le système de messages
 * (le trigger DB déclenche automatiquement la notification push).
 */
export function usePaymentReminder() {
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (params: { student_id: string; student_name: string; amount?: number }) => {
      if (!profile) throw new Error('Non connecté');
      const owedLine = params.amount
        ? `Solde à régulariser : ${params.amount} €.`
        : 'Solde à régulariser avant ta prochaine séance.';
      const content = `Bonjour ${params.student_name}, ${owedLine} Tu peux régler depuis l'onglet Boutique. Sans paiement 48 h avant, la séance est annulée automatiquement. Merci !`;
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: params.student_id,
        content,
      } as never);
      if (error) throw error;
    },
  });
}
