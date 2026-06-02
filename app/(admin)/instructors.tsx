import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { useAdminInstructors, useVerifyInstructor } from '../../hooks/useAdminInstructors';

export default function AdminInstructors() {
  const [filter, setFilter] = useState<'unverified' | 'all'>('unverified');
  const { data: instructors = [], isLoading } = useAdminInstructors(filter);
  const verify = useVerifyInstructor();

  function toggle(id: string, name: string, current: boolean) {
    const next = !current;
    Alert.alert(
      next ? `Valider ${name} ?` : `Retirer la validation de ${name} ?`,
      next
        ? `L'agrément sera marqué vérifié. Le moniteur pourra accepter des paiements.`
        : `Le moniteur ne pourra plus encaisser tant qu'il n'est pas re-vérifié.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: next ? 'Valider' : 'Retirer',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await verify.mutateAsync({ id, verified: next });
            } catch (e: unknown) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Validation moniteurs" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row gap-1.5 px-5 pt-3 pb-1">
          <Pressable
            onPress={() => setFilter('unverified')}
            className={`flex-1 py-2 rounded-xl border items-center ${
              filter === 'unverified' ? 'bg-warning/20 border-warning/40' : 'bg-card border-border'
            }`}
          >
            <Text className={filter === 'unverified' ? 'text-warning text-xs font-bold' : 'text-text text-xs'}>
              À valider
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('all')}
            className={`flex-1 py-2 rounded-xl border items-center ${
              filter === 'all' ? 'bg-instructor border-instructor' : 'bg-card border-border'
            }`}
          >
            <Text className={filter === 'all' ? 'text-white text-xs font-bold' : 'text-text text-xs'}>
              Tous
            </Text>
          </Pressable>
        </View>

        <SectionLabel>{instructors.length} moniteur(s)</SectionLabel>

        {isLoading ? (
          <Text className="text-muted2 text-xs px-5">Chargement…</Text>
        ) : instructors.length === 0 ? (
          <Text className="text-muted2 text-xs px-5">
            {filter === 'unverified' ? 'Aucun moniteur en attente. Tous validés ✓' : 'Aucun moniteur.'}
          </Text>
        ) : (
          instructors.map((i) => (
            <View
              key={i.id}
              className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3"
            >
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1">
                  <Text className="text-text text-sm font-bold">
                    {i.profile?.first_name} {i.profile?.last_name}
                  </Text>
                  <Text className="text-muted2 text-[10px] mt-0.5">{i.profile?.email}</Text>
                </View>
                <Badge
                  label={i.is_verified ? 'Vérifié ✓' : 'À valider'}
                  tone={i.is_verified ? 'student' : 'warning'}
                />
              </View>

              <View className="bg-card2 rounded-xl px-2.5 py-2 mb-2">
                <Text className="text-muted2 text-[9px] uppercase tracking-wider">N° Agrément</Text>
                <Text className="text-text text-sm font-mono">{i.agreement_number}</Text>
              </View>

              <View className="flex-row gap-2 mb-2">
                <Detail label="Téléphone" value={i.profile?.phone ?? '—'} />
                <Detail label="Zone" value={i.zone_geo ?? '—'} />
                <Detail
                  label="Exp."
                  value={i.experience_years ? `${i.experience_years} ans` : '—'}
                />
              </View>

              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-muted2 text-[10px]">
                  Stripe : {i.stripe_account_id ? '✓ connecté' : '✗ non lié'}
                </Text>
                <Text className="text-muted2 text-[10px]">
                  Inscrit {new Date(i.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>

              <Button
                label={i.is_verified ? 'Retirer la validation' : 'Valider l\'agrément'}
                variant={i.is_verified ? 'danger' : 'instructor'}
                onPress={() =>
                  toggle(
                    i.id,
                    `${i.profile?.first_name ?? ''} ${i.profile?.last_name ?? ''}`,
                    i.is_verified
                  )
                }
                loading={verify.isPending}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-card2 rounded-xl px-2.5 py-2">
      <Text className="text-muted2 text-[8px] uppercase tracking-wider">{label}</Text>
      <Text className="text-text text-[11px] font-medium mt-0.5">{value}</Text>
    </View>
  );
}
