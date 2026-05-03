import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type ProfilePatch = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
};

export function useUpdateProfile() {
  const setProfile = useAuthStore((s) => s.setProfile);
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      if (!profile) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update(patch as never)
        .eq('id', profile.id)
        .select('id, role, first_name, last_name, email, avatar_url')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) setProfile(data as never);
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useLinkInstructorByCode() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (instructorEmail: string) => {
      if (!profile) throw new Error('Not authenticated');
      const { data: instr, error: e1 } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', instructorEmail.toLowerCase().trim())
        .eq('role', 'instructor')
        .maybeSingle();
      if (e1) throw e1;
      if (!instr) throw new Error('Aucun moniteur trouvé avec cet email');

      const { error: e2 } = await supabase
        .from('students')
        .update({ instructor_id: (instr as { id: string }).id } as never)
        .eq('id', profile.id);
      if (e2) throw e2;
      return instr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-link'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}
