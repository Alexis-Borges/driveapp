import { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

let userInitiatedSignOut = false;
let hadSession = false;

type Profile = ReturnType<typeof useAuthStore.getState>['profile'];
type ProfileSetter = (p: Profile) => void;

// Charge le profil avec quelques tentatives. Deux cas légitimes d'échec au
// premier essai : réseau encore instable au démarrage à froid, et surtout
// signup tout juste effectué où le trigger handle_new_user n'a pas encore
// inséré la ligne. Renvoie false si le profil reste introuvable.
export async function fetchProfileInto(
  setProfile: ProfileSetter,
  userId: string,
  attempts = 3
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, first_name, last_name, email, avatar_url, phone, bio')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        return true;
      }
    } catch {
      // réseau : on retente
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }
  return false;
}

export function useAuthBootstrap() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    // Aucune de ces étapes ne doit pouvoir laisser `loading` à true : l'écran
    // racine n'affiche qu'un spinner tant qu'il l'est, donc une requête qui
    // échoue ou qui pend bloque l'app sur un chargement infini.
    async function loadProfile(userId: string) {
      const ok = await fetchProfileInto(setProfile, userId);
      if (!ok && mounted) setProfile(null);
    }

    // Filet de sécurité : si getSession() ne se résout ni ne rejette (cas vu
    // sur AsyncStorage lent au démarrage à froid), on libère quand même l'UI.
    const failsafe = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        hadSession = !!session;
        if (session?.user) await loadProfile(session.user.id);
      })
      .catch(() => {
        // Session illisible : on repart déconnecté, la gate renverra au login.
        if (mounted) setSession(null);
      })
      .finally(() => {
        clearTimeout(failsafe);
        if (mounted) setLoading(false);
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
      clearTimeout(failsafe);
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
