import { Pressable, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { haptics } from '../../lib/haptics';

type Props = {
  // Ce que l'utilisateur n'a pas pu voir, pas le nom technique de la requête.
  // Ex. « ton planning », « tes messages ».
  what: string;
  onRetry?: () => void;
  retrying?: boolean;
};

// Affiché quand une requête échoue. Sans ça, l'écran retombe sur son état
// vide : le testeur croit qu'il n'a aucune séance alors que le chargement a
// planté — impossible de distinguer « rien » de « ça n'a pas chargé ».
export function ErrorState({ what, onRetry, retrying }: Props) {
  return (
    <View className="mx-5 my-2 bg-danger/10 border border-danger/25 rounded-2xl px-4 py-5 items-center">
      <View className="mb-2">
        <Icon name="alert" size={26} color="#FF4F4F" />
      </View>
      <Text className="text-text text-sm font-bold text-center">
        Impossible de charger {what}
      </Text>
      <Text className="text-muted text-xs text-center mt-1.5 leading-5">
        Vérifie ta connexion internet, puis réessaie.
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          accessibilityState={{ busy: retrying }}
          disabled={retrying}
          onPress={() => {
            haptics.tap();
            onRetry();
          }}
          style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}
          className={`bg-danger mt-3 px-4 py-2 rounded-full ${retrying ? 'opacity-60' : ''}`}
        >
          <Text className="text-white text-xs font-bold">
            {retrying ? 'Chargement…' : 'Réessayer'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
