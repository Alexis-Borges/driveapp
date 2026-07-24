import { useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { AlertCard } from '../../../components/instructor/AlertCard';
import { PaymentBanner } from '../../../components/student/PaymentBanner';
import { ProgressBar } from '../../../components/student/ProgressBar';
import { NextLessonCard } from '../../../components/student/NextLessonCard';
import { FeedbackCard } from '../../../components/student/FeedbackCard';
import { LockedRow } from '../../../components/student/LockedRow';
import { LinkInstructorSheet } from '../../../components/student/LinkInstructorSheet';
import { LessonDetailSheet } from '../../../components/student/LessonDetailSheet';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Checklist } from '../../../components/shared/Checklist';
import { Icon } from '../../../components/ui/Icon';
import { KeyboardAwareScroll } from '../../../components/shared/KeyboardAwareScroll';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { useStudentBalance, useStudentPackage } from '../../../hooks/useBalance';
import { useRefresh } from '../../../hooks/useRefresh';
import { useLinkedInstructorInfo } from '../../../hooks/useStripeConnect';
import { ProfileCompletenessBanner } from '../../../components/shared/ProfileCompletenessBanner';
import { SkeletonCard } from '../../../components/shared/Skeleton';
import { useRealtimeLessons } from '../../../hooks/useRealtimeLessons';
import {
  useUpcomingLessonForStudent,
  useUpcomingEvaluation,
  useLastFeedbackForStudent,
  useNextFreeSlotForStudent,
  type Lesson,
} from '../../../hooks/useLessons';
import { typeLabel } from '../../../lib/lessons';
import { BookSlotSheet } from '../../../components/student/BookSlotSheet';
import { NotificationBell } from '../../../components/shared/NotificationBell';

function formatLessonTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StudentHome() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  useRealtimeLessons();
  const { data: balance } = useStudentBalance();
  const { data: pkg } = useStudentPackage();
  const { data: nextLesson, isLoading: nextLoading } = useUpcomingLessonForStudent();
  const { data: nextFreeSlot } = useNextFreeSlotForStudent(pkg?.instructor_id ?? null);
  const [bookingSlot, setBookingSlot] = useState<Lesson | null>(null);
  const { data: evaluation } = useUpcomingEvaluation();
  const { data: lastFeedback, isLoading: feedbackLoading } = useLastFeedbackForStudent();
  const { data: instructorInfo } = useLinkedInstructorInfo(pkg?.instructor_id ?? null);
  const instructorVerified = !!instructorInfo?.is_verified;
  const hourlyRate = instructorInfo?.hourly_rate ?? 30;
  const instructorName = instructorInfo?.full_name ?? 'Moniteur';
  const [linkOpen, setLinkOpen] = useState(false);
  const [detailLesson, setDetailLesson] = useState<unknown | null>(null);
  const { refreshing, onRefresh } = useRefresh([
    'student-balance',
    'student-package',
    'next-lesson',
    'eval',
    'last-feedback',
  ]);

  const owed = balance && balance.balance_hours < 0 ? Math.abs(balance.balance_hours) * hourlyRate : 0;
  const totalHours = pkg?.package_total_hours ?? 0;
  const doneHours = balance ? Math.max(0, balance.hours_booked) : 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAwareScroll
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C896" />
        }
      >
        <View className="px-5 pt-3 pb-2 flex-row items-start justify-between">
          <View>
            <Text className="text-muted text-[11px] uppercase tracking-wider">Bonjour,</Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              <Text className="text-text text-xl font-bold">
                {profile?.first_name} {profile?.last_name?.[0]}.
              </Text>
              <Badge label="Élève" tone="student" />
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <NotificationBell variant="student" />
            <Avatar
              initials={`${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`}
              variant="student"
              url={profile?.avatar_url ?? undefined}
            />
          </View>
        </View>

        <Checklist
          items={[
            {
              id: 'link',
              title: 'Rejoindre mon enseignant·e',
              done: !!pkg?.instructor_id,
              cta: 'Lier',
              onPress: () => setLinkOpen(true),
            },
            {
              id: 'pack',
              title: 'Acheter ton premier pack d\'heures',
              done: (balance?.hours_paid ?? 0) > 0,
              cta: 'Boutique',
              onPress: () => router.push('/(student)/shop'),
            },
            {
              id: 'book',
              title: 'Réserver ta première séance',
              done: !!nextLesson,
              cta: 'Planning',
              onPress: () => router.push('/(student)/planning'),
            },
          ]}
          variant="student"
        />

        <ProfileCompletenessBanner
          variant="student"
          onPress={() => router.push('/(student)/profile')}
        />

        {owed > 0 ? (
          <PaymentBanner
            amountEuros={owed}
            onPay={() => router.push('/(student)/shop')}
            disabled={!!pkg?.instructor_id && !instructorVerified}
            disabledReason={
              pkg?.instructor_id && !instructorVerified
                ? 'Ton enseignant·edoit activer Stripe pour recevoir les paiements.'
                : undefined
            }
          />
        ) : null}

        <AlertCard
          tone="warning"
          title="Règle 48h"
          body="Tout solde impayé 48h avant la séance = annulation automatique."
        />

        {evaluation ? (
          <View className="mx-5 mb-2 bg-instructor/10 border border-instructor/25 rounded-2xl px-3 py-3 flex-row items-center gap-2.5">
            <Icon name="clipboard" size={18} color="#7C75FF" />
            <View className="flex-1">
              <Text className="text-text text-sm font-medium">Évaluation planifiée</Text>
              <Text className="text-instructor text-[11px] mt-0.5">
                {new Date(evaluation.scheduled_at).toLocaleString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ) : (
          <LockedRow
            icon="lock"
            title="Évaluation de conduite"
            subtitle="En attente de planification par ton enseignant·e"
          />
        )}

        <SectionLabel>Ma progression</SectionLabel>
        <ProgressBar done={doneHours} total={totalHours || 20} />

        <SectionLabel>Prochain rendez-vous</SectionLabel>
        <View className="px-5">
          {nextLoading ? (
            <SkeletonCard height={64} />
          ) : nextLesson ? (
            <Pressable onPress={() => setDetailLesson(nextLesson as never)}>
              <NextLessonCard
                number={1}
                type={typeLabel((nextLesson as { type: string }).type)}
                time={formatLessonTime((nextLesson as { scheduled_at: string }).scheduled_at)}
                instructor={instructorName}
                status={
                  (nextLesson as { status: string }).status === 'confirmed' ? 'confirmed' : 'pending'
                }
              />
            </Pressable>
          ) : nextFreeSlot ? (
            // pas de séance réservée mais le moniteur a ouvert un créneau →
            // raccourci pour réserver directement depuis l'accueil.
            <Pressable
              onPress={() => setBookingSlot(nextFreeSlot)}
              className="bg-student/10 border border-student/30 rounded-2xl px-3 py-3 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-student/20 items-center justify-center">
                <Icon name="calendar" size={18} color="#00C896" />
              </View>
              <View className="flex-1">
                <Text className="text-text text-sm font-bold">
                  Prochain créneau libre
                </Text>
                <Text className="text-muted text-[11px] mt-0.5">
                  {formatLessonTime(nextFreeSlot.scheduled_at)} · {typeLabel(nextFreeSlot.type)}
                </Text>
              </View>
              <Text className="text-student text-[11px] font-bold">Réserver</Text>
            </Pressable>
          ) : (
            <EmptyState
              icon="calendar"
              title="Aucun créneau disponible"
              body="Ton enseignant·en'a pas encore ouvert de créneau libre. Tu seras notifié dès qu'il y en aura un."
              variant="student"
            />
          )}
        </View>

        <SectionLabel>Dernier retour</SectionLabel>
        {feedbackLoading ? (
          <SkeletonCard height={92} />
        ) : lastFeedback ? (
          <FeedbackCard
            author={instructorName}
            date={new Date(lastFeedback.scheduled_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            body={lastFeedback.feedback}
            rating={lastFeedback.rating ?? 0}
            lessonId={lastFeedback.id}
            studentComment={lastFeedback.student_comment ?? null}
          />
        ) : (
          <FeedbackCard
            author={instructorName}
            date="—"
            body="Aucun retour pour le moment. Tes commentaires post-séance apparaîtront ici."
            rating={0}
          />
        )}
      </KeyboardAwareScroll>

      <LinkInstructorSheet visible={linkOpen} onClose={() => setLinkOpen(false)} />
      <LessonDetailSheet
        visible={!!detailLesson}
        onClose={() => setDetailLesson(null)}
        lesson={detailLesson as never}
        instructorName={instructorName}
      />
      <BookSlotSheet
        visible={!!bookingSlot}
        onClose={() => setBookingSlot(null)}
        slot={bookingSlot}
        balanceHours={balance?.balance_hours ?? 0}
      />
    </SafeAreaView>
  );
}
