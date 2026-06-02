import { Pressable, Text, View } from 'react-native';
import { Badge } from '../ui/Badge';
import { PLANNING_HOURS } from '../../lib/planning';
import { statusLabel } from '../../lib/lessons';

export type SlotState =
  | { kind: 'free' }
  | { kind: 'unavail'; reason?: string }
  | { kind: 'booked'; tone: 'student' | 'instructor'; title: string; subtitle: string; status?: 'confirmed' | 'pending' | 'critical' }
  | { kind: 'mine'; title: string; subtitle: string; status: 'confirmed' | 'pending' };

type Props = {
  hours?: number[];
  slots: Record<number, SlotState>;
  variant: 'instructor' | 'student';
  onPressFree?: (hour: number) => void;
  onPressBooked?: (hour: number) => void;
};

export function PlanningGrid({ hours = PLANNING_HOURS, slots, variant, onPressFree, onPressBooked }: Props) {
  return (
    <View className="px-5 gap-1.5">
      {hours.map((h) => {
        const state = slots[h] ?? { kind: 'unavail' as const };
        const time = `${String(h).padStart(2, '0')}h`;
        return (
          <View key={h} className="flex-row items-stretch gap-2">
            <Text className="font-mono text-[10px] text-muted2 w-9 pt-2 text-right">{time}</Text>
            <SlotCell
              state={state}
              variant={variant}
              onPressFree={() => onPressFree?.(h)}
              onPressBooked={() => onPressBooked?.(h)}
            />
          </View>
        );
      })}
    </View>
  );
}

function SlotCell({
  state,
  variant,
  onPressFree,
  onPressBooked,
}: {
  state: SlotState;
  variant: 'instructor' | 'student';
  onPressFree: () => void;
  onPressBooked: () => void;
}) {
  if (state.kind === 'free') {
    return (
      <Pressable
        onPress={onPressFree}
        className="flex-1 min-h-[48px] rounded-xl border border-dashed border-student/30 px-3 py-2 justify-center"
      >
        <Text className="text-student text-sm font-medium">+ {variant === 'student' ? 'Disponible' : 'Créneau libre'}</Text>
        <Text className="text-muted2 text-[10px] mt-0.5">
          {variant === 'student' ? 'Appuyer pour réserver' : 'Disponible'}
        </Text>
      </Pressable>
    );
  }
  if (state.kind === 'unavail') {
    return (
      <View className="flex-1 min-h-[48px] rounded-xl bg-card2 border border-border opacity-60 px-3 py-2 justify-center">
        <Text className="text-text text-sm font-medium">Indisponible</Text>
        <Text className="text-muted2 text-[10px] mt-0.5">{state.reason ?? 'Créneau pris'}</Text>
      </View>
    );
  }
  if (state.kind === 'mine') {
    return (
      <Pressable
        onPress={onPressBooked}
        className="flex-1 min-h-[48px] rounded-xl bg-student/10 border border-student/30 px-3 py-2 justify-center"
      >
        <Text className="text-student text-sm font-medium">{state.title}</Text>
        <Text className="text-muted2 text-[10px] mt-0.5">{state.subtitle}</Text>
        <View className="absolute right-2 top-1/2 -translate-y-1/2">
          <Badge label={statusLabel(state.status === 'confirmed' ? 'confirmed' : 'pending')} tone={state.status === 'confirmed' ? 'student' : 'warning'} />
        </View>
      </Pressable>
    );
  }
  // booked
  const bg =
    state.status === 'critical'
      ? 'bg-danger/10 border-danger/25'
      : state.tone === 'student'
        ? 'bg-student/10 border-student/25'
        : 'bg-instructor/15 border-instructor/25';
  const tone =
    state.status === 'critical'
      ? 'danger'
      : state.status === 'pending'
        ? 'warning'
        : state.tone;
  const label =
    state.status === 'critical' ? 'Critique' : statusLabel(state.status ?? 'pending');
  return (
    <Pressable
      onPress={onPressBooked}
      className={`flex-1 min-h-[48px] rounded-xl border px-3 py-2 justify-center ${bg}`}
    >
      <Text className={`text-sm font-medium ${state.status === 'critical' ? 'text-danger' : 'text-text'}`}>
        {state.title}
      </Text>
      <Text className="text-muted2 text-[10px] mt-0.5">{state.subtitle}</Text>
      <View className="absolute right-2 top-1/2 -translate-y-1/2">
        <Badge label={label} tone={tone} />
      </View>
    </Pressable>
  );
}
