import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  /** index dans une liste → décale l'apparition (effet cascade) */
  index?: number;
  /** délai de base en ms */
  delay?: number;
  className?: string;
};

/**
 * Entrée en fondu + léger glissement vers le haut. Pour les items de liste,
 * passer `index` produit un effet cascade (stagger). 100 % natif (reanimated),
 * déployable en OTA.
 */
export function FadeInItem({ children, index = 0, delay = 0, className }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280)
        .delay(delay + index * 45)
        .springify()
        .damping(18)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}

/** Fondu simple, pour les blocs non listés (cartes, en-têtes). */
export function FadeInBlock({ children, delay = 0, className }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(250).delay(delay)} className={className}>
      {children}
    </Animated.View>
  );
}
