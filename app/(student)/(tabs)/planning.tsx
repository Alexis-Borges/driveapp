import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard } from '../../../components/instructor/AlertCard';
import { DaySelector } from '../../../components/shared/DaySelector';
import { PlanningGrid, type SlotState } from '../../../components/shared/PlanningGrid';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useStudentLessonsForDay, type Lesson } from '../../../hooks/useLessons';
import { useStudentBalance, useStudentPackage } from '../../../hooks/useBalance';
import { useAuthStore } from '../../../stores/authStore';
import { useRefresh } from '../../../hooks/useRefresh';
import { useRealtimeLessons, useRealtimeInstructorSlots } from '../../../hooks/useRealtimeLessons';
import { PAUSE_HOUR, isLunchBreak } from '../../../lib/planning';
import { useLinkedInstructorInfo } from '../../../hooks/useStripeConnect';
import { isActiveLesson, typeLabel } from '../../../lib/lessons';
import { BookSlotSheet } from '../../../components/student/BookSlotSheet';
import { LessonDetailSheet } from '../../../components/student/LessonDetailSheet';

export default function StudentPlanning() {
  const profile = useAuthStore((s) => s.profile);
  const { data: pkg } = useStudentPackage();
  const { data: balance } = useStudentBalance();
  useRealtimeLessons();
  useRealtimeInstructorSlots(pkg?.instructor_id ?? null);
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const {
    data: lessons = [],
    isError: lessonsError,
    isFetching: lessonsFetching,
    refetch: refetchLessons,
  } = useStudentLessonsForDay(selected, pkg?.instructor_id ?? null);
  const { data: instrInfo } = useLinkedInstructorInfo(pkg?.instructor_id ?? null);
  const [bookingSlot, setBookingSlot] = useState<Lesson | null>(null);
  const [detailLesson, setDetailLesson] = useState<Lesson | null>(null);
  const { refreshing, onRefresh } = useRefresh(['lessons', 'student-balance', 'student-package']);

  const slots = useMemo(() => {
    const map: Record<number, SlotState> = {};
    for (const l of lessons as Lesson[]) {
      if (!isActiveLesson(l.status)) continue;
      const h = new Date(l.scheduled_at).getHours();
      if (l.student_id == null) {
        map[h] = { kind: 'free' };
      } else if (l.student_id === profile?.id) {
        map[h] = {
          kind: 'mine',
          title: `Ma séance — ${typeLabel(l.type)}`,
          subtitle: 'Avec ton enseignant·e · 1h',
          status: l.status === 'confirmed' ? 'confirmed' : 'pending',
        };
      } else {
        map[h] = { kind: 'unavail', reason: 'Créneau pris' };
      }
    }
    // Pause déjeuner : fermée sauf si l'enseignant·e a ouvert ce créneau.
    if (!map[PAUSE_HOUR] && isLunchBreak(PAUSE_HOUR, instrInfo?.works_lunch_hour)) {
      map[PAUSE_HOUR] = { kind: 'unavail', reason: 'Pause déjeuner' };
    }
    return map;
  }, [lessons, profile, instrInfo?.works_lunch_hour]);

  function shiftDay(delta: number) {
    const d = new Date(selected);
    d.setDate(d.getDate() + delta);
    setSelected(d);
  }

  function reserveAt(hour: number) {
    const target = (lessons as Lesson[]).find((l) => {
      const h = new Date(l.scheduled_at).getHours();
      return h === hour && l.student_id == null;
    });
    if (!target) return;
    setBookingSlot(target);
  }

  function openMine(hour: number) {
    const mine = (lessons as Lesson[]).find((l) => {
      const h = new Date(l.scheduled_at).getHours();
      return h === hour && l.student_id === profile?.id;
    });
    if (mine) setDetailLesson(mine);
  }

  if (!pkg?.instructor_id) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="px-5 pt-3 pb-2">
          <Text className="text-text text-xl font-bold">Mon planning</Text>
        </View>
        <AlertCard
          tone="instructor"
          title="Aucun moniteur lié"
          body="Rejoins ton enseignant·e depuis ton profil pour voir son planning et réserver."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C896" />
        }
      >
        <View className="px-5 pt-3 pb-2">
          <Text className="text-text text-xl font-bold">Mon planning</Text>
        </View>

        <View className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row justify-between">
          <View>
            <Text className="text-muted2 text-[9px] uppercase tracking-wider">Heures restantes</Text>
            <Text className="text-student text-base font-bold mt-0.5">
              {balance?.balance_hours ?? 0}h
            </Text>
          </View>
          <View>
            <Text className="text-muted2 text-[9px] uppercase tracking-wider text-right">Séances</Text>
            <Text className="text-student text-base font-bold mt-0.5 text-right">
              {balance?.hours_booked ?? 0} / {pkg?.package_total_hours ?? 0}
            </Text>
          </View>
        </View>

        <AlertCard
          tone="warning"
          title="Règle 48h"
          body="Tout solde impayé 48h avant = annulation automatique."
        />

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

        <DaySelector selected={selected} onSelect={setSelected} variant="student" />

        <View className="h-2.5" />
        {/* On n'écrase pas des données encore affichables : React Query garde
            le dernier résultat en cas d'échec de rafraîchissement. L'erreur ne
            s'affiche que si la grille serait vide de toute façon. */}
        {lessonsError && lessons.length === 0 ? (
          <ErrorState
            what="ton planning"
            onRetry={() => refetchLessons()}
            retrying={lessonsFetching}
          />
        ) : (
          <PlanningGrid
            slots={slots}
            variant="student"
            onPressFree={reserveAt}
            onPressBooked={openMine}
          />
        )}
      </ScrollView>

      <BookSlotSheet
        visible={!!bookingSlot}
        onClose={() => setBookingSlot(null)}
        slot={bookingSlot}
        balanceHours={balance?.balance_hours ?? 0}
      />
      <LessonDetailSheet
        visible={!!detailLesson}
        onClose={() => setDetailLesson(null)}
        lesson={detailLesson}
      />
    </SafeAreaView>
  );
}
