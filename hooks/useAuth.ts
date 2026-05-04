import { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

let userInitiatedSignOut = false;
let hadSession = false;

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
      hadSession = !!session;
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        hadSession = true;
        await loadProfile(session.user.id);
      } else {
        if (event === 'SIGNED_OUT' && hadSession && !userInitiatedSignOut) {
          Alert.alert(
            'Session expirée',
            'Ta session a expiré. Reconnecte-toi pour continuer.'
          );
        }
        userInitiatedSignOut = false;
        hadSession = false;
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
  userInitiatedSignOut = true;
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
