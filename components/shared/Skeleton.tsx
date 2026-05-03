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
