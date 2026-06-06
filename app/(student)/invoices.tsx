import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { SkeletonList } from '../../components/shared/Skeleton';
import { FadeInItem } from '../../components/shared/Animated';
import { useStudentInvoices } from '../../hooks/useInvoices';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Conversion HTML → PDF côté mobile via expo-print : pas de service externe,
// le système ouvre nativement un aperçu / dialogue d'enregistrement.
// Fallback sur l'ouverture HTML brute si le module n'est pas dispo.
async function presentInvoice(html: string) {
  try {
    const Print = require('expo-print') as typeof import('expo-print');
    await Print.printAsync({ html });
    return;
  } catch {
    // module absent ou non supporté → fallback HTML
  }
  const dataUri = 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(html)));
  await Linking.openURL(dataUri);
}

export default function StudentInvoices() {
  const profile = useAuthStore((s) => s.profile);
  const { data: invoices = [] } = useStudentInvoices();
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['my-payments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount_cents, hours_purchased, status, paid_at, created_at')
        .eq('student_id', profile!.id)
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false });
      return (data ?? []) as {
        id: string;
        amount_cents: number;
        hours_purchased: number;
        status: string;
        paid_at: string | null;
        created_at: string;
      }[];
    },
  });

  async function openInvoice(paymentId: string) {
    setGenerating(paymentId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!baseUrl) throw new Error('SUPABASE_URL manquant');
      const res = await fetch(`${baseUrl}/functions/v1/invoice-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const html = await res.text();
      await presentInvoice(html);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Mes factures" />

      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}>
        {isLoading ? (
          <SkeletonList count={4} />
        ) : payments.length === 0 ? (
          <Text className="text-muted2 text-xs px-5 mt-3">Aucun paiement.</Text>
        ) : (
          payments.map((p, idx) => {
            const inv = invoices.find((i) => i.payment_id === p.id);
            return (
              <FadeInItem
                key={p.id}
                index={idx}
                className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3"
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-text text-sm font-bold">
                      {inv?.number ?? 'Facture en attente'}
                    </Text>
                    <Text className="text-muted2 text-[10px] mt-0.5">
                      {new Date(p.paid_at ?? p.created_at).toLocaleDateString('fr-FR')} · {p.hours_purchased}h ·{' '}
                      {(p.amount_cents / 100).toFixed(2)} € TTC
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => openInvoice(p.id)}
                    disabled={generating === p.id}
                    className="bg-instructor/15 px-3 py-2 rounded-xl"
                  >
                    <Text className="text-instructor text-[11px] font-bold">
                      {generating === p.id ? '…' : 'Voir'}
                    </Text>
                  </Pressable>
                </View>
              </FadeInItem>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
