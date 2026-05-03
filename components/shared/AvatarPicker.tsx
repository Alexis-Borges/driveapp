import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { usePickAndUploadAvatar } from '../../hooks/useAvatarUpload';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  size?: number;
  variant: 'instructor' | 'student';
};

export function AvatarPicker({ size = 72, variant }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const upload = usePickAndUploadAvatar();
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`;

  async function handle() {
    try {
      await upload.mutateAsync();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      if (msg !== 'cancelled') Alert.alert('Photo', msg);
    }
  }

  return (
    <Pressable onPress={handle} disabled={upload.isPending}>
      <View>
        <Avatar
          initials={initials || '?'}
          variant={variant}
          size={size}
          url={profile?.avatar_url ?? undefined}
        />
        <View
          className="absolute bg-card2 rounded-full border-2 border-bg items-center justify-center"
          style={{
            width: size * 0.31,
            height: size * 0.31,
            bottom: 0,
            right: 0,
          }}
        >
          <Text className="text-text text-[10px]">{upload.isPending ? '…' : '📷'}</Text>
        </View>
      </View>
    </Pressable>
  );
}
