import { Text } from 'react-native';

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-muted2 text-[10px] font-bold uppercase tracking-wider px-5 pt-3 pb-1.5">
      {children}
    </Text>
  );
}
