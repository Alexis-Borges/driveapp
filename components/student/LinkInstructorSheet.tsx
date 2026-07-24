import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useLinkInstructorByCode, useLinkInstructorByEmail } from '../../hooks/useProfile';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LinkInstructorSheet({ visible, onClose }: Props) {
  // Le code est le chemin nominal ; l'email reste accessible d'un tap pour
  // les élèves invités avant l'introduction des codes.
  const [mode, setMode] = useState<'code' | 'email'>('code');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const linkByCode = useLinkInstructorByCode();
  const linkByEmail = useLinkInstructorByEmail();
  const pending = linkByCode.isPending || linkByEmail.isPending;

  async function submit() {
    try {
      if (mode === 'code') {
        await linkByCode.mutateAsync(code);
      } else {
        await linkByEmail.mutateAsync(email);
      }
      Alert.alert('Enseignant lié', 'Tu peux maintenant voir son planning et réserver.');
      setCode('');
      setEmail('');
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      Alert.alert('Liaison impossible', msg);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-lg font-bold mb-1">Rejoindre un enseignant</Text>

      {/* Les deux modes gardent des libellés de longueur comparable, tenant
          sur une ligne : la feuille est ancrée en bas et dimensionnée par son
          contenu, donc toute variation de hauteur ferait sauter tout le bloc. */}
      <Text className="text-muted text-xs mb-4" numberOfLines={1}>
        {mode === 'code'
          ? 'Saisis le code de ton enseignant.'
          : "Saisis l'email de ton enseignant."}
      </Text>

      {mode === 'code' ? (
        <TextField
          label="Code enseignant"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Ex. FERYEL55"
        />
      ) : (
        <TextField
          label="Email de l'enseignant"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="prenom@exemple.fr"
        />
      )}

      <Button
        label="Rejoindre"
        onPress={submit}
        loading={pending}
        variant="student"
        disabled={mode === 'code' ? !code.trim() : !email.trim()}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => setMode(mode === 'code' ? 'email' : 'code')}
        className="mt-3 py-2"
      >
        <Text className="text-muted2 text-[11px] text-center" numberOfLines={1}>
          {mode === 'code' ? 'Utiliser plutôt un email' : 'Utiliser plutôt un code'}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}
