import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Icon } from '../ui/Icon';
import { useInviteStudentByEmail, useShareInviteLink } from '../../hooks/useInviteStudent';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function InviteStudentSheet({ visible, onClose }: Props) {
  const [email, setEmail] = useState('');
  const invite = useInviteStudentByEmail();
  const share = useShareInviteLink();

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

  async function shareLink() {
    try {
      await share.mutateAsync();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Inviter un élève</Text>
      <Text className="text-muted text-xs mb-4">
        S'il a déjà un compte, il est rattaché. Sinon, un lien d'inscription est partagé.
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

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-border" />
        <Text className="text-muted2 text-[10px] mx-3 uppercase tracking-wider">ou</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Partager mon lien d'invitation"
        onPress={shareLink}
        className="bg-card2 border border-border rounded-2xl px-3 py-3 flex-row items-center gap-2"
      >
        <Icon name="link" size={18} color="#7C75FF" />
        <View className="flex-1">
          <Text className="text-text text-sm font-bold">Partager mon lien direct</Text>
          <Text className="text-muted2 text-[10px] mt-0.5">
            SMS, WhatsApp, email — l'élève sera lié à toi à l'inscription
          </Text>
        </View>
        <Text className="text-muted2 text-base">›</Text>
      </Pressable>
    </BottomSheet>
  );
}
