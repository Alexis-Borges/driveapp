import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { AlertCard } from '../../../components/instructor/AlertCard';
import { KpiScroll } from '../../../components/instructor/KpiScroll';
import { TodayLessonItem } from '../../../components/instructor/TodayLessonItem';
import { StudentRow } from '../../../components/instructor/StudentRow';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { InviteStudentSheet } from '../../../components/instructor/InviteStudentSheet';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { Checklist, type ChecklistItem } from '../../../components/shared/Checklist';
import { ProfileCompletenessBanner } from '../../../components/shared/ProfileCompletenessBanner';
import { FadeInItem } from '../../../components/shared/Animated';
import { useInstructorStripeStatus, useStripeConnectOnboarding } from '../../../hooks/useStripeConnect';
import { useInstructorStudents } from '../../../hooks/useStudents';
import { SkeletonCard } from '../../../components/shared/Skeleton';
import { useTodayLessonsForInstructor, useInstructorWeekStats, type Lesson } from '../../../hooks/useLessons';
import { useInstructorReferralCount } from '../../../hooks/useReferrals';
import { useRefresh } from '../../../hooks/useRefresh';
import { useRealtimeLessons } from '../../../hooks/useRealtimeLessons';
import { usePaymentReminder } from '../../../hooks/usePaymentReminder';
import { isLessonCritical, isInAmberWindow } from '../../../lib/planning';
import { typeLabel } from '../../../lib/lessons';

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
}

