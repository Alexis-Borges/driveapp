import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';

export default function VerifyEmail() {
  const session = useAuthStore((s) => s.session);
  const email = session?.user.email ?? '';
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  // Poll toutes les 4 s pour détecter la confirmation
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.refreshSession();
      if (data.session?.user.email_confirmed_at) {
        clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  async function resend() {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) Alert.alert('Erreur', error.message);
    else Alert.alert('Email renvoyé', 'Vérifie ta boîte mail (et tes spams).');
  }

  async function checkNow() {
    setChecking(true);
    const { data, error } = await supabase.auth.refreshSession();
    setChecking(false);
    if (error) return Alert.alert('Erreur', error.message);
    if (!data.session?.user.email_confirmed_at) {
      Alert.alert('Pas encore vérifié', 'Clique sur le lien dans ton email puis reviens.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-text text-3xl font-bold mb-2">Vérifie ton email</Text>
        <Text className="text-muted mb-6 leading-6">
          On a envoyé un lien de confirmation à {'\n'}
          <Text className="text-text font-bold">{email}</Text>
          {'\n\n'}Clique dessus pour activer ton compte. Cette étape est obligatoire avant
          de pouvoir réserver.
        </Text>

        <Button
          label="J'ai cliqué — vérifier maintenant"
          variant="instructor"
          onPress={checkNow}
          loading={checking}
        />
        <View className="h-2" />
        <Button
          label="Renvoyer l'email"
          variant="outline"
          onPress={resend}
          loading={resending}
        />

        <Pressable onPress={signOut} className="mt-6 items-center">
          <Text className="text-muted text-xs underline">Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
