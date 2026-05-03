import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { supabase } from '../../lib/supabase';
import { resetSchema, firstError } from '../../lib/validation';

export default function Reset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handle() {
    const parsed = resetSchema.safeParse({ email });
    const err = firstError(parsed);
    if (err) {
      Alert.alert('Email invalide', err);
      return;
    }
    setLoading(true);
    const redirectTo = Linking.createURL('/(auth)/login');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-text text-3xl font-bold mb-2">Mot de passe oublié</Text>
        <Text className="text-muted mb-8">
          Reçois un lien de réinitialisation par email.
        </Text>

        {sent ? (
          <View className="bg-student/10 border border-student/25 rounded-2xl px-3 py-3">
            <Text className="text-student text-xs font-bold">Email envoyé ✓</Text>
            <Text className="text-muted text-[11px] mt-1">
              Vérifie ta boîte mail (et tes spams) pour le lien.
            </Text>
          </View>
        ) : (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="toi@exemple.fr"
            />
            <View className="mt-2">
              <Button label="Recevoir le lien" onPress={handle} loading={loading} />
            </View>
          </>
        )}

        <Link href="/(auth)/login" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-muted text-sm">
              Retour à la <Text className="text-instructor font-bold">connexion</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
