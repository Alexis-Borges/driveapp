import { Pressable, Text, View } from 'react-native';

type Tone = 'danger' | 'warning' | 'instructor';

type Props = {
  tone: Tone;
  title: string;
  body: string;
  cta?: string;
  onPress?: () => void;
};

const styles: Record<Tone, { bg: string; border: string; text: string; btn: string; btnText: string }> = {
  danger: {
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    text: 'text-danger',
    btn: 'bg-danger/20',
    btnText: 'text-danger',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/25',
    text: 'text-warning',
    btn: 'bg-warning/20',
    btnText: 'text-warning',
  },
  instructor: {
    bg: 'bg-instructor/10',
    border: 'border-instructor/25',
    text: 'text-instructor',
    btn: 'bg-instructor/20',
    btnText: 'text-instructor',
  },
};

export function AlertCard({ tone, title, body, cta, onPress }: Props) {
  const s = styles[tone];
  return (
    <View className={`mx-5 mb-2 ${s.bg} border ${s.border} rounded-2xl px-3 py-3`}>
      <Text className={`${s.text} text-xs font-bold`}>{title}</Text>
      <Text className="text-muted text-[11px] leading-5 mt-1">{body}</Text>
      {cta ? (
        <Pressable
          onPress={onPress}
          className={`${s.btn} self-start mt-2 px-3 py-1 rounded-full`}
        >
          <Text className={`${s.btnText} text-[11px] font-bold`}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
