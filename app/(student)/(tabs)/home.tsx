import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
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
import { EmptyState } from '../../../components/shared/EmptyState';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { useStudentBalance, useStudentPackage } from '../../../hooks/useBalance';
import { useRefresh } from '../../../hooks/useRefresh';
import {
  useUpcomingLessonForStudent,
  useUpcomingEvaluation,
  useLastFeedbackForStudent,
} from '../../../hooks/useLessons';

const TYPE_LABEL: Record<string, string> = {
  city: 'Ville',
  highway: 'Autoroute',
  parking: 'Parking',
  evaluation: 'Évaluation',
  mock_exam: 'Examen blanc',
  other: 'Autre',
};

function formatLessonTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const HOURLY_RATE_EUR = 30;

export default function StudentHome() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const { data: balance } = useStudentBalance();
  const { data: pkg } = useStudentPackage();
  const { data: nextLesson } = useUpcomingLessonForStudent();
  const { data: evaluation } = useUpcomingEvaluation();
  const { data: lastFeedback } = useLastFeedbackForStudent();
  const [linkOpen, setLinkOpen] = useState(false);
  const { refreshing, onRefresh } = useRefresh([
    'student-balance',
    'student-package',
    'next-lesson',
    'eval',
    'last-feedback',
  ]);

  const owed = balance && balance.balance_hours < 0 ? Math.abs(balance.balance_hours) * HOURLY_RATE_EUR : 0;
  const totalHours = pkg?.package_total_hours ?? 0;
  const doneHours = balance ? Math.max(0, balance.hours_booked) : 0;
  const noInstructor = pkg && !pkg.instructor_id;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
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
          <Avatar
            initials={`${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`}
            variant="student"
            url={profile?.avatar_url ?? undefined}
          />
        </View>

        {noInstructor ? (
          <AlertCard
            tone="instructor"
            title="🚗 Lie ton moniteur"
            body="Pour voir ton planning et réserver, lie ton compte au moniteur qui t'a invité."
            cta="Lier maintenant"
            onPress={() => setLinkOpen(true)}
          />
        ) : null}

        {owed > 0 ? (
          <PaymentBanner
            amountEuros={owed}
            onPay={() => Alert.alert('Paiement', 'Boutique → packs (Sprint 4)')}
          />
        ) : null}

        <AlertCard
          tone="warning"
          title="⏱ Règle 48h"
          body="Tout solde impayé 48h avant la séance = annulation automatique."
        />

        {evaluation ? (
          <View className="mx-5 mb-2 bg-instructor/10 border border-instructor/25 rounded-2xl px-3 py-3 flex-row items-center gap-2.5">
            <Text className="text-base">📋</Text>
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
            icon="🔒"
            title="Évaluation de conduite"
            subtitle="En attente de planification par votre monitrice"
          />
        )}

        <SectionLabel>Ma progression</SectionLabel>
        <ProgressBar done={doneHours} total={totalHours || 20} />

        <SectionLabel>Prochain rendez-vous</SectionLabel>
        <View className="px-5">
          {nextLesson ? (
            <NextLessonCard
              number={1}
              type={TYPE_LABEL[(nextLesson as { type: string }).type] ?? 'Séance'}
              time={formatLessonTime((nextLesson as { scheduled_at: string }).scheduled_at)}
              instructor="Moniteur"
              status={
                (nextLesson as { status: string }).status === 'confirmed' ? 'confirmed' : 'pending'
              }
            />
          ) : (
            <EmptyState
              icon="📅"
              title="Aucune séance à venir"
              body="Réserve un créneau auprès de ton moniteur depuis le planning."
              variant="student"
            />
          )}
        </View>

        <SectionLabel>Dernier retour</SectionLabel>
        {lastFeedback ? (
          <FeedbackCard
            author="Monitrice"
            date={new Date(lastFeedback.scheduled_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            body={lastFeedback.feedback}
            rating={lastFeedback.rating ?? 0}
          />
        ) : (
          <FeedbackCard
            author="Monitrice"
            date="—"
            body="Aucun retour pour le moment. Tes commentaires post-séance apparaîtront ici."
            rating={0}
          />
        )}
      </ScrollView>

      <LinkInstructorSheet visible={linkOpen} onClose={() => setLinkOpen(false)} />
    </SafeAreaView>
  );
}
