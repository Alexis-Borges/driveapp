import { ActivityIndicator, Pressable, Text } from 'react-native';
import { haptics } from '../../lib/haptics';

type Variant = 'instructor' | 'student' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
};

const styles: Record<Variant, { bg: string; text: string }> = {
  instructor: { bg: 'bg-instructor', text: 'text-white' },
  student: { bg: 'bg-student', text: 'text-[#0a1a14]' },
  outline: { bg: 'bg-transparent border border-border', text: 'text-text' },
  danger: { bg: 'bg-danger/10 border border-danger/30', text: 'text-danger' },
};

export function Button({ label, onPress, variant = 'instructor', loading, disabled, testID }: Props) {
  const s = styles[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID ?? label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // Le retour tactile est branché ici plutôt que sur chaque appelant :
      // tout bouton de l'app en hérite. `danger` vibre en warning — une
      // action destructive ne doit pas se sentir comme un tap anodin.
      onPress={
        onPress
          ? () => {
              if (variant === 'danger') haptics.warning();
              else haptics.tap();
              onPress();
            }
          : undefined
      }
      disabled={isDisabled}
      style={({ pressed }) => (pressed && !isDisabled ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null)}
      className={`${s.bg} rounded-2xl py-3 px-5 items-center justify-center ${isDisabled ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'student' ? '#0a1a14' : '#fff'} />
      ) : (
        <Text className={`${s.text} font-bold text-base`}>{label}</Text>
      )}
    </Pressable>
  );
}
