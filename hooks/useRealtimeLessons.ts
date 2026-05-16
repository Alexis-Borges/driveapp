import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/**
 * Subscribes to lessons changes for the current user (instructor or student)
 * and invalidates all dependent queries on each event.
 *
 * Each call creates a fresh channel (timestamp suffix) so React StrictMode
 * double-mount doesn't trip "cannot add callbacks after subscribe()".
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

    const channelName = `lessons:${profile.id}:${Date.now()}`;
    const channel = supabase.channel(channelName);
    channel.on(
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
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, qc]);
}

/**
 * For students: also subscribe to their linked instructor's lessons so the
 * planning grid sees free slots created in realtime.
 */
export function useRealtimeInstructorSlots(instructorId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!instructorId) return;
    const channelName = `instructor-slots:${instructorId}:${Date.now()}`;
    const channel = supabase.channel(channelName);
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lessons',
        filter: `instructor_id=eq.${instructorId}`,
      },
      () => qc.invalidateQueries({ queryKey: ['lessons'] })
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [instructorId, qc]);
}
