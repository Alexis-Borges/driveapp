import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { captureException } from '../../lib/observability';

type Props = { children: ReactNode };
type State = { error: Error | null };

// Filet anti-crash global : capture toute exception de rendu non gérée,
// l'envoie à Sentry et affiche un écran de récupération au lieu d'un écran
// blanc. Doit envelopper la navigation dans app/_layout.tsx.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    captureException(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = async () => {
    // En build natif, recharge complètement le bundle via expo-updates si
    // disponible ; sinon (dev / Expo Go / package absent) on remet juste
    // l'état à zéro pour re-tenter le rendu.
    try {
      const Updates = require('expo-updates') as typeof import('expo-updates');
      await Updates.reloadAsync();
    } catch {
      this.setState({ error: null });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Text className="text-text text-xl font-bold mb-2 text-center">
          Oups, une erreur est survenue
        </Text>
        <Text className="text-muted text-sm text-center mb-6 leading-5">
          L'application a rencontré un problème inattendu. Tu peux réessayer —
          si ça persiste, redémarre l'app.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          onPress={this.reset}
          className="bg-instructor rounded-2xl py-3 px-8 items-center justify-center"
        >
          <Text className="text-white font-bold text-base">Réessayer</Text>
        </Pressable>
        {__DEV__ ? (
          <Text className="text-danger text-[10px] mt-6 text-center" numberOfLines={4}>
            {this.state.error.message}
          </Text>
        ) : null}
      </View>
    );
  }
}
