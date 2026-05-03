import { useState, useEffect } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  variant: 'instructor' | 'student';
};

export function EditProfileSheet({ visible, onClose, variant }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const update = useUpdateProfile();

  useEffect(() => {
    if (visible && profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
    }
  }, [visible, profile]);

  async function save() {
    try {
      await update.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        bio: bio || undefined,
      });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert('Mise à jour impossible', msg);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Modifier mon profil</Text>
      <Text className="text-muted text-xs mb-4">Tes informations personnelles</Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
        <TextField label="Prénom" value={firstName} onChangeText={setFirstName} />
        <TextField label="Nom" value={lastName} onChangeText={setLastName} />
        <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField label="Description" value={bio} onChangeText={setBio} multiline />
      </ScrollView>
      <Button
        label="Enregistrer"
        onPress={save}
        loading={update.isPending}
        variant={variant}
      />
    </BottomSheet>
  );
}
