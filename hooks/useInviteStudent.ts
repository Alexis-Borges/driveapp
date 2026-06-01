import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { track } from '../lib/observability';

/**
 * Génère un deep link d'invitation et ouvre la feuille de partage système
 * (sans email préalable). L'élève cliquant sur le lien est redirigé sur
 * /(auth)/signup?invitedBy={instructorId}&role=student.
 */
export function useShareInviteLink() {
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Non connecté');
      const inviteUrl = Linking.createURL('/(auth)/signup', {
        queryParams: { invitedBy: profile.id, role: 'student' },
      });
      await Share.share({
        message: `Salut ! Inscris-toi sur DriveApp pour suivre tes leçons avec moi : ${inviteUrl}`,
      });
      track('invite_shared', { method: 'link' });
      return inviteUrl;
    },
  });
}

export function useInviteStudentByEmail() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (studentEmail: string) => {
      if (!profile) throw new Error('Not authenticated');
      const email = studentEmail.toLowerCase().trim();

      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        const row = existing as { id: string; role: string };
        if (row.role !== 'student') {
          throw new Error('Cet utilisateur n\'est pas un élève.');
        }
        const { error } = await supabase
          .from('students')
          .update({ instructor_id: profile.id } as never)
          .eq('id', row.id);
        if (error) throw error;
        return { kind: 'linked' as const, email };
      }

      // pas inscrit : on partage un deep link d'invitation
      const inviteUrl = Linking.createURL('/(auth)/signup', {
        queryParams: { invitedBy: profile.id, role: 'student' },
      });
      await Share.share({
        message: `Salut ! Inscris-toi sur DriveApp pour suivre tes leçons avec moi : ${inviteUrl}`,
      });
      return { kind: 'shared' as const, email };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-students'] }),
  });
}
