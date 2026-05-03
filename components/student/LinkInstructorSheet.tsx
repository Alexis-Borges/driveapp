import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useLinkInstructorByCode } from '../../hooks/useProfile';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LinkInstructorSheet({ visible, onClose }: Props) {
  const [email, setEmail] = useState('');
  const link = useLinkInstructorByCode();

  async function submit() {
    try {
      await link.mutateAsync(email);
      Alert.alert('Moniteur lié', 'Tu peux maintenant voir son planning.');
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert('Liaison impossible', msg);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Lier un moniteur</Text>
      <Text className="text-muted text-xs mb-4">
        Entre l'email du moniteur qui t'a invité.
      </Text>
      <TextField
        label="Email du moniteur"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button label="Lier" onPress={submit} loading={link.isPending} variant="student" />
    </BottomSheet>
  );
}
