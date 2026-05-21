import { ActivityIndicator, Pressable, Text } from 'react-native';

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
      onPress={onPress}
      disabled={isDisabled}
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
