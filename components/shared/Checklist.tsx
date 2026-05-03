import { Pressable, Text, View } from 'react-native';

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  cta?: string;
  onPress?: () => void;
};

type Props = {
  items: ChecklistItem[];
  variant: 'instructor' | 'student';
};

export function Checklist({ items, variant }: Props) {
  const accent = variant === 'instructor' ? 'text-instructor' : 'text-student';
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <View
      className={`mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3`}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-text text-sm font-bold">Bienvenue 👋</Text>
        <Text className={`${accent} text-[11px] font-bold`}>
          {done} / {items.length}
        </Text>
      </View>
      {items.map((it) => (
        <Pressable
          key={it.id}
          onPress={it.done ? undefined : it.onPress}
          className="flex-row items-center gap-2 py-1.5"
        >
          <View
            className={`w-4 h-4 rounded-full items-center justify-center ${
              it.done ? (variant === 'instructor' ? 'bg-instructor' : 'bg-student') : 'border border-border'
            }`}
          >
            {it.done ? (
              <Text className={variant === 'student' ? 'text-[#0a1a14] text-[8px]' : 'text-white text-[8px]'}>
                ✓
              </Text>
            ) : null}
          </View>
          <Text
            className={`flex-1 text-xs ${it.done ? 'text-muted2 line-through' : 'text-text'}`}
          >
            {it.title}
          </Text>
          {!it.done && it.cta ? (
            <Text className={`${accent} text-[11px] font-bold`}>{it.cta} →</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
