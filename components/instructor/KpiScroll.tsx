import { ScrollView, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';

type Kpi = {
  icon: IconName;
  value: string | number;
  label: string;
  tone?: 'default' | 'danger' | 'warning';
};

const tones = {
  default: { text: 'text-text', icon: '#878D9A' },
  danger: { text: 'text-danger', icon: '#FF4F4F' },
  warning: { text: 'text-warning', icon: '#FFB230' },
};

export function KpiScroll({ items }: { items: Kpi[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {items.map((k, i) => {
        const t = tones[k.tone ?? 'default'];
        return (
          <View
            key={i}
            className="bg-card border border-border rounded-2xl px-3 py-3 min-w-[84px]"
          >
            <Icon name={k.icon} size={18} color={t.icon} />
            <Text className={`${t.text} text-xl font-bold mt-1`}>{k.value}</Text>
            <Text className="text-muted text-[9px] uppercase tracking-wider mt-0.5">
              {k.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
