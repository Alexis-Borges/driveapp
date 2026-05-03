import { Image, Text, View } from 'react-native';

type Props = {
  initials: string;
  variant?: 'instructor' | 'student' | 'neutral';
  size?: number;
  url?: string | null;
};

export function Avatar({ initials, variant = 'neutral', size = 38, url }: Props) {
  const bg =
    variant === 'instructor'
      ? 'bg-instructor'
      : variant === 'student'
        ? 'bg-student'
        : 'bg-card2';
  const color = variant === 'student' ? 'text-[#0a1a14]' : 'text-white';

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className={`${bg} rounded-full items-center justify-center`}
      style={{ width: size, height: size }}
    >
      <Text className={`${color} font-bold`} style={{ fontSize: size * 0.32 }}>
        {initials.toUpperCase().slice(0, 2)}
      </Text>
    </View>
  );
}
