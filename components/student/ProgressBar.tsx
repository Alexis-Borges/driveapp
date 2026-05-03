import { Text, View } from 'react-native';

type Props = {
  done: number;
  total: number;
};

export function ProgressBar({ done, total }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const remaining = Math.max(0, total - done);
  return (
    <View className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-text text-sm font-medium">Heures de conduite</Text>
        <Text className="text-muted text-[11px]">
          {done} / {total}h
        </Text>
      </View>
      <View className="h-1.5 bg-card2 rounded-full overflow-hidden mb-1.5">
        <View className="h-full bg-student rounded-full" style={{ width: `${pct}%` }} />
      </View>
      <Text className="text-muted2 text-[10px]">
        {pct}% — environ {remaining} séance{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
      </Text>
    </View>
  );
}
