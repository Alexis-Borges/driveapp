import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/shared/BottomSheet';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { Icon } from '../../components/ui/Icon';
import { useCreateLeave, useDeleteLeave, useInstructorLeaves } from '../../hooks/useLeaves';

function dayInDays(n: number, hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export default function Leaves() {
  const { data: leaves = [] } = useInstructorLeaves();
  const create = useCreateLeave();
  const del = useDeleteLeave();

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => dayInDays(1, 8));
  const [end, setEnd] = useState(() => dayInDays(1, 20));
  const [reason, setReason] = useState('');

  async function add() {
    if (end <= start) {
      Alert.alert('Plage invalide', 'La fin doit être après le début.');
      return;
    }
    try {
      await create.mutateAsync({
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        reason: reason.trim() || undefined,
      });
      setReason('');
      setOpen(false);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Supprimer ce congé ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Mes congés" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-muted text-xs px-5 mt-3 leading-5">
          Bloque des plages : aucun créneau récurrent ne sera créé pendant un congé,
          et les élèves verront ces plages comme indisponibles.
        </Text>

        <SectionLabel>Congés à venir ({leaves.length})</SectionLabel>
        {leaves.length === 0 ? (
          <Text className="text-muted2 text-xs px-5">Aucun congé planifié.</Text>
        ) : (
          leaves.map((l) => (
            <View
              key={l.id}
              className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-text text-sm font-bold">
                  {new Date(l.starts_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  →{' '}
                  {new Date(l.ends_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {l.reason ? (
                  <Text className="text-muted2 text-[10px] mt-0.5">{l.reason}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => confirmDelete(l.id)} className="ml-2">
                <Icon name="trash" size={16} color="#FF4F4F" />
              </Pressable>
            </View>
          ))
        )}

        <View className="px-5 mt-4">
          <Button label="+ Ajouter un congé" variant="instructor" onPress={() => setOpen(true)} />
        </View>
      </ScrollView>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text className="text-text text-base font-bold mb-1">Nouveau congé</Text>
        <Text className="text-muted text-xs mb-3">Choisis une plage rapide.</Text>

        <View className="flex-row gap-1.5 mb-3">
          <Pressable
            onPress={() => {
              setStart(dayInDays(1, 0));
              setEnd(dayInDays(1, 23));
            }}
            className="flex-1 py-2 rounded-xl bg-card border border-border items-center"
          >
            <Text className="text-text text-xs font-bold">Demain</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStart(dayInDays(7, 0));
              setEnd(dayInDays(14, 23));
            }}
            className="flex-1 py-2 rounded-xl bg-card border border-border items-center"
          >
            <Text className="text-text text-xs font-bold">1 semaine</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStart(dayInDays(7, 0));
              setEnd(dayInDays(21, 23));
            }}
            className="flex-1 py-2 rounded-xl bg-card border border-border items-center"
          >
            <Text className="text-text text-xs font-bold">2 semaines</Text>
          </Pressable>
        </View>

        <View className="bg-card2 border border-border rounded-2xl px-3 py-3 mb-3">
          <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-0.5">Du</Text>
          <Text className="text-text text-sm font-medium">
            {start.toLocaleString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <View className="h-2" />
          <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-0.5">Au</Text>
          <Text className="text-text text-sm font-medium">
            {end.toLocaleString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Motif (optionnel) — vacances, formation…"
          placeholderTextColor="#454B57"
          className="bg-card2 border border-border rounded-2xl px-3 py-2.5 text-text mb-3"
        />

        <Button label="Bloquer" variant="instructor" onPress={add} loading={create.isPending} />
      </BottomSheet>
    </SafeAreaView>
  );
}
