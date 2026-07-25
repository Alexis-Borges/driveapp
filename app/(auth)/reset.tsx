import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { supabase } from '../../lib/supabase';
import { resetSchema, newPasswordSchema, firstError } from '../../lib/validation';
import { haptics } from '../../lib/haptics';

// Réinitialisation par code à 6 chiffres plutôt que par lien.
//
// Le lien de récupération de Supabase redirige vers une URL d'app ; sous Expo
// Go celle-ci contient le sous-domaine du tunnel, qui change à chaque
// relance — impossible à déclarer durablement dans les redirections
// autorisées. Le code saisi à la main ne dépend d'aucune redirection.
//
// Prérequis côté Supabase : le gabarit d'email « Reset password » doit
// contenir {{ .Token }} (le code) et pas seulement {{ .ConfirmationURL }}.
export default function Reset() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const parsed = resetSchema.safeParse({ email });
    const err = firstError(parsed);
    if (err) {
      Alert.alert('Email invalide', err);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      haptics.error();
      Alert.alert('Envoi impossible', error.message);
      return;
    }
    haptics.success();
    setStep('code');
  }

  async function applyNewPassword() {
    const parsed = newPasswordSchema.safeParse({ token, password, confirm });
    const err = firstError(parsed);
    if (err) {
      Alert.alert('Champs invalides', err);
      return;
    }
    setLoading(true);

    // verifyOtp ouvre une session de récupération ; sans elle, updateUser
    // n'aurait aucun utilisateur à modifier.
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    });
    if (otpError) {
      setLoading(false);
      haptics.error();
      Alert.alert('Code refusé', 'Code incorrect ou expiré. Demande-en un nouveau.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      haptics.error();
      Alert.alert('Erreur', updateError.message);
      return;
    }

    haptics.success();
    // verifyOtp a ouvert une vraie session : l'utilisateur vient de prouver
    // qu'il possède l'adresse, inutile de lui redemander de se connecter. On
    // ne navigue pas non plus — la gate de _layout l'envoie vers son portail
    // dès que le profil est chargé, et forcer une route ici se battrait
    // avec elle.
    Alert.alert('Mot de passe modifié', 'Te voilà connecté·e.');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-text text-3xl font-bold mb-2">Mot de passe oublié</Text>

        {step === 'email' ? (
          <>
            <Text className="text-muted mb-8">
              Reçois un code de vérification par email.
            </Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="toi@exemple.fr"
            />
            <View className="mt-2">
              <Button label="Recevoir le code" onPress={sendCode} loading={loading} />
            </View>
          </>
        ) : (
          <>
            <Text className="text-muted mb-6">
              Un code de vérification a été envoyé à{' '}
              <Text className="text-text font-bold">{email.trim()}</Text>. Pense à
              regarder dans les spams.
            </Text>
            <TextField
              label="Code reçu"
              value={token}
              onChangeText={(t) => setToken(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              autoCorrect={false}
              placeholder="12345678"
              maxLength={10}
            />
            <TextField
              label="Nouveau mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="6 caractères minimum"
            />
            <TextField
              label="Confirmer"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
            />
            <View className="mt-2">
              <Button
                label="Changer mon mot de passe"
                onPress={applyNewPassword}
                loading={loading}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setToken('');
                setStep('email');
              }}
              className="mt-3 items-center py-2"
            >
              <Text className="text-muted2 text-[11px]">
                Code non reçu ? Renvoyer un code
              </Text>
            </Pressable>
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
