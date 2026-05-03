import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/student/ProgressBar';
import { SectionLabel } from '../../../components/shared/SectionLabel';

type StudentDetail = {
  id: string;
  package_total_hours: number;
  package_started_at: string | null;
  referral_code: string;
  profile: { first_name: string; last_name: string; email: string; phone: string | null; avatar_url: string | null } | null;
  balance: { hours_paid: number; hours_booked: number; balance_hours: number } | null;
};

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['student-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<StudentDetail | null> => {
      const { data: student } = await supabase
        .from('students')
        .select('id, package_total_hours, package_started_at, referral_code, profiles(first_name, last_name, email, phone, avatar_url)')
        .eq('id', id!)
        .maybeSingle();
      if (!student) return null;
      const { data: balance } = await supabase
        .from('student_balance')
        .select('hours_paid, hours_booked, balance_hours')
        .eq('student_id', id!)
        .maybeSingle();
      const s = student as unknown as {
        id: string;
        package_total_hours: number;
        package_started_at: string | null;
        referral_code: string;
        profiles: StudentDetail['profile'];
      };
      return {
        id: s.id,
        package_total_hours: s.package_total_hours,
        package_started_at: s.package_started_at,
        referral_code: s.referral_code,
        profile: s.profiles,
        balance: balance as StudentDetail['balance'],
      };
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['student-payments', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount_cents, hours_purchased, status, paid_at, plan, created_at')
        .eq('student_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data ?? []) as {
        id: string;
        amount_cents: number;
        hours_purchased: number;
        status: string;
        paid_at: string | null;
        plan: string;
        created_at: string;
      }[];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['student-lessons-recent', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons')
        .select('id, scheduled_at, status, type, rating, feedback')
        .eq('student_id', id!)
        .order('scheduled_at', { ascending: false })
        .limit(20);
      return (data ?? []) as {
        id: string;
        scheduled_at: string;
        status: string;
        type: string;
        rating: number | null;
        feedback: string | null;
      }[];
    },
  });

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <Text className="text-muted text-xs px-5 mt-6">Chargement…</Text>
      </SafeAreaView>
    );
  }

  const initials = data.profile
    ? `${data.profile.first_name[0] ?? ''}${data.profile.last_name[0] ?? ''}`
    : '?';
  const balance = data.balance?.balance_hours ?? 0;
  const balanceTone = balance < 0 ? 'danger' : balance > 0 ? 'student' : 'neutral';
  const balanceLabel =
    balance === 0 ? '0h' : balance > 0 ? `+${balance}h` : `${balance}h`;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
          >
            <Text className="text-muted text-sm">‹</Text>
          </Pressable>
          <Text className="text-text text-base font-bold">Détail élève</Text>
        </View>

        <View className="items-center pt-5 pb-2 gap-2">
          <Avatar
            initials={initials}
            variant="student"
            size={72}
            url={data.profile?.avatar_url ?? undefined}
          />
          <Text className="text-text text-lg font-bold">
            {data.profile?.first_name} {data.profile?.last_name}
          </Text>
          <Text className="text-muted text-xs">{data.profile?.email}</Text>
          <Badge label={balanceLabel} tone={balanceTone} />
        </View>

        <SectionLabel>Progression</SectionLabel>
        <ProgressBar
          done={data.balance?.hours_booked ?? 0}
          total={data.package_total_hours || 20}
        />

        <View className="px-5">
          <Button
            label="💬 Envoyer un message"
            variant="instructor"
            onPress={() => router.push(`/(instructor)/chat/${id}`)}
          />
        </View>

        <SectionLabel>Paiements ({payments.length})</SectionLabel>
        {payments.length === 0 ? (
          <Text className="text-muted2 text-xs px-5">Aucun paiement.</Text>
        ) : (
          payments.map((p) => (
            <View
              key={p.id}
              className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row justify-between"
            >
              <View>
                <Text className="text-text text-sm font-medium">
                  {p.hours_purchased}h · {(p.amount_cents / 100).toFixed(0)} €
                </Text>
                <Text className="text-muted2 text-[10px] mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('fr-FR')} · {p.plan}
                </Text>
              </View>
              <Badge
                label={p.status}
                tone={
                  p.status === 'succeeded'
                    ? 'student'
                    : p.status === 'failed'
                      ? 'danger'
                      : 'warning'
                }
              />
            </View>
          ))
        )}

        <SectionLabel>Séances récentes ({lessons.length})</SectionLabel>
        {lessons.length === 0 ? (
          <Text className="text-muted2 text-xs px-5">Aucune séance.</Text>
        ) : (
          lessons.map((l) => (
            <View
              key={l.id}
              className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5"
            >
              <View className="flex-row justify-between">
                <Text className="text-text text-sm font-medium">
                  {new Date(l.scheduled_at).toLocaleString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Badge
                  label={l.status}
                  tone={
                    l.status === 'completed' || l.status === 'confirmed'
                      ? 'student'
                      : l.status === 'pending'
                        ? 'warning'
                        : 'danger'
                  }
                />
              </View>
              {l.feedback ? (
                <Text className="text-muted text-[11px] mt-1.5 leading-5">{l.feedback}</Text>
              ) : null}
              {l.rating ? (
                <Text className="text-warning text-xs mt-1">
                  {'★'.repeat(l.rating)}{'☆'.repeat(5 - l.rating)}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
