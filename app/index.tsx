import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { fetchProfileInto, signOut } from '../hooks/useAuth';

// Au-delà de ce délai, une session sans profil n'est plus un chargement mais
// une panne : on arrête de faire tourner un spinner et on rend la main.
const STUCK_AFTER_MS = 6000;

export default function Index() {
  const { session, profile, loading } = useAuthStore();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [stuck, setStuck] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const waitingForProfile = !loading && !!session && !profile;

  useEffect(() => {
    if (!waitingForProfile) {
      setStuck(false);
      return;
    }
    const t = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(t);
  }, [waitingForProfile]);

  async function retry() {
    if (!session?.user) return;
    setRetrying(true);
    await fetchProfileInto(setProfile, session.user.id);
    setRetrying(false);
    setStuck(false);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg gap-4">
        <Text className="text-text text-3xl font-bold">DriveApp</Text>
        <ActivityIndicator color="#7C75FF" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;

  if (!profile) {
    // Sans cette porte de sortie l'écran tournait indéfiniment : profil
    // introuvable (réseau, trigger de création en retard) = spinner éternel,
    // sans réessai ni moyen de se déconnecter.
    if (!stuck) {
      return (
        <View className="flex-1 items-center justify-center bg-bg gap-4">
          <Text className="text-text text-3xl font-bold">DriveApp</Text>
          <ActivityIndicator color="#7C75FF" />
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8 gap-3">
        <Text className="text-text text-lg font-bold text-center">
          Impossible de charger ton profil
        </Text>
        <Text className="text-muted text-xs text-center leading-5 mb-2">
          Vérifie ta connexion internet. Si le problème persiste, déconnecte-toi
          puis reconnecte-toi.
        </Text>
        <View className="w-full gap-2">
          <Button label="Réessayer" onPress={retry} loading={retrying} variant="instructor" />
          <Button label="Se déconnecter" onPress={() => signOut()} variant="outline" />
        </View>
      </View>
    );
  }

  return (
    <Redirect
      href={profile.role === 'instructor' ? '/(instructor)/home' : '/(student)/home'}
    />
  );
}
