import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { InstructorLeaveRow } from '../types/database';

export function useInstructorLeaves(instructorId?: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const id = instructorId ?? profile?.id ?? null;
  return useQuery({
    queryKey: ['leaves', id],
    enabled: !!id,
    queryFn: async (): Promise<InstructorLeaveRow[]> => {
      const { data, error } = await supabase
        .from('instructor_leaves')
        .select('*')
        .eq('instructor_id', id!)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at');
      if (error) throw error;
      return (data ?? []) as InstructorLeaveRow[];
    },
  });
}

export function useCreateLeave() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { starts_at: string; ends_at: string; reason?: string }) => {
      if (!profile) throw new Error('Non connecté');
      const { error } = await supabase.from('instructor_leaves').insert({
        instructor_id: profile.id,
        starts_at: params.starts_at,
        ends_at: params.ends_at,
        reason: params.reason ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instructor_leaves').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
