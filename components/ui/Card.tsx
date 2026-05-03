import { View, ViewProps } from 'react-native';

export function Card({ className = '', ...props }: ViewProps & { className?: string }) {
  return <View className={`bg-card border border-border rounded-2xl ${className}`} {...props} />;
}
