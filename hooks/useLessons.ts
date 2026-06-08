import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { track } from '../lib/observability';
import { haptics } from '../lib/haptics';

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
  student_comment: string | null;
  cancelled_reason: string | null;
  pickup_address: string | null;
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
    mutationFn: async (params: {
      scheduled_at: string;
      type?: LessonType;
      pickup_address?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('lessons').insert({
        instructor_id: profile.id,
        student_id: null,
        scheduled_at: params.scheduled_at,
        duration_minutes: 60,
        type: params.type ?? 'city',
        status: 'pending',
        pickup_address: params.pickup_address ?? null,
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

// Création multi-créneaux : insère en une seule requête N créneaux libres,
// tous au même type / lieu / durée. Évite le "1 sheet par heure" qui demandait
// 5 ouvertures de modale pour ouvrir une matinée. Si l'un des créneaux est
// déjà pris (23505), on remonte la liste des heures rejetées sans rien
// insérer (Postgres rollback la requête entière sur conflit).
export function useCreateSlotsBatch() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      hours: number[];
      date: Date;
      type: LessonType;
      pickup_address?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      if (params.hours.length === 0) throw new Error('Aucune heure sélectionnée');
      const rows = params.hours.map((h) => {
        const d = new Date(params.date);
        d.setHours(h, 0, 0, 0);
        return {
          instructor_id: profile.id,
          student_id: null,
          scheduled_at: d.toISOString(),
          duration_minutes: 60,
          type: params.type,
          status: 'pending' as const,
          pickup_address: params.pickup_address ?? null,
        };
      });
      const { error } = await supabase.from('lessons').insert(rows as never);
      if (error) {
        if (error.code === '23505') {
          throw new Error('Au moins un de ces créneaux existe déjà.');
        }
        throw error;
      }
      return params.hours.length;
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
    // Optimistic : on patch immédiatement le créneau dans le cache pour que
    // l'UI bouge sans attendre Supabase. Rollback automatique en onError.
    onMutate: async (lessonId) => {
      if (!profile) return { previous: [] as [readonly unknown[], unknown][] };
      await qc.cancelQueries({ queryKey: ['lessons'] });
      const previous = qc.getQueriesData({ queryKey: ['lessons'] });
      qc.setQueriesData({ queryKey: ['lessons'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as Array<{ id: string; student_id: string | null; status: string }>).map((l) =>
          l.id === lessonId && l.student_id == null
            ? { ...l, student_id: profile.id, status: 'pending' }
            : l
        );
      });
      haptics.success();
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      haptics.error();
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) qc.setQueryData(key, data);
      }
    },
    onSuccess: () => {
      track('lesson_booked');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useUpdateLessonStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: LessonStatus; cancelled_reason?: string }) => {
      const update: Record<string, unknown> = { status: params.status };
      if (params.cancelled_reason !== undefined) {
        update.cancelled_reason = params.cancelled_reason;
      }
      const { error } = await supabase
        .from('lessons')
        .update(update as never)
        .eq('id', params.id);
      if (error) throw error;
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: ['lessons'] });
      const previous = qc.getQueriesData({ queryKey: ['lessons'] });
      qc.setQueriesData({ queryKey: ['lessons'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as Array<{ id: string; status: string; cancelled_reason?: string | null }>).map(
          (l) =>
            l.id === params.id
              ? {
                  ...l,
                  status: params.status,
                  ...(params.cancelled_reason !== undefined
                    ? { cancelled_reason: params.cancelled_reason }
                    : {}),
                }
              : l
        );
      });
      // confirmation = succès, annulation = warning
      if (params.status === 'confirmed' || params.status === 'completed') haptics.success();
      else if (params.status === 'cancelled' || params.status === 'auto_cancelled') haptics.warning();
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      haptics.error();
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) qc.setQueryData(key, data);
      }
    },
    onSuccess: (_data, params) => {
      track('lesson_status_changed', { status: params.status });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
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

// Prochain créneau libre du moniteur lié, dans le futur, jamais dans une
// fenêtre <2h (laisse au moniteur le temps de réagir si l'élève réserve juste
// avant). Sert au "réserver maintenant" depuis l'accueil élève.
export function useNextFreeSlotForStudent(instructorId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['next-free-slot', profile?.id, instructorId],
    enabled: !!profile && profile.role === 'student' && !!instructorId,
    queryFn: async () => {
      const cutoff = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('lessons')
        .select('id, instructor_id, student_id, scheduled_at, type, status, duration_minutes, feedback, rating, student_comment, cancelled_reason, pickup_address')
        .eq('instructor_id', instructorId!)
        .is('student_id', null)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', cutoff)
        .order('scheduled_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Lesson | null;
    },
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
        .select(
          'id, instructor_id, student_id, scheduled_at, duration_minutes, type, status, feedback, rating, student_comment, cancelled_reason, pickup_address'
        )
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
        .select('id, scheduled_at, feedback, rating, instructor_id, student_comment')
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
        student_comment: string | null;
      } | null;
    },
  });
}

export function useUpdateStudentComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; comment: string }) => {
      const { error } = await supabase
        .from('lessons')
        .update({ student_comment: params.comment.trim() || null } as never)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['last-feedback'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}
