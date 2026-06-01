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

      const { data, error } = await supabase.rpc('link_student_by_email', {
        p_student_email: email,
      });
      if (error) throw new Error(error.message);

      const res = data as { found: boolean; student_id?: string };
      if (res.found) {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-students'] });
      qc.invalidateQueries({ queryKey: ['instructor-week-stats'] });
    },
  });
}
