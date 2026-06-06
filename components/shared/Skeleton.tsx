import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  className?: string;
};

export function Skeleton({ width = '100%', height = 14, className = '' }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, opacity, borderRadius: 8 }}
      className={`bg-card2 ${className}`}
    />
  );
}

export function SkeletonCard({ height = 64 }: { height?: number }) {
  return (
    <View
      className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3"
      style={{ minHeight: height }}
    >
      <Skeleton width="60%" height={12} />
      <View className="h-2" />
      <Skeleton width="40%" height={10} />
    </View>
  );
}

/** Ligne avec avatar/pastille + 2 lignes de texte (threads, paiements…). */
export function SkeletonRow() {
  return (
    <View className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row items-center gap-3">
      <Skeleton width={36} height={36} className="rounded-full" />
      <View className="flex-1">
        <Skeleton width="50%" height={12} />
        <View className="h-2" />
        <Skeleton width="70%" height={10} />
      </View>
    </View>
  );
}

/** N cartes/lignes de skeleton. */
export function SkeletonList({ count = 4, row = false }: { count?: number; row?: boolean }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) =>
        row ? <SkeletonRow key={i} /> : <SkeletonCard key={i} />
      )}
    </View>
  );
}
