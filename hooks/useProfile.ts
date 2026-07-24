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

// Tout ce qui dépend du moniteur rattaché devient obsolète après une liaison.
const LINK_INVALIDATED_KEYS = [
  ['student-package'],
  ['student-balance'],
  ['student-instructor-stripe'],
  ['linked-instructor-info'],
  ['lessons'],
];

// Liaison via le code d'invitation du moniteur (ex. FERYEL55). Chemin
// principal : dictable au téléphone, aucune donnée perso échangée.
export function useLinkInstructorByCode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('link_to_instructor_by_code' as never, {
        p_code: code.trim().toUpperCase(),
      } as never);
      if (error) throw new Error(error.message);
      return data as { instructor_id: string };
    },
    onSuccess: () => {
      for (const queryKey of LINK_INVALIDATED_KEYS) qc.invalidateQueries({ queryKey });
    },
  });
}

// Liaison via l'email du moniteur. Conservé en repli pour les élèves déjà
// invités par email avant l'introduction des codes.
export function useLinkInstructorByEmail() {
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
      for (const queryKey of LINK_INVALIDATED_KEYS) qc.invalidateQueries({ queryKey });
    },
  });
}
