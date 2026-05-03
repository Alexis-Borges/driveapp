import { Pressable, Text, View } from 'react-native';

type Props = {
  amountEuros: number;
  onPay: () => void;
};

export function PaymentBanner({ amountEuros, onPay }: Props) {
  return (
    <View className="mx-5 mb-2 bg-instructor/10 border border-instructor/25 rounded-2xl px-4 py-3 flex-row items-center justify-between">
      <View>
        <Text className="text-muted2 text-[9px] uppercase tracking-wider">Reste à payer</Text>
        <Text className="text-text text-2xl font-bold mt-0.5">
          {amountEuros} <Text className="text-muted text-sm">€</Text>
        </Text>
      </View>
      <Pressable
        onPress={onPay}
        className="bg-instructor rounded-2xl px-4 py-2.5"
      >
        <Text className="text-white text-xs font-bold">Payer</Text>
      </Pressable>
    </View>
  );
}
