import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { useRgpdDelete, useRgpdExport } from '../../hooks/useRgpd';
import { signOut } from '../../hooks/useAuth';

export function RgpdSection() {
  const exportMut = useRgpdExport();
  const deleteMut = useRgpdDelete();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);

  async function doExport() {
    setBusy('export');
    try {
      const data = await exportMut.mutateAsync();
      await Share.share({
        message: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        title: 'Export DriveApp',
      });
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Supprimer mon compte ?',
      'Cette action est définitive. Tes paiements et factures sont conservés 10 ans (obligation comptable) mais anonymisés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await deleteMut.mutateAsync();
              await signOut();
              Alert.alert('Compte supprimé', 'Tes données ont été effacées.');
            } catch (e: unknown) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View className="mx-5 mt-2 bg-card border border-border rounded-2xl px-3 py-3">
      <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-2">Données personnelles (RGPD)</Text>
      <Pressable
        onPress={doExport}
        disabled={busy !== null}
        className="py-2 border-b border-border flex-row justify-between items-center"
      >
        <Text className="text-text text-[12px]">Exporter mes données (JSON)</Text>
        <Text className="text-muted2 text-[11px]">{busy === 'export' ? '…' : '→'}</Text>
      </Pressable>
      <Pressable
        onPress={confirmDelete}
        disabled={busy !== null}
        className="py-2 flex-row justify-between items-center"
      >
        <Text className="text-danger text-[12px]">Supprimer mon compte</Text>
        <Text className="text-danger text-[11px]">{busy === 'delete' ? '…' : '→'}</Text>
      </Pressable>
    </View>
  );
}
