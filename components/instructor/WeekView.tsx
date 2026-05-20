import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Lesson } from '../../hooks/useLessons';
import { PLANNING_HOURS } from '../../lib/planning';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - day);
  return x;
}

type Props = {
  weekStart: Date;
  onPressLesson?: (lesson: Lesson) => void;
};

export function WeekView({ weekStart, onPressLesson }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const start = startOfWeek(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const { data: lessons = [] } = useQuery({
    queryKey: ['week-view', profile?.id, start.toISOString()],
    enabled: !!profile && profile.role === 'instructor',
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('instructor_id', profile!.id)
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString())
        .order('scheduled_at');
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  });

  const grid = useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const l of lessons) {
      // les leçons annulées libèrent le créneau
      if (l.status === 'cancelled' || l.status === 'auto_cancelled') continue;
      const d = new Date(l.scheduled_at);
      const key = `${(d.getDay() + 6) % 7}-${d.getHours()}`;
      map.set(key, l);
    }
    return map;
  }, [lessons]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View className="flex-row pl-12">
          {DAYS_FR.map((d, i) => {
            const dt = new Date(start);
            dt.setDate(start.getDate() + i);
            return (
              <View key={d} className="w-14 items-center py-1">
                <Text className="text-muted2 text-[9px] uppercase">{d}</Text>
                <Text className="text-text text-[11px] font-bold">{dt.getDate()}</Text>
              </View>
            );
          })}
        </View>

        {PLANNING_HOURS.map((h) => (
          <View key={h} className="flex-row items-center">
            <View className="w-12 items-end pr-2">
              <Text className="text-muted2 text-[10px]">{String(h).padStart(2, '0')}h</Text>
            </View>
            {DAYS_FR.map((_, i) => {
              const l = grid.get(`${i}-${h}`);
              const tone = !l
                ? 'bg-card2 border-border'
                : l.student_id == null
                  ? 'bg-student/15 border-student/30'
                  : l.status === 'confirmed' || l.status === 'completed'
                    ? 'bg-student border-student'
                    : 'bg-instructor/30 border-instructor/50';
              const node = (
                <View
                  className={`w-14 h-10 m-0.5 rounded-md border ${tone} items-center justify-center`}
                >
                  {l ? (
                    <Text className="text-[9px] text-text" numberOfLines={1}>
                      {l.student_id == null ? 'libre' : l.type.slice(0, 5)}
                    </Text>
                  ) : null}
                </View>
              );
              if (!l || !onPressLesson) return <View key={`${h}-${i}`}>{node}</View>;
              return (
                <Pressable key={`${h}-${i}`} onPress={() => onPressLesson(l)}>
                  {node}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
