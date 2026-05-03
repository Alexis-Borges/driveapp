import { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useAuthBootstrap() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, first_name, last_name, email, avatar_url, phone, bio')
        .eq('id', userId)
        .single();
      if (mounted) setProfile(data ?? null);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setLoading, setProfile, setSession]);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function confirmSignOut() {
  Alert.alert(
    'Se déconnecter ?',
    'Tu devras te reconnecter pour accéder à ton compte.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]
  );
}
