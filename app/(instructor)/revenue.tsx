import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { Badge } from '../../components/ui/Badge';
import { useInstructorRevenue } from '../../hooks/useInstructorRevenue';

function euros(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}

const STATUS_TONE: Record<string, 'student' | 'warning' | 'danger' | 'neutral'> = {
  succeeded: 'student',
  pending: 'warning',
  failed: 'danger',
  refunded: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  succeeded: 'Payé',
  pending: 'En attente',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

export default function Revenue() {
  const { data } = useInstructorRevenue();
  const payments = data?.payments ?? [];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Mes revenus" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* récap */}
        <View className="flex-row gap-2 px-5 mt-3">
          <View className="flex-1 bg-card border border-border rounded-2xl px-3 py-3">
            <Text className="text-muted2 text-[9px] uppercase tracking-wider">Encaissé net</Text>
            <Text className="text-student text-2xl font-bold mt-1">
              {euros(data?.netCents ?? 0)} €
            </Text>
            <Text className="text-muted2 text-[10px] mt-0.5">après commission 15 %</Text>
          </View>
          <View className="flex-1 bg-card border border-border rounded-2xl px-3 py-3">
            <Text className="text-muted2 text-[9px] uppercase tracking-wider">Volume brut</Text>
            <Text className="text-text text-2xl font-bold mt-1">
              {euros(data?.grossCents ?? 0)} €
            </Text>
            <Text className="text-muted2 text-[10px] mt-0.5">{data?.count ?? 0} paiements</Text>
          </View>
        </View>

        <SectionLabel>Historique des paiements</SectionLabel>
        {payments.length === 0 ? (
          <Text className="text-muted2 text-xs px-5">
            Aucun paiement pour le moment. Les achats de tes élèves apparaîtront ici.
          </Text>
        ) : (
          payments.map((p) => (
            <View
              key={p.id}
              className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-text text-sm font-bold">
                  {p.student_name} · {p.hours_purchased}h
                </Text>
                <Text className="text-muted2 text-[10px] mt-0.5">
                  {new Date(p.paid_at ?? p.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {p.plan === 'three_x' ? ' · 3×' : ''}
                </Text>
              </View>
              <View className="items-end gap-1">
                <Text className="text-text text-sm font-bold">{euros(p.amount_cents)} €</Text>
                <Badge label={STATUS_LABEL[p.status] ?? p.status} tone={STATUS_TONE[p.status] ?? 'neutral'} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
