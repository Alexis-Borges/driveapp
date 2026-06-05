import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChatBubble } from '../../../components/shared/ChatBubble';
import { ChatInput } from '../../../components/shared/ChatInput';
import { useConversation, useSendMessage, useMarkRead } from '../../../hooks/useMessages';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

export default function InstructorChat() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: messages = [] } = useConversation(studentId ?? null);
  const send = useSendMessage(studentId ?? null);
  const markRead = useMarkRead(studentId ?? null);
  const scrollRef = useRef<ScrollView>(null);

  const { data: other } = useQuery({
    queryKey: ['profile', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', studentId!)
        .maybeSingle();
      return data as { first_name: string; last_name: string } | null;
    },
  });

  useEffect(() => {
    markRead.mutate();
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const initials = other ? `${other.first_name[0] ?? ''}${other.last_name[0] ?? ''}` : '?';
  const name = other ? `${other.first_name} ${other.last_name}` : '...';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
          >
            <Text className="text-muted text-sm">‹</Text>
          </Pressable>
          <View className="w-8 h-8 rounded-full bg-card2 items-center justify-center">
            <Text className="text-text text-[10px] font-bold">{initials}</Text>
          </View>
          <View>
            <Text className="text-text text-sm font-bold">{name}</Text>
            <Text className="text-student text-[10px]">En ligne</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 13, gap: 8 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              content={m.content}
              mine={m.sender_id === profile?.id}
              variant="instructor"
            />
          ))}
        </ScrollView>

        <ChatInput
          variant="instructor"
          onSend={(text) => send.mutateAsync({ to: studentId!, content: text })}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
