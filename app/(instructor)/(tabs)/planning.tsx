import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { DaySelector } from '../../../components/shared/DaySelector';
import { PlanningGrid, type SlotState } from '../../../components/shared/PlanningGrid';
import { useInstructorLessonsForDay, type Lesson } from '../../../hooks/useLessons';
import { LessonActionSheet } from '../../../components/instructor/LessonActionSheet';
import { CreateSlotSheet } from '../../../components/instructor/CreateSlotSheet';
import { WeekView } from '../../../components/instructor/WeekView';
import { useRefresh } from '../../../hooks/useRefresh';
import { useRealtimeLessons } from '../../../hooks/useRealtimeLessons';

const PAUSE_HOUR = 13;
const TYPE_LABEL: Record<string, string> = {
  city: 'Ville',
  highway: 'Autoroute',
  parking: 'Parking',
  evaluation: 'Évaluation',
  mock_exam: 'Examen blanc',
  other: 'Autre',
};

export default function InstructorPlanning() {
  useRealtimeLessons();
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [view, setView] = useState<'day' | 'week'>('day');
  const { data: lessons = [] } = useInstructorLessonsForDay(selected);
  const [actionLesson, setActionLesson] = useState<Lesson | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { refreshing, onRefresh } = useRefresh(['lessons', 'week-view']);

  const slots = useMemo(() => {
    const map: Record<number, SlotState> = {};
    map[PAUSE_HOUR] = { kind: 'unavail', reason: 'Pause déjeuner' };
    for (const l of lessons as Lesson[]) {
      const h = new Date(l.scheduled_at).getHours();
      const profileLink = (l as unknown as {
        students?: { profiles?: { first_name: string; last_name: string } | null } | null;
      }).students?.profiles;
      const subtitle = `${TYPE_LABEL[l.type] ?? l.type} · 1h`;
      if (l.student_id == null) {
        map[h] = { kind: 'free' };
      } else {
        const status =
          l.status === 'confirmed' || l.status === 'completed'
            ? 'confirmed'
            : l.status === 'pending'
              ? 'pending'
              : 'critical';
        map[h] = {
          kind: 'booked',
          tone: status === 'confirmed' ? 'student' : 'instructor',
          title: profileLink ? `${profileLink.first_name} ${profileLink.last_name[0]}.` : 'Élève',
          subtitle,
          status,
        };
      }
    }
    return map;
  }, [lessons]);

  const stats = useMemo(() => {
    let booked = 0;
    let free = 0;
    for (let h = 8; h <= 21; h++) {
      if (h === PAUSE_HOUR) continue;
      const s = slots[h];
      if (!s) continue;
      if (s.kind === 'free') free++;
      else if (s.kind === 'booked') booked++;
    }
    const total = booked + free;
    const pct = total === 0 ? 0 : Math.round((booked / total) * 100);
    return { free, total, pct };
  }, [slots]);

  function shiftDay(delta: number) {
    const d = new Date(selected);
    d.setDate(d.getDate() + delta);
    setSelected(d);
  }

  const takenHours = useMemo(() => {
    const s = new Set<number>();
    s.add(PAUSE_HOUR);
    for (const l of lessons as Lesson[]) {
      s.add(new Date(l.scheduled_at).getHours());
    }
    return s;
  }, [lessons]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C75FF" />
        }
      >
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          <Text className="text-text text-xl font-bold">Planning</Text>
          <View className="flex-row bg-card border border-border rounded-xl p-0.5">
            <Pressable
              onPress={() => setView('day')}
              className={`px-3 py-1 rounded-lg ${view === 'day' ? 'bg-instructor' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${view === 'day' ? 'text-white' : 'text-muted'}`}>
                Jour
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setView('week')}
              className={`px-3 py-1 rounded-lg ${view === 'week' ? 'bg-instructor' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${view === 'week' ? 'text-white' : 'text-muted'}`}>
                Semaine
              </Text>
            </Pressable>
          </View>
        </View>

        {view === 'week' ? (
          <View className="px-3 mt-2 mb-3">
            <WeekView weekStart={selected} onPressLesson={setActionLesson} />
          </View>
        ) : null}

        {view === 'day' ? (
          <>
            <View className="px-5 pb-2.5 flex-row items-center justify-between">
              <Pressable
                onPress={() => shiftDay(-1)}
                className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
              >
                <Text className="text-muted text-base">‹</Text>
              </Pressable>
              <Text className="text-text text-sm font-bold">
                {selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Pressable
                onPress={() => shiftDay(1)}
                className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
              >
                <Text className="text-muted text-base">›</Text>
              </Pressable>
            </View>

            <DaySelector selected={selected} onSelect={setSelected} variant="instructor" />

            <View className="mx-5 my-2.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row justify-between">
              <View>
                <Text className="text-muted2 text-[9px] uppercase tracking-wider">Créneaux libres</Text>
                <Text className="text-student text-base font-bold mt-0.5">
                  {stats.free} / {stats.total}
                </Text>
              </View>
              <View>
                <Text className="text-muted2 text-[9px] uppercase tracking-wider text-right">Remplissage</Text>
                <Text className="text-warning text-base font-bold mt-0.5 text-right">{stats.pct}%</Text>
              </View>
            </View>

            <PlanningGrid
              slots={slots}
              variant="instructor"
              onPressBooked={(hour) => {
                const l = (lessons as Lesson[]).find(
                  (x) => new Date(x.scheduled_at).getHours() === hour
                );
                if (l) setActionLesson(l);
              }}
            />
          </>
        ) : null}

        <View className="px-5 pt-3.5">
          <Button
            label="+ Ajouter un créneau"
            variant="instructor"
            onPress={() => setCreateOpen(true)}
          />
        </View>
      </ScrollView>
      <LessonActionSheet
        visible={!!actionLesson}
        onClose={() => setActionLesson(null)}
        lesson={actionLesson}
      />
      <CreateSlotSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        date={selected}
        takenHours={takenHours}
      />
    </SafeAreaView>
  );
}
