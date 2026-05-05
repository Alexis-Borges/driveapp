import { Text, TextInput, TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...props }: Props) {
  return (
    <View className="mb-3">
      <Text className="text-muted text-[10px] font-bold uppercase tracking-wider mb-1.5">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#454B57"
        className="bg-card border border-border rounded-2xl px-4 py-3 text-text"
        {...props}
      />
      {error ? <Text className="text-danger text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
