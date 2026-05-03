import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type LessonStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'auto_cancelled';
export type LessonType = 'city' | 'highway' | 'parking' | 'evaluation' | 'mock_exam' | 'other';

export type Lesson = {
  id: string;
  instructor_id: string;
  student_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  type: LessonType;
  status: LessonStatus;
  feedback: string | null;
  rating: number | null;
};

function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useInstructorLessonsForDay(date: Date) {
  const profile = useAuthStore((s) => s.profile);
  const { start, end } = dayBounds(date);
  return useQuery({
    queryKey: ['lessons', 'instructor', profile?.id, start],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, students(id, profiles(first_name, last_name))')
        .eq('instructor_id', profile!.id)
        .gte('scheduled_at', start)
        .lt('scheduled_at', end)
        .order('scheduled_at');
      if (error) throw error;
      return (data ?? []) as never;
    },
  });
}

export function useStudentLessonsForDay(date: Date, instructorId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const { start, end } = dayBounds(date);
  return useQuery({
    queryKey: ['lessons', 'student', profile?.id, instructorId, start],
    enabled: !!profile && profile.role === 'student' && !!instructorId,
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('instructor_id', instructorId!)
        .gte('scheduled_at', start)
        .lt('scheduled_at', end)
        .order('scheduled_at');
      if (error) throw error;
      return (data ?? []) as never;
    },
  });
}

export function useCreateSlot() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { scheduled_at: string; type?: LessonType }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('lessons').insert({
        instructor_id: profile.id,
        student_id: null,
        scheduled_at: params.scheduled_at,
        duration_minutes: 60,
        type: params.type ?? 'city',
        status: 'pending',
      } as never);
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ce créneau existe déjà à cette heure.');
        }
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useBookSlot() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('lessons')
        .update({ student_id: profile.id, status: 'pending' } as never)
        .eq('id', lessonId)
        .is('student_id', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useUpdateLessonStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: LessonStatus }) => {
      const { error } = await supabase
        .from('lessons')
        .update({ status: params.status } as never)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useStudentCancelLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; scheduled_at: string }) => {
      const hoursBefore =
        (new Date(params.scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursBefore < 48) {
        throw new Error(
          'Annulation impossible : la séance est dans moins de 48h. Contacte ton moniteur.'
        );
      }
      const { error } = await supabase
        .from('lessons')
        .update({
          status: 'cancelled',
          cancelled_reason: 'Annulée par l\'élève',
        } as never)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useUpcomingLessonForStudent() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['next-lesson', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('lessons')
        .select('id, scheduled_at, type, status, instructor_id')
        .eq('student_id', profile!.id)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', nowIso)
        .order('scheduled_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTodayLessonsForInstructor() {
  return useInstructorLessonsForDay(new Date());
}

export function useInstructorWeekStats() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['instructor-week-stats', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async () => {
      const start = new Date();
      const day = start.getDay();
      const diff = (day + 6) % 7; // lundi = début
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const { data, error } = await supabase
        .from('lessons')
        .select('id, status', { count: 'exact', head: false })
        .eq('instructor_id', profile!.id)
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString())
        .in('status', ['pending', 'confirmed', 'completed']);
      if (error) throw error;
      return { count: (data ?? []).length };
    },
  });
}

export function useUpcomingEvaluation() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['eval', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons')
        .select('id, scheduled_at, status')
        .eq('student_id', profile!.id)
        .eq('type', 'evaluation')
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(1)
        .maybeSingle();
      return data as { id: string; scheduled_at: string; status: string } | null;
    },
  });
}

export function useLastFeedbackForStudent() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['last-feedback', profile?.id],
    enabled: !!profile && profile.role === 'student',
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons')
        .select('id, scheduled_at, feedback, rating, instructor_id')
        .eq('student_id', profile!.id)
        .eq('status', 'completed')
        .not('feedback', 'is', null)
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as {
        id: string;
        scheduled_at: string;
        feedback: string;
        rating: number | null;
        instructor_id: string;
      } | null;
    },
  });
}
