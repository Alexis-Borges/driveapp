import { useState, useEffect } from 'react';
import { Alert, Text } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useAuthStore } from '../../stores/authStore';
import { useInstructorSelf, useUpdateInstructorSelf } from '../../hooks/useInstructorSelf';

type Props = {
  visible: boolean;
  onClose: () => void;
  variant: 'instructor' | 'student';
};

export function EditProfileSheet({ visible, onClose, variant }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const { data: instr } = useInstructorSelf();
  const updateProfile = useUpdateProfile();
  const updateInstr = useUpdateInstructorSelf();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [zone, setZone] = useState('');
  const [exp, setExp] = useState('');

  useEffect(() => {
    if (visible && profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPhone(profile.phone ?? '');
      setBio(profile.bio ?? '');
    }
  }, [visible, profile]);

  useEffect(() => {
    if (visible && variant === 'instructor' && instr) {
      setZone(instr.zone_geo ?? '');
      setExp(instr.experience_years ? String(instr.experience_years) : '');
    }
  }, [visible, variant, instr]);

  async function save() {
    try {
      await updateProfile.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        bio: bio || undefined,
      });
      if (variant === 'instructor') {
        const expNum = exp.trim() ? parseInt(exp, 10) : null;
        await updateInstr.mutateAsync({
          zone_geo: zone.trim() || null,
          experience_years: Number.isFinite(expNum) ? expNum : null,
        });
      }
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert('Mise à jour impossible', msg);
    }
  }

  const saving = updateProfile.isPending || updateInstr.isPending;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Modifier mon profil</Text>
      <Text className="text-muted text-xs mb-4">Tes informations personnelles</Text>
      {/* Pas de ScrollView ici : BottomSheet en fournit déjà un. Deux scrolls
          verticaux imbriqués se disputent le geste et le champ Description
          devenait difficile à atteindre. */}
      <>
        <TextField label="Prénom" value={firstName} onChangeText={setFirstName} />
        <TextField label="Nom" value={lastName} onChangeText={setLastName} />
        <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {variant === 'instructor' ? (
          <>
            <TextField
              label="Zone géographique"
              value={zone}
              onChangeText={setZone}
              placeholder="Ex : Île-de-France"
            />
            <TextField
              label="Années d'expérience"
              value={exp}
              onChangeText={setExp}
              keyboardType="number-pad"
              placeholder="Ex : 8"
            />
          </>
        ) : null}
        <TextField label="Description" value={bio} onChangeText={setBio} multiline />
      </>
      <Button
        label="Enregistrer"
        onPress={save}
        loading={saving}
        variant={variant}
      />
    </BottomSheet>
  );
}
