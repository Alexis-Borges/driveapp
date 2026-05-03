import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export function useConversation(otherId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  const queryKey = ['messages', profile?.id, otherId];

  const query = useQuery({
    queryKey,
    enabled: !!profile && !!otherId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${profile!.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${profile!.id})`
        )
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    if (!profile || !otherId) return;
    const channel = supabase
      .channel(`messages:${profile.id}:${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message;
          const involves =
            (m.sender_id === profile.id && m.recipient_id === otherId) ||
            (m.sender_id === otherId && m.recipient_id === profile.id);
          if (involves) {
            qc.setQueryData<Message[]>(queryKey, (old) => [...(old ?? []), m]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, otherId, qc, queryKey]);

  return query;
}

export function useSendMessage() {
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (params: { to: string; content: string }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: params.to,
        content: params.content,
      } as never);
      if (error) throw error;
    },
  });
}

export function useThreadList() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['threads', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, content, created_at, read_at')
        .or(`sender_id.eq.${profile!.id},recipient_id.eq.${profile!.id}`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const byOther = new Map<
        string,
        { other_id: string; last: Message; unread: number }
      >();
      for (const m of (messages ?? []) as Message[]) {
        const other = m.sender_id === profile!.id ? m.recipient_id : m.sender_id;
        if (!byOther.has(other)) {
          byOther.set(other, { other_id: other, last: m, unread: 0 });
        }
        const entry = byOther.get(other)!;
        if (m.recipient_id === profile!.id && !m.read_at) entry.unread++;
      }

      const ids = Array.from(byOther.keys());
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids);

      const profMap = new Map(
        (profiles ?? []).map((p: { id: string; first_name: string; last_name: string }) => [
          p.id,
          p,
        ])
      );

      return Array.from(byOther.values()).map((t) => ({
        ...t,
        profile: profMap.get(t.other_id) ?? null,
      }));
    },
  });
}

export function useMarkRead(otherId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!profile || !otherId) return;
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('sender_id', otherId)
        .eq('recipient_id', profile.id)
        .is('read_at', null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['threads'] }),
  });
}
