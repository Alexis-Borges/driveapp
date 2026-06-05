import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/shared/BottomSheet';
import { SectionLabel } from '../../components/shared/SectionLabel';
import { ScreenHeader } from '../../components/shared/ScreenHeader';
import { Calendar } from '../../components/shared/Calendar';
import { Icon } from '../../components/ui/Icon';
import { useCreateLeave, useDeleteLeave, useInstructorLeaves } from '../../hooks/useLeaves';

export default function Leaves() {
  const { data: leaves = [] } = useInstructorLeaves();
  const create = useCreateLeave();
  const del = useDeleteLeave();

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [reason, setReason] = useState('');

  function resetForm() {
    setStart(null);
    setEnd(null);
    setReason('');
  }

  async function add() {
    if (!start) {
      Alert.alert('Choisis une date de début');
      return;
    }
    // Si une seule date est choisie, le congé couvre la journée entière.
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end ?? start);
    e.setHours(23, 59, 0, 0);
    try {
      await create.mutateAsync({
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        reason: reason.trim() || undefined,
      });
      resetForm();
      setOpen(false);
    } catch (err: unknown) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur');
    }
  }

  const rangeLabel = start
    ? end && end.getTime() !== start.getTime()
      ? `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
      : `${start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} (journée)`
    : 'Sélectionne une ou deux dates';

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
          <Button
            label="+ Ajouter un congé"
            variant="instructor"
            onPress={() => {
              resetForm();
              setOpen(true);
            }}
          />
        </View>
      </ScrollView>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text className="text-text text-base font-bold mb-1">Nouveau congé</Text>
        <Text className="text-muted text-xs mb-3">
          Tape une date pour une journée, ou deux dates pour une plage.
        </Text>

        <Calendar
          mode="range"
          rangeStart={start}
          rangeEnd={end}
          onRangeChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
          variant="instructor"
        />

        <View className="bg-card2 border border-border rounded-2xl px-3 py-2.5 my-3 flex-row items-center gap-2">
          <Icon name="calendar" size={16} color="#7C75FF" />
          <Text className="text-text text-sm font-medium flex-1">{rangeLabel}</Text>
        </View>

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Motif (optionnel) — vacances, formation…"
          placeholderTextColor="#454B57"
          className="bg-card2 border border-border rounded-2xl px-3 py-2.5 text-text mb-3"
        />

        <Button
          label="Bloquer ce congé"
          variant="instructor"
          onPress={add}
          loading={create.isPending}
          disabled={!start}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
