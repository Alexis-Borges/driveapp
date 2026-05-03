import { Text, View } from 'react-native';

type Props = {
  initials: string;
  name: string;
  subtitle: string;
  balance: string;
  balanceTone: 'danger' | 'success' | 'neutral';
};

const balanceColors = {
  danger: 'text-danger',
  success: 'text-student',
  neutral: 'text-muted',
};

const avatarColors = {
  danger: 'bg-danger/15',
  success: 'bg-student/15',
  neutral: 'bg-card2',
};

const avatarText = {
  danger: 'text-danger',
  success: 'text-student',
  neutral: 'text-muted',
};

export function StudentRow({ initials, name, subtitle, balance, balanceTone }: Props) {
  return (
    <View className="flex-row items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2.5">
      <View
        className={`${avatarColors[balanceTone]} w-8 h-8 rounded-full items-center justify-center`}
      >
        <Text className={`${avatarText[balanceTone]} text-[10px] font-bold`}>{initials}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-text text-sm font-medium">{name}</Text>
        <Text className="text-muted text-[10px] mt-0.5">{subtitle}</Text>
      </View>
      <Text className={`${balanceColors[balanceTone]} font-mono text-sm font-medium`}>
        {balance}
      </Text>
    </View>
  );
}
