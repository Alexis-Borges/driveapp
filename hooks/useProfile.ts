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
        .select('id, role, first_name, last_name, email, avatar_url, phone, bio')
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
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (instructorEmail: string) => {
      const { data, error } = await supabase.rpc('link_to_instructor' as never, {
        p_instructor_email: instructorEmail,
      } as never);
      if (error) throw new Error(error.message);
      return data as { instructor_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-package'] });
      qc.invalidateQueries({ queryKey: ['student-balance'] });
      qc.invalidateQueries({ queryKey: ['student-instructor-stripe'] });
      qc.invalidateQueries({ queryKey: ['linked-instructor-info'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}
