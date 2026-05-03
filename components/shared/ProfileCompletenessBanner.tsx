import { Pressable, Text, View } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  onPress: () => void;
  variant: 'instructor' | 'student';
};

export function ProfileCompletenessBanner({ onPress, variant }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const missing: string[] = [];
  if (!profile?.phone) missing.push('téléphone');
  if (!profile?.bio) missing.push('description');
  if (!profile?.avatar_url) missing.push('photo');
  if (missing.length === 0) return null;

  const accent = variant === 'instructor' ? 'instructor' : 'student';
  return (
    <Pressable
      onPress={onPress}
      className={`mx-5 mb-2 bg-${accent}/10 border border-${accent}/25 rounded-2xl px-3 py-2.5`}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className={`text-${accent} text-xs font-bold`}>Complète ton profil</Text>
          <Text className="text-muted text-[11px] mt-0.5">
            Manque : {missing.join(', ')}
          </Text>
        </View>
        <Text className={`text-${accent} text-[11px] font-bold ml-2`}>→</Text>
      </View>
    </Pressable>
  );
}
