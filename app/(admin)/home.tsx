import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { confirmSignOut } from '../../hooks/useAuth';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { AppFooter } from '../../components/shared/AppFooter';

export default function AdminHome() {
  const router = useRouter();
  const { data: pending = 0 } = useQuery({
    queryKey: ['admin-pending-instructors'],
    queryFn: async () => {
      const { count } = await supabase
        .from('instructors')
        .select('id', { count: 'exact', head: true })
        .eq('is_verified', false);
      return count ?? 0;
    },
  });
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: users },
        { count: lessons },
        { count: payments },
        { data: revenue },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'succeeded'),
        supabase.from('payments').select('amount_cents').eq('status', 'succeeded'),
      ]);
      const totalCents = (revenue ?? []).reduce(
        (acc, p) => acc + ((p as { amount_cents: number }).amount_cents ?? 0),
        0
      );
      return {
        users: users ?? 0,
        lessons: lessons ?? 0,
        payments: payments ?? 0,
        revenueEur: Math.round(totalCents / 100),
      };
    },
  });

  const { data: lastPayments = [] } = useQuery({
    queryKey: ['admin-last-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, student_id, hours_purchased, amount_cents, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      return (data ?? []) as {
        id: string;
        student_id: string;
        hours_purchased: number;
        amount_cents: number;
        status: string;
        created_at: string;
      }[];
    },
  });

  async function refund(paymentId: string) {
    Alert.alert('Confirmer le remboursement', 'Action irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rembourser',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.functions.invoke('admin-refund', {
            body: { payment_id: paymentId },
          });
          if (error) Alert.alert('Erreur', error.message);
          else Alert.alert('OK', 'Remboursement effectué.');
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-3 pb-2 flex-row justify-between items-center">
          <Text className="text-text text-xl font-bold">Admin</Text>
          <Text className="text-warning text-[10px] font-bold uppercase">Back-office</Text>
        </View>

        <SectionLabel>Vue d'ensemble</SectionLabel>
        <View className="flex-row flex-wrap gap-2 px-5">
          <Stat label="Utilisateurs" value={String(stats?.users ?? '—')} />
          <Stat label="Séances" value={String(stats?.lessons ?? '—')} />
          <Stat label="Paiements OK" value={String(stats?.payments ?? '—')} />
          <Stat label="CA (€)" value={String(stats?.revenueEur ?? '—')} />
        </View>

        <SectionLabel>Modération</SectionLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Validation moniteurs"
          onPress={() => router.push('/(admin)/instructors')}
          className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3 flex-row justify-between items-center"
        >
          <View className="flex-1">
            <Text className="text-text text-sm font-bold">🛡 Validation moniteurs</Text>
            <Text className="text-muted2 text-[10px] mt-0.5">
              Vérifier l'agrément avant activation
            </Text>
          </View>
          {pending > 0 ? (
            <View className="bg-warning/20 px-2.5 py-1 rounded-full mr-2">
              <Text className="text-warning text-[11px] font-bold">{pending}</Text>
            </View>
          ) : null}
          <Text className="text-muted2 text-base">›</Text>
        </Pressable>

        <SectionLabel>Derniers paiements</SectionLabel>
        {lastPayments.map((p) => (
          <View
            key={p.id}
            className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row justify-between items-center"
          >
            <View className="flex-1">
              <Text className="text-text text-sm font-medium">
                {p.hours_purchased}h · {(p.amount_cents / 100).toFixed(2)} €
              </Text>
              <Text className="text-muted2 text-[10px] mt-0.5">
                {new Date(p.created_at).toLocaleString('fr-FR')} · {p.status}
              </Text>
            </View>
            {p.status === 'succeeded' ? (
              <Pressable
                onPress={() => refund(p.id)}
                className="bg-danger/15 px-3 py-1.5 rounded-xl"
              >
                <Text className="text-danger text-[11px] font-bold">Refund</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <View className="px-5 mt-4">
          <Button label="Se déconnecter" onPress={confirmSignOut} variant="danger" />
        </View>

        <AppFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[42%] bg-card border border-border rounded-2xl px-3 py-3">
      <Text className="text-muted2 text-[9px] uppercase tracking-wider">{label}</Text>
      <Text className="text-text text-lg font-bold mt-0.5">{value}</Text>
    </View>
  );
}
