import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { supabase } from '../../lib/supabase';
import { loginSchema, firstError } from '../../lib/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const parsed = loginSchema.safeParse({ email, password });
    const err = firstError(parsed);
    if (err) {
      Alert.alert('Champs invalides', err);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Connexion impossible', error.message);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-text text-3xl font-bold mb-2">DriveApp</Text>
        <Text className="text-muted mb-8">Connecte-toi à ton compte.</Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="toi@exemple.fr"
        />
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <View className="mt-2">
          <Button label="Se connecter" onPress={handleLogin} loading={loading} />
        </View>

        <Link href="/(auth)/reset" asChild>
          <Pressable className="mt-3 items-center">
            <Text className="text-muted text-xs">Mot de passe oublié ?</Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/signup" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-muted text-sm">
              Pas encore de compte ? <Text className="text-instructor font-bold">Créer un compte</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
