import { Text, View } from 'react-native';
import { Badge } from '../ui/Badge';

type Status = 'confirmed' | 'pending' | 'free' | 'critical';

type Props = {
  time: string;
  name: string;
  subtitle: string;
  status: Status;
};

const cfg = {
  confirmed: { bar: 'bg-student', label: 'Confirmée', tone: 'student' as const, crit: false },
  pending: { bar: 'bg-warning', label: 'En attente', tone: 'warning' as const, crit: false },
  free: { bar: 'bg-border', label: 'Libre', tone: 'neutral' as const, crit: false },
  critical: { bar: 'bg-danger', label: 'Critique', tone: 'danger' as const, crit: true },
};

export function TodayLessonItem({ time, name, subtitle, status }: Props) {
  const c = cfg[status];
  return (
    <View
      className={`flex-row items-center gap-2 px-3 py-2.5 rounded-2xl border ${
        c.crit ? 'bg-danger/5 border-danger/30' : 'bg-card border-border'
      }`}
    >
      <Text
        className={`font-mono text-[11px] min-w-[40px] ${c.crit ? 'text-danger' : 'text-muted'}`}
      >
        {time}
      </Text>
      <View className={`${c.bar} w-[3px] h-8 rounded-sm`} />
      <View className="flex-1">
        <Text className={`text-sm font-medium ${c.crit ? 'text-danger' : 'text-text'}`}>
          {name}
        </Text>
        <Text className="text-muted2 text-[10px] mt-0.5">{subtitle}</Text>
      </View>
      <Badge label={c.label} tone={c.tone} />
    </View>
  );
}
