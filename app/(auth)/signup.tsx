import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../types/database';

export default function Signup() {
  const params = useLocalSearchParams<{ invitedBy?: string; role?: string }>();
  const invitedBy = params.invitedBy ?? null;
  const initialRole: UserRole =
    params.role === 'instructor' ? 'instructor' : 'student';
  const [role, setRole] = useState<UserRole>(initialRole);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreement, setAgreement] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!firstName || !lastName || !email || password.length < 6) {
      Alert.alert('Champs manquants', 'Vérifie tous les champs (mdp ≥ 6 car.).');
      return;
    }
    if (role === 'instructor' && !agreement) {
      Alert.alert('N° agrément requis');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, first_name: firstName, last_name: lastName, agreement_number: agreement },
      },
    });
    if (error) {
      setLoading(false);
      Alert.alert('Inscription impossible', error.message);
      return;
    }
    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        first_name: firstName,
        last_name: lastName,
        email,
      } as never);
      if (profileErr) {
        setLoading(false);
        Alert.alert('Profil non créé', profileErr.message);
        return;
      }

      if (role === 'student') {
        let referredBy: string | null = null;
        if (referral.trim()) {
          const { data: parrain } = await supabase
            .from('students')
            .select('id')
            .eq('referral_code', referral.trim().toUpperCase())
            .maybeSingle();
          referredBy = (parrain as { id: string } | null)?.id ?? null;
        }
        await supabase.from('students').insert({
          id: data.user.id,
          referral_code: '',
          referred_by: referredBy,
          instructor_id: invitedBy ?? null,
        } as never);
      } else if (role === 'instructor') {
        await supabase.from('instructors').insert({
          id: data.user.id,
          agreement_number: agreement,
        } as never);
      }
    }
    setLoading(false);
  }

  const accent = role === 'instructor' ? 'instructor' : 'student';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <Text className="text-text text-3xl font-bold mb-2">Créer un compte</Text>
        <Text className="text-muted mb-6">
          {invitedBy
            ? 'Tu as été invité par ton moniteur — finalise ton inscription.'
            : 'Choisis ton rôle pour démarrer.'}
        </Text>

        <View className="flex-row gap-2 mb-5">
          <Pressable
            onPress={() => setRole('student')}
            className={`flex-1 py-3 rounded-2xl items-center border ${
              role === 'student' ? 'bg-student border-student' : 'bg-card border-border'
            }`}
          >
            <Text className={role === 'student' ? 'text-[#0a1a14] font-bold' : 'text-text'}>
              Élève
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRole('instructor')}
            className={`flex-1 py-3 rounded-2xl items-center border ${
              role === 'instructor' ? 'bg-instructor border-instructor' : 'bg-card border-border'
            }`}
          >
            <Text className={role === 'instructor' ? 'text-white font-bold' : 'text-text'}>
              Moniteur
            </Text>
          </Pressable>
        </View>

        <TextField label="Prénom" value={firstName} onChangeText={setFirstName} />
        <TextField label="Nom" value={lastName} onChangeText={setLastName} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
        {role === 'instructor' && (
          <TextField label="N° d'agrément" value={agreement} onChangeText={setAgreement} />
        )}
        {role === 'student' && (
          <TextField
            label="Code parrainage (optionnel)"
            value={referral}
            onChangeText={setReferral}
            autoCapitalize="characters"
            placeholder="SOFIA27"
          />
        )}

        <View className="mt-3">
          <Button label="Créer mon compte" onPress={handleSignup} loading={loading} variant={accent} />
        </View>

        <Link href="/(auth)/login" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-muted text-sm">
              Déjà inscrit ? <Text className="text-instructor font-bold">Se connecter</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
