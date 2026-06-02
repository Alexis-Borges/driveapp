import { Text, View } from 'react-native';
import { Badge } from '../ui/Badge';
import { statusLabel } from '../../lib/lessons';

type Props = {
  number: number;
  type: string;
  time: string;
  instructor: string;
  status: 'confirmed' | 'pending';
};

export function NextLessonCard({ number, type, time, instructor, status }: Props) {
  return (
    <View className="mx-5 bg-student/5 border border-student/25 rounded-2xl px-3 py-2.5 flex-row items-center gap-2">
      <View className="bg-student w-[3px] h-9 rounded-sm" />
      <View className="flex-1">
        <Text className="text-text text-sm font-medium">
          Séance #{number} — {type}
        </Text>
        <Text className="text-muted text-[10px] mt-0.5">
          {time} · {instructor}
        </Text>
      </View>
      <Badge
        label={statusLabel(status)}
        tone={status === 'confirmed' ? 'student' : 'warning'}
      />
    </View>
  );
}
