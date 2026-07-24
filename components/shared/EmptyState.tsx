import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { haptics } from '../../lib/haptics';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  cta?: string;
  onPress?: () => void;
  variant?: 'instructor' | 'student';
};

export function EmptyState({ icon, title, body, cta, onPress, variant = 'instructor' }: Props) {
  const accentBg = variant === 'instructor' ? 'bg-instructor' : 'bg-student';
  const accentText = variant === 'instructor' ? 'text-white' : 'text-[#0a1a14]';
  const accentColor = variant === 'instructor' ? '#7C75FF' : '#00C896';
  return (
    <View className="mx-5 my-2 bg-card border border-dashed border-border rounded-2xl px-4 py-6 items-center">
      <View className="mb-2">
        <Icon name={icon} size={28} color={accentColor} />
      </View>
      <Text className="text-text text-sm font-bold text-center">{title}</Text>
      {body ? (
        <Text className="text-muted text-xs text-center mt-1.5 leading-5">{body}</Text>
      ) : null}
      {cta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta}
          onPress={() => {
            haptics.tap();
            onPress?.();
          }}
          style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}
          className={`${accentBg} mt-3 px-4 py-2 rounded-full`}
        >
          <Text className={`${accentText} text-xs font-bold`}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
