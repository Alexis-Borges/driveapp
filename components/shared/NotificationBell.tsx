import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { haptics } from '../../lib/haptics';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';

type Props = {
  variant?: 'instructor' | 'student';
};

export function NotificationBell({ variant = 'instructor' }: Props) {
  const router = useRouter();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const accent = variant === 'student' ? '#00C896' : '#7C75FF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'
      }
      onPress={() => {
        haptics.tap();
        router.push('/notifications');
      }}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
      className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center"
    >
      <Icon name="bell" size={17} color="#878D9A" />
      {unread > 0 ? (
        // Position absolue plutôt qu'un layout en ligne : le badge ne doit pas
        // décaler la cloche quand il apparaît ou passe à deux chiffres.
        <View
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full items-center justify-center"
          style={{ backgroundColor: accent }}
        >
          <Text className="text-[9px] font-bold text-[#0C0D0F]">
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
