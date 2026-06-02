import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

// Header unifié pour tous les sous-écrans (sortis des onglets) :
// flèche retour à gauche + titre. Remplace 10 duplications visuellement
// identiques (admin, instructeur, élève, légal). Hauteur stable, accessible.
type Props = {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, back = true, right }: Props) {
  const router = useRouter();
  return (
    <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border min-h-[44px]">
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
        >
          <Text className="text-muted text-sm">‹</Text>
        </Pressable>
      ) : null}
      <Text className="text-text text-base font-bold flex-1" numberOfLines={1}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}
