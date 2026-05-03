import { ScrollView, Text, View } from 'react-native';

type Kpi = {
  icon: string;
  value: string | number;
  label: string;
  tone?: 'default' | 'danger' | 'warning';
};

const tones = {
  default: 'text-text',
  danger: 'text-danger',
  warning: 'text-warning',
};

export function KpiScroll({ items }: { items: Kpi[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {items.map((k, i) => (
        <View
          key={i}
          className="bg-card border border-border rounded-2xl px-3 py-3 min-w-[84px]"
        >
          <Text className="text-base">{k.icon}</Text>
          <Text className={`${tones[k.tone ?? 'default']} text-xl font-bold mt-1`}>
            {k.value}
          </Text>
          <Text className="text-muted text-[9px] uppercase tracking-wider mt-0.5">
            {k.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
