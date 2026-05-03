import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useInviteStudentByEmail } from '../../hooks/useInviteStudent';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function InviteStudentSheet({ visible, onClose }: Props) {
  const [email, setEmail] = useState('');
  const invite = useInviteStudentByEmail();

  async function submit() {
    try {
      const res = await invite.mutateAsync(email);
      if (res.kind === 'linked') {
        Alert.alert('Élève rattaché', `${res.email} apparaît maintenant dans tes élèves.`);
      } else {
        Alert.alert('Lien partagé', 'L\'élève recevra un lien pour s\'inscrire.');
      }
      setEmail('');
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert('Invitation impossible', msg);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Inviter un élève</Text>
      <Text className="text-muted text-xs mb-4">
        S'il a déjà un compte, il est rattaché. Sinon, on partage un lien d'inscription.
      </Text>
      <TextField
        label="Email de l'élève"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        label="Inviter"
        variant="instructor"
        onPress={submit}
        loading={invite.isPending}
      />
    </BottomSheet>
  );
}