export default function InstructorHome() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  useRealtimeLessons();
  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
    isFetching: studentsFetching,
    refetch: refetchStudents,
  } = useInstructorStudents();
  const { data: today = [], isLoading: todayLoading } = useTodayLessonsForInstructor();
  const { data: weekStats } = useInstructorWeekStats();
  const { data: referrals = 0 } = useInstructorReferralCount();
  const { data: stripe } = useInstructorStripeStatus();
  const stripeOnboard = useStripeConnectOnboarding();
  const reminder = usePaymentReminder();
  const [inviteOpen, setInviteOpen] = useState(false);

  function sendReminder(studentId: string, name: string, owedHours: number) {
    Alert.alert(
      `Relancer ${name} ?`,
      `Un message de rappel sera envoyé (${Math.abs(owedHours)}h en dépassement).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            try {
              await reminder.mutateAsync({
                student_id: studentId,
                student_name: name,
                amount: Math.abs(owedHours) * 30,
              });
              Alert.alert('Rappel envoyé', `${name} reçoit ta relance.`);
            } catch (e: unknown) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
            }
          },
        },
      ]
    );
  }

  const checklist: ChecklistItem[] = [
    {
      id: 'stripe',
      title: 'Activer les paiements Stripe',
      done: !!stripe?.is_verified,
      cta: 'Activer',
      onPress: () => stripeOnboard.mutate(),
    },
    {
      id: 'profile',
      title: 'Compléter ton profil (téléphone + bio)',
      done: !!(profile?.phone && profile?.bio),
      cta: 'Profil',
      onPress: () => router.push('/(instructor)/profile'),
    },
    {
      id: 'slot',
      title: 'Créer ton premier créneau',
      done: today.length > 0,
      cta: 'Planning',
      onPress: () => router.push('/(instructor)/planning'),
    },
    {
      id: 'invite',
      title: 'Inviter ton premier élève',
      done: students.length > 0,
      cta: 'Inviter',
      onPress: () => setInviteOpen(true),
    },
  ];
  const { refreshing, onRefresh } = useRefresh([
    'instructor-students',
    'lessons',
    'instructor-week-stats',
    'instructor-referrals',
  ]);

  const stats = useMemo(() => {
    const overdue = students.filter((s) => s.balance_hours < 0).length;
    return {
      active: students.length,
      lessonsThisWeek: weekStats?.count ?? 0,
      overdue,
      referrals,
    };
  }, [students, weekStats, referrals]);

  const overdueStudents = students.filter((s) => s.balance_hours < 0);

  // Map student_id → balance pour décorer les leçons
  const balanceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of students) m.set(s.id, s.balance_hours);
    return m;
  }, [students]);

  const now = Date.now();

  // Élèves avec séance dans la fenêtre 48-72h ET solde négatif → alerte amber
  const soonDueStudents = useMemo(() => {
    return overdueStudents.filter((s) => {
      const next = (today as Lesson[]).find(
        (l) =>
          l.student_id === s.id &&
          (l.status === 'pending' || l.status === 'confirmed')
      );
      if (!next) return false;
      return isInAmberWindow(next.scheduled_at, now);
    });
  }, [overdueStudents, today, now]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C75FF" />
        }
      >
        <View className="px-5 pt-3 pb-2 flex-row items-start justify-between">
          <View>
            <Text className="text-muted text-[11px] uppercase tracking-wider">Bonjour,</Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              <Text className="text-text text-xl font-bold">
                {profile?.first_name} {profile?.last_name?.[0]}.
              </Text>
              <Badge label="Moniteur" tone="instructor" />
            </View>
          </View>
          <Avatar
            initials={`${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`}
            variant="instructor"
            url={profile?.avatar_url ?? undefined}
          />
        </View>

        <Checklist items={checklist} variant="instructor" />
        <ProfileCompletenessBanner
          variant="instructor"
          onPress={() => router.push('/(instructor)/profile')}
        />

        {overdueStudents.length > 0 || soonDueStudents.length > 0 ? (
          <>
            <SectionLabel>Alertes</SectionLabel>
            {soonDueStudents.slice(0, 2).map((s) => (
              <AlertCard
                key={`amber-${s.id}`}
                tone="warning"
                title={`${s.first_name} ${s.last_name[0]}. — Règlement à venir`}
                body={`Séance dans <72 h · Solde dû : ${Math.abs(s.balance_hours) * 30} €`}
                cta="Rappeler"
                onPress={() =>
                  sendReminder(s.id, `${s.first_name} ${s.last_name[0]}.`, s.balance_hours)
                }
              />
            ))}
            {overdueStudents.slice(0, 2).map((s) => (
              <AlertCard
                key={`red-${s.id}`}
                tone="danger"
                title={`${s.first_name} ${s.last_name[0]}. — Heures dépassées`}
                body={`Planifié ${s.hours_booked}h · Payé ${s.hours_paid}h — annulation auto si impayé 48 h avant`}
                cta="Relancer"
                onPress={() =>
                  sendReminder(s.id, `${s.first_name} ${s.last_name[0]}.`, s.balance_hours)
                }
              />
            ))}
          </>
        ) : null}

        <SectionLabel>Aperçu</SectionLabel>
        <KpiScroll
          items={[
            { icon: 'user', value: stats.active, label: 'Élèves actifs' },
            { icon: 'calendar', value: stats.lessonsThisWeek, label: 'Séances/sem' },
            { icon: 'alert', value: stats.overdue, label: 'Impayés', tone: stats.overdue > 0 ? 'danger' : 'default' },
            { icon: 'gift', value: stats.referrals, label: 'Parrainages', tone: 'warning' },
          ]}
        />

        <SectionLabel>Aujourd'hui — {todayLabel()}</SectionLabel>
        <View className="px-5 gap-1.5">
          {todayLoading ? (
            <>
              <SkeletonCard height={48} />
              <SkeletonCard height={48} />
            </>
          ) : today.length === 0 ? (
            <Text className="text-muted2 text-xs">
              Aucune séance aujourd'hui — passe au planning pour ouvrir des créneaux.
            </Text>
          ) : (
            today.map((l: Lesson, i: number) => {
              const studentName = (l as unknown as {
                students?: { profiles?: { first_name: string; last_name: string } | null } | null;
              }).students?.profiles;
              const studentBalance = l.student_id ? balanceById.get(l.student_id) ?? 0 : 0;
              const isCritical =
                l.student_id != null &&
                isLessonCritical({
                  balanceHours: studentBalance,
                  scheduledAt: l.scheduled_at,
                  status: l.status,
                  now,
                });
              const status = isCritical
                ? 'critical'
                : l.student_id === null
                  ? 'free'
                  : l.status === 'confirmed' || l.status === 'completed'
                    ? 'confirmed'
                    : l.status === 'pending'
                      ? 'pending'
                      : 'critical';
              return (
                <FadeInItem key={l.id} index={i}>
                  <TodayLessonItem
                    time={formatTime(l.scheduled_at)}
                    name={
                      studentName
                        ? `${studentName.first_name} ${studentName.last_name[0]}.`
                        : 'Créneau libre'
                    }
                    subtitle={
                      isCritical
                        ? `${typeLabel(l.type)} · Annulation auto si impayé`
                        : typeLabel(l.type)
                    }
                    status={status}
                  />
                </FadeInItem>
              );
            })
          )}
        </View>

        <View className="px-5 flex-row items-center justify-between pt-3 pb-1.5">
          <Text className="text-muted2 text-[10px] font-bold uppercase tracking-wider">
            Mes élèves · par solde ↓
          </Text>
          <Pressable
            onPress={() => setInviteOpen(true)}
            className="bg-instructor/15 px-3 py-1 rounded-full"
          >
            <Text className="text-instructor text-[11px] font-bold">+ Inviter</Text>
          </Pressable>
        </View>
        <View className="px-5 gap-1.5">
          {studentsLoading ? (
            <>
              <SkeletonCard height={52} />
              <SkeletonCard height={52} />
              <SkeletonCard height={52} />
            </>
          ) : studentsError && students.length === 0 ? (
            <ErrorState
              what="tes élèves"
              onRetry={() => refetchStudents()}
              retrying={studentsFetching}
            />
          ) : students.length === 0 ? (
            <EmptyState
              icon="users"
              title="Aucun élève pour le moment"
              body="Invite ton premier élève par email pour démarrer."
              cta="+ Inviter un élève"
              onPress={() => setInviteOpen(true)}
              variant="instructor"
            />
          ) : (
            students.map((s, i) => {
              const tone: 'danger' | 'success' | 'neutral' =
                s.balance_hours < 0 ? 'danger' : s.balance_hours > 0 ? 'success' : 'neutral';
              const balanceLabel =
                s.balance_hours === 0
                  ? '0h'
                  : s.balance_hours > 0
                    ? `+${s.balance_hours}h`
                    : `${s.balance_hours}h`;
              return (
                <FadeInItem key={s.id} index={i}>
                  <Pressable onPress={() => router.push(`/(instructor)/student/${s.id}`)}>
                    <StudentRow
                      initials={`${s.first_name[0] ?? ''}${s.last_name[0] ?? ''}`}
                      name={`${s.first_name} ${s.last_name}`}
                      subtitle={`Forfait ${s.package_total_hours}h · ${s.hours_booked}h planifiées · ${s.hours_paid}h payées`}
                      balance={balanceLabel}
                      balanceTone={tone}
                    />
                  </Pressable>
                </FadeInItem>
              );
            })
          )}
        </View>
      </ScrollView>
      <InviteStudentSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </SafeAreaView>
  );
}
