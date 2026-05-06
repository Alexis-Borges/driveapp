import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/**
 * Subscribes to lessons changes for the current user (instructor or student)
 * and invalidates all dependent queries on each event.
 */
export function useRealtimeLessons() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  useEffect(() => {
    if (!profile) return;

    const filter =
      profile.role === 'instructor'
        ? `instructor_id=eq.${profile.id}`
        : `student_id=eq.${profile.id}`;

    const channel = supabase
      .channel(`lessons:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lessons', filter },
        () => {
          qc.invalidateQueries({ queryKey: ['lessons'] });
          qc.invalidateQueries({ queryKey: ['next-lesson'] });
          qc.invalidateQueries({ queryKey: ['eval'] });
          qc.invalidateQueries({ queryKey: ['last-feedback'] });
          qc.invalidateQueries({ queryKey: ['student-balance'] });
          qc.invalidateQueries({ queryKey: ['instructor-week-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, qc]);
}

/**
 * For students: also subscribe to their linked instructor's lessons so the
 * planning grid sees free slots created in realtime.
 */
export function useRealtimeInstructorSlots(instructorId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!instructorId) return;
    const channel = supabase
      .channel(`instructor-slots:${instructorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lessons',
          filter: `instructor_id=eq.${instructorId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['lessons'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [instructorId, qc]);
}
