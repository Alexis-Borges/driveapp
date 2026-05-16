import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';

type Tone = 'student' | 'instructor' | 'warning';

type Props = {
  icon: IconName;
  title: string;
  subtitle: string;
  price: string;
  unit: string;
  tone: Tone;
  onPress?: () => void;
};

const tones = {
  student: {
    border: 'border-border',
    priceText: 'text-student',
    iconBg: 'bg-student/15',
    iconColor: '#00C896',
    subtitleText: 'text-muted',
  },
  instructor: {
    border: 'border-instructor/30',
    priceText: 'text-instructor',
    iconBg: 'bg-instructor/15',
    iconColor: '#7C75FF',
    subtitleText: 'text-instructor',
  },
  warning: {
    border: 'border-warning/30',
    priceText: 'text-warning',
    iconBg: 'bg-warning/15',
    iconColor: '#FFB230',
    subtitleText: 'text-warning',
  },
};

export function PackCard({ icon, title, subtitle, price, unit, tone, onPress }: Props) {
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      className={`mx-5 mb-2 bg-card border ${t.border} rounded-2xl px-3 py-3 flex-row items-center gap-3`}
    >
      <View className={`${t.iconBg} w-10 h-10 rounded-xl items-center justify-center`}>
        <Icon name={icon} size={20} color={t.iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-text text-sm font-bold">{title}</Text>
        <Text className={`${t.subtitleText} text-[10px] mt-0.5`}>{subtitle}</Text>
      </View>
      <View className="items-end">
        <Text className={`${t.priceText} text-base font-bold`}>{price}</Text>
        <Text className="text-muted2 text-[10px] mt-0.5">{unit}</Text>
      </View>
    </Pressable>
  );
}
