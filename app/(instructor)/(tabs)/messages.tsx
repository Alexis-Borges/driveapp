import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMarkUnread, useThreadList } from '../../../hooks/useMessages';
import { SkeletonList } from '../../../components/shared/Skeleton';
import { FadeInItem } from '../../../components/shared/Animated';
import { EmptyState } from '../../../components/shared/EmptyState';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { weekday: 'short' });
}

export default function InstructorMessages() {
  const router = useRouter();
  const { data: threads = [], isLoading } = useThreadList();
  const markUnread = useMarkUnread();

  function onLongPressThread(otherId: string, unread: number) {
    if (unread > 0) return;
    Alert.alert(
      'Marquer comme non lu ?',
      'Tu pourras revenir relire cette conversation plus tard.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Marquer non lu', onPress: () => markUnread.mutate(otherId) },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-5 pt-3 pb-2">
        <Text className="text-text text-xl font-bold">Messages</Text>
      </View>

      {isLoading ? (
        <View className="mt-2">
          <SkeletonList count={5} row />
        </View>
      ) : threads.length === 0 ? (
        <EmptyState
          icon="message"
          title="Aucune conversation"
          body="Tes échanges avec les élèves apparaîtront ici."
          variant="instructor"
        />
      ) : (
        threads.map((t, i) => {
          const initials = t.profile
            ? `${t.profile.first_name[0] ?? ''}${t.profile.last_name[0] ?? ''}`
            : '?';
          const name = t.profile ? `${t.profile.first_name} ${t.profile.last_name}` : 'Élève';
          return (
            <FadeInItem key={t.other_id} index={i}>
              <Pressable
                onPress={() => router.push(`/(instructor)/chat/${t.other_id}`)}
                onLongPress={() => onLongPressThread(t.other_id, t.unread)}
                delayLongPress={400}
                className="px-5 py-3 flex-row items-center gap-3 border-b border-border"
              >
                <View className="w-9 h-9 rounded-full bg-card2 items-center justify-center relative">
                  <Text className="text-text text-xs font-bold">{initials}</Text>
                  {t.unread > 0 ? (
                    <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-instructor border-2 border-bg" />
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="text-text text-sm font-bold">{name}</Text>
                  <Text className="text-muted2 text-[11px] mt-0.5" numberOfLines={1}>
                    {t.last.content}
                  </Text>
                </View>
                <Text className="text-muted2 text-[10px]">{formatTime(t.last.created_at)}</Text>
              </Pressable>
            </FadeInItem>
          );
        })
      )}
    </SafeAreaView>
  );
}
