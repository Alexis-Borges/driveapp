import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { CompetenceRow, CompetenceStatus, StudentCompetenceRow } from '../types/database';

export function useCompetencesCatalog() {
  return useQuery({
    queryKey: ['competences-catalog'],
    queryFn: async (): Promise<CompetenceRow[]> => {
      const { data, error } = await supabase
        .from('competences')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as CompetenceRow[];
    },
    staleTime: 1000 * 60 * 60, // 1h
  });
}

export function useStudentCompetences(studentId?: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const id = studentId ?? profile?.id ?? null;
  return useQuery({
    queryKey: ['student-competences', id],
    enabled: !!id,
    queryFn: async (): Promise<StudentCompetenceRow[]> => {
      const { data, error } = await supabase
        .from('student_competences')
        .select('*')
        .eq('student_id', id!);
      if (error) throw error;
      return (data ?? []) as StudentCompetenceRow[];
    },
  });
}

export function useUpdateCompetence() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      student_id: string;
      competence_id: string;
      status: CompetenceStatus;
    }) => {
      if (!profile) throw new Error('Non connecté');
      const { error } = await supabase
        .from('student_competences')
        .upsert(
          {
            student_id: params.student_id,
            competence_id: params.competence_id,
            status: params.status,
            updated_at: new Date().toISOString(),
            updated_by: profile.id,
          } as never,
          { onConflict: 'student_id,competence_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-competences'] }),
  });
}
