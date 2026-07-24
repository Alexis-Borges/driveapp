import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatBubble } from '../../../components/shared/ChatBubble';
import { ChatInput } from '../../../components/shared/ChatInput';
import { AlertCard } from '../../../components/instructor/AlertCard';
import { useConversation, useSendMessage, useMarkRead } from '../../../hooks/useMessages';
import { useStudentPackage } from '../../../hooks/useBalance';
import { useAuthStore } from '../../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export default function StudentMessages() {
  const profile = useAuthStore((s) => s.profile);
  const { data: pkg } = useStudentPackage();
  const instructorId = pkg?.instructor_id ?? null;
  const { data: messages = [] } = useConversation(instructorId);
  const send = useSendMessage(instructorId);
  const markRead = useMarkRead(instructorId);
  const scrollRef = useRef<ScrollView>(null);

  const { data: instructor } = useQuery({
    queryKey: ['profile', instructorId],
    enabled: !!instructorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', instructorId!)
        .maybeSingle();
      return data as { first_name: string; last_name: string } | null;
    },
  });

  useEffect(() => {
    if (instructorId) markRead.mutate();
  }, [instructorId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (!instructorId) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="px-5 pt-3 pb-2">
          <Text className="text-text text-xl font-bold">Messages</Text>
        </View>
        <AlertCard
          tone="instructor"
          title="Aucun moniteur lié"
          body="Rejoins ton enseignant·e depuis ton profil pour démarrer une conversation."
        />
      </SafeAreaView>
    );
  }

  const initials = instructor
    ? `${instructor.first_name[0] ?? ''}${instructor.last_name[0] ?? ''}`
    : 'FZ';
  const name = instructor
    ? `${instructor.first_name} ${instructor.last_name[0] ?? ''}.`
    : 'Moniteur';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
          <View className="w-8 h-8 rounded-full bg-instructor/15 items-center justify-center">
            <Text className="text-instructor text-[10px] font-bold">{initials}</Text>
          </View>
          <View>
            <Text className="text-text text-sm font-bold">{name} — Moniteur</Text>
            <Text className="text-student text-[10px]">En ligne</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 13, gap: 8 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text className="text-muted2 text-xs text-center mt-4">
              Pose ta première question à ton enseignant·e 👋
            </Text>
          ) : (
            messages.map((m) => (
              <ChatBubble
                key={m.id}
                content={m.content}
                mine={m.sender_id === profile?.id}
                variant="student"
              />
            ))
          )}
        </ScrollView>

        <ChatInput
          variant="student"
          onSend={(text) => send.mutateAsync({ to: instructorId, content: text })}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
