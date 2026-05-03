import { Text, View } from 'react-native';

type Props = {
  author: string;
  date: string;
  body: string;
  rating: number;
};

export function FeedbackCard({ author, date, body, rating }: Props) {
  const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  return (
    <View className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3">
      <View className="flex-row justify-between mb-2">
        <Text className="text-muted text-xs font-bold">{author}</Text>
        <Text className="text-muted2 text-[10px]">{date}</Text>
      </View>
      <Text className="text-text text-[11px] leading-5 mb-2">{body}</Text>
      <Text className="text-warning text-sm tracking-widest">{stars}</Text>
    </View>
  );
}
