import { Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';

type Props = {
  icon?: IconName;
  title: string;
  subtitle: string;
};

export function LockedRow({ icon = 'lock', title, subtitle }: Props) {
  return (
    <View className="mx-5 mb-2 bg-card border border-dashed border-muted2 rounded-2xl px-3 py-3 flex-row items-center gap-2.5 opacity-60">
      <Icon name={icon} size={18} color="#878D9A" />
      <View>
        <Text className="text-text text-sm font-medium">{title}</Text>
        <Text className="text-muted2 text-[10px] mt-0.5">{subtitle}</Text>
      </View>
    </View>
  );
}
