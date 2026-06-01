import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { PackCard } from '../../../components/student/PackCard';
import { PaymentSheet } from '../../../components/student/PaymentSheet';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { useStudentPackage } from '../../../hooks/useBalance';
import { useReferralStats } from '../../../hooks/useReferrals';
import { useLinkedInstructorInfo } from '../../../hooks/useStripeConnect';
import { track } from '../../../lib/observability';
import type { IconName } from '../../../components/ui/Icon';

type Pack = {
  hours: number;
  price: number;
  title: string;
  subtitle: string;
  unit: string;
  icon: IconName;
  tone: 'student' | 'instructor' | 'warning';
};

const PACKS: Pack[] = [
  {
    hours: 1,
    price: 30,
    title: '1 heure',
    subtitle: 'Séance à l\'unité',
    unit: 'Tarif standard',
    icon: 'car',
    tone: 'student',
  },
  {
    hours: 5,
    price: 140,
    title: '5 heures',
    subtitle: 'Économisez 10 €',
    unit: '28 €/h',
    icon: 'star',
    tone: 'instructor',
  },
  {
    hours: 10,
    price: 250,
    title: '10 heures',
    subtitle: 'Meilleure offre',
    unit: '25 €/h · −50 €',
    icon: 'flame',
    tone: 'warning',
  },
];

export default function StudentShop() {
  const { data: pkg } = useStudentPackage();
  const { data: refStats } = useReferralStats();
  const { data: instructorInfo } = useLinkedInstructorInfo(pkg?.instructor_id ?? null);
  const instructorVerified = !!instructorInfo?.is_verified;
  const [selected, setSelected] = useState<Pack | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-3 pb-2">
          <Text className="text-text text-xl font-bold">Boutique</Text>
        </View>

        <SectionLabel>Acheter des heures</SectionLabel>
        {PACKS.map((p) => (
          <PackCard
            key={p.hours}
            icon={p.icon}
            title={p.title}
            subtitle={p.subtitle}
            price={`${p.price} €`}
            unit={p.unit}
            tone={p.tone}
            onPress={() => setSelected(p)}
          />
        ))}

        <SectionLabel>Mon code parrainage</SectionLabel>
        <View className="mx-5 mb-2 bg-student/8 border border-student/20 rounded-2xl px-3 py-3">
          <Text className="text-text text-sm font-bold mb-1">Partage & gagne</Text>
          <Text className="text-muted text-[11px] leading-5 mb-3">
            1 ami inscrit avec ton code = 1 séance offerte OU −50 € sur le prochain forfait.
          </Text>
          <View className="bg-bg border border-border rounded-xl px-3 py-2.5 flex-row justify-between items-center mb-2.5">
            <Text className="text-student2 font-mono text-base tracking-wider">
              {pkg?.referral_code ?? '—'}
            </Text>
            <Text
              onPress={async () => {
                const code = pkg?.referral_code ?? '';
                if (!code) return;
                await Clipboard.setStringAsync(code);
                track('referral_code_copied');
                Alert.alert('Copié', `Code ${code} copié dans le presse-papiers.`);
              }}
              className="bg-student rounded-md px-3 py-1 text-[11px] font-bold text-[#0a1a14]"
            >
              Copier
            </Text>
          </View>
          <View className="flex-row gap-1.5">
            <Stat label="Parrainés" value={String(refStats?.count ?? 0)} />
            <Stat label="Séance gagnée" value={String(refStats?.free_lessons ?? 0)} />
            <Stat
              label="Remise dispo"
              value={refStats?.discount_eur ? `−${refStats.discount_eur}€` : '—'}
            />
          </View>
        </View>
      </ScrollView>

      {selected ? (
        <PaymentSheet
          visible={!!selected}
          onClose={() => setSelected(null)}
          packLabel={`${selected.title} — ${selected.subtitle}`}
          hours={selected.hours}
          amountEur={selected.price}
          instructorVerified={instructorVerified}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-bg rounded-xl py-2 items-center">
      <Text className="text-student2 text-base font-bold">{value}</Text>
      <Text className="text-muted2 text-[9px] uppercase tracking-wider mt-0.5">{label}</Text>
    </View>
  );
}
