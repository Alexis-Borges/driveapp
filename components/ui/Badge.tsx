import { Text, View } from 'react-native';

type Tone = 'instructor' | 'student' | 'danger' | 'warning' | 'neutral';

const tones: Record<Tone, { bg: string; text: string }> = {
  instructor: { bg: 'bg-instructor/15', text: 'text-instructor' },
  student: { bg: 'bg-student/15', text: 'text-student' },
  danger: { bg: 'bg-danger/15', text: 'text-danger' },
  warning: { bg: 'bg-warning/15', text: 'text-warning' },
  neutral: { bg: 'bg-white/5', text: 'text-muted2' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View className={`${t.bg} px-2 py-0.5 rounded-full self-start`}>
      <Text className={`${t.text} text-[9px] font-bold uppercase tracking-wider`}>{label}</Text>
    </View>
  );
}
