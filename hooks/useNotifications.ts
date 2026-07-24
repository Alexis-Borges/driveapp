import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { uniqueChannelName } from '../lib/realtime';
import { haptics } from '../lib/haptics';
import { useAuthStore } from '../stores/authStore';

export type Notification = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

// Historique complet. Les notifications sont écrites par l'edge function
// send-push, seul point de passage de tous les envois (triggers DB compris).
export function useNotifications() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['notifications', profile?.id],
    enabled: !!profile,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, data, read_at, created_at')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

// Compteur du badge. Requête séparée et légère : le badge est monté sur les
// écrans d'accueil, qui n'ont pas besoin de charger tout l'historique.
export function useUnreadNotificationCount() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications-unread', profile?.id],
    enabled: !!profile,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Sans realtime, le badge n'apparaîtrait qu'au prochain montage d'écran.
  const profileId = profile?.id ?? null;
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(uniqueChannelName(`notifications:${profileId}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['notifications'] });
          qc.invalidateQueries({ queryKey: ['notifications-unread'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, qc]);

  return query;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('id', id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useDeleteNotification() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    // Retrait optimiste : la ligne disparaît sous le doigt. Sans ça elle
    // reviendrait à sa place le temps de l'aller-retour réseau.
    onMutate: async (id) => {
      const key = ['notifications', profile?.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Notification[]>(key);
      qc.setQueryData<Notification[]>(key, (old) => (old ?? []).filter((n) => n.id !== id));
      return { key, previous };
    },
    onError: (_e, _id, ctx) => {
      haptics.error();
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read' as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
    onError: () => haptics.error(),
  });
}
