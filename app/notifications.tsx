import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../components/shared/ScreenHeader';
import { SkeletonList } from '../components/shared/Skeleton';
import { FadeInItem } from '../components/shared/Animated';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { Icon } from '../components/ui/Icon';
import {
  useNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type Notification,
} from '../hooks/useNotifications';
import { useRefresh } from '../hooks/useRefresh';
import { useAuthStore } from '../stores/authStore';
import { haptics } from '../lib/haptics';

// Largeur du panneau de suppression révélé par le glissement. Assez large pour
// que l'icône et le libellé tiennent côte à côte sans être serrés. Sert aussi à
// dériver le seuil d'ouverture, qui doit rester en deçà pour être atteignable.
const ACTION_WIDTH = 124;

// « il y a 3 h » plutôt qu'une date absolue : sur un flux d'activité, la
// fraîcheur compte plus que l'horodatage exact.
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} jours`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const variant = profile?.role === 'student' ? 'student' : 'instructor';
  const { data: items = [], isLoading, isError, isFetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const { refreshing, onRefresh } = useRefresh(['notifications', 'notifications-unread']);

  const unread = items.filter((n) => !n.read_at).length;
  const accent = variant === 'student' ? '#00C896' : '#7C75FF';

  // Tap sur le bouton révélé et glissement complet partagent ce chemin, pour
  // qu'ils ne puissent pas diverger.
  function deleteNotification(n: Notification) {
    haptics.warning();
    remove.mutate(n.id);
  }

  function open(n: Notification) {
    haptics.tap();
    if (!n.read_at) markRead.mutate(n.id);
    // Le payload du push porte parfois la destination : on y va si elle
    // existe, sinon la notification est purement informative.
    const route = typeof n.data?.route === 'string' ? n.data.route : null;
    if (route) router.push(route as never);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Notifications" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
        }
      >
        {unread > 0 ? (
          <View className="px-5 pt-2 pb-1 flex-row justify-end">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tout marquer comme lu"
              disabled={markAll.isPending}
              onPress={() => markAll.mutate()}
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
            >
              <Text className="text-muted text-[11px] font-bold">
                {markAll.isPending ? 'Patiente…' : 'Tout marquer comme lu'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View className="mt-2">
            <SkeletonList count={5} row />
          </View>
        ) : isError && items.length === 0 ? (
          <ErrorState what="tes notifications" onRetry={() => refetch()} retrying={isFetching} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Aucune notification"
            body="Séances confirmées, rappels et messages apparaîtront ici."
            variant={variant}
          />
        ) : (
          <View className="px-5 gap-1.5 pt-1">
            {items.map((n, i) => (
              <FadeInItem key={n.id} index={i}>
                {/* Glisser vers la droite révèle le panneau de suppression.
                    Deux façons de conclure : relâcher au-delà du seuil, ou
                    appuyer sur le bouton révélé — le panneau doit être
                    cliquable, sinon un glissement partiel laisse un bouton
                    inerte à l'écran.
                    friction 1 : au-dessus, le doigt parcourt le double de la
                    distance dont la ligne se déplace, et le seuil n'est
                    jamais atteint en pratique. */}
                <ReanimatedSwipeable
                  friction={1}
                  leftThreshold={ACTION_WIDTH * 0.6}
                  overshootLeft={false}
                  renderLeftActions={() => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Supprimer la notification ${n.title}`}
                      onPress={() => deleteNotification(n)}
                      style={({ pressed }) => ({
                        width: ACTION_WIDTH,
                        opacity: pressed ? 0.8 : 1,
                      })}
                      className="justify-center pr-2"
                    >
                      <View className="flex-1 bg-danger rounded-2xl flex-row items-center justify-center gap-2 px-3">
                        <Icon name="trash" size={16} color="#fff" />
                        <Text className="text-white text-xs font-bold">Supprimer</Text>
                      </View>
                    </Pressable>
                  )}
                  onSwipeableOpen={(direction) => {
                    if (direction !== 'left') return;
                    deleteNotification(n);
                  }}
                >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${n.title}. ${n.body}`}
                  onPress={() => open(n)}
                  style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
                  className={`rounded-2xl border px-3 py-3 flex-row gap-3 ${
                    n.read_at ? 'bg-card border-border' : 'bg-card2 border-instructor/25'
                  }`}
                >
                  {/* Pastille de non-lu : l'état se lit d'un coup d'œil, sans
                      dépendre uniquement du contraste de fond. */}
                  <View className="pt-1">
                    <View
                      className={`w-2 h-2 rounded-full ${n.read_at ? 'bg-transparent' : ''}`}
                      style={n.read_at ? undefined : { backgroundColor: accent }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm ${n.read_at ? 'text-muted font-medium' : 'text-text font-bold'}`}
                    >
                      {n.title}
                    </Text>
                    <Text className="text-muted text-xs mt-0.5 leading-5">{n.body}</Text>
                    <Text className="text-muted2 text-[10px] mt-1">{relativeTime(n.created_at)}</Text>
                  </View>
                  {typeof n.data?.route === 'string' ? (
                    <View className="self-center">
                      <Icon name="chevron-right" size={14} color="#454B57" />
                    </View>
                  ) : null}
                </Pressable>
                </ReanimatedSwipeable>
              </FadeInItem>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
