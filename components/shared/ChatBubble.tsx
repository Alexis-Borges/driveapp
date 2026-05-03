import { Text, View } from 'react-native';

type Props = {
  content: string;
  mine: boolean;
  variant: 'instructor' | 'student';
};

export function ChatBubble({ content, mine, variant }: Props) {
  if (!mine) {
    return (
      <View className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2 self-start max-w-[76%]">
        <Text className="text-text text-xs leading-5">{content}</Text>
      </View>
    );
  }
  const bg = variant === 'instructor' ? 'bg-instructor' : 'bg-student';
  const tx = variant === 'instructor' ? 'text-white' : 'text-[#0a1a14]';
  return (
    <View className={`${bg} rounded-2xl rounded-br-sm px-3 py-2 self-end max-w-[76%]`}>
      <Text className={`${tx} text-xs leading-5`}>{content}</Text>
    </View>
  );
}
