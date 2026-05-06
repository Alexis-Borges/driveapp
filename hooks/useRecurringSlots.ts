import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { LessonType, RecurringSlotRow } from '../types/database';

export function useRecurringSlots() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['recurring-slots', profile?.id],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async (): Promise<RecurringSlotRow[]> => {
      const { data, error } = await supabase
        .from('recurring_slots')
        .select('*')
        .eq('instructor_id', profile!.id)
        .order('weekday')
        .order('hour');
      if (error) throw error;
      return (data ?? []) as RecurringSlotRow[];
    },
  });
}

export function useCreateRecurringSlot() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { weekday: number; hour: number; type?: LessonType }) => {
      if (!profile) throw new Error('Non connecté');
      const { error } = await supabase.from('recurring_slots').insert({
        instructor_id: profile.id,
        weekday: params.weekday,
        hour: params.hour,
        type: params.type ?? 'city',
        active: true,
      } as never);
      if (error) {
        if (error.code === '23505') throw new Error('Cette règle existe déjà.');
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-slots'] }),
  });
}

export function useToggleRecurringSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('recurring_slots')
        .update({ active: params.active } as never)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-slots'] }),
  });
}

export function useDeleteRecurringSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-slots'] }),
  });
}
