import { Pressable, ScrollView, Text, View } from 'react-native';

type Props = {
  selected: Date;
  onSelect: (d: Date) => void;
  variant: 'instructor' | 'student';
  days?: number;
};

const NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DaySelector({ selected, onSelect, variant, days = 7 }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const list: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    list.push(d);
  }
  const accent = variant === 'instructor' ? 'bg-instructor border-instructor' : 'bg-student border-student';
  const textOnAccent = variant === 'instructor' ? 'text-white' : 'text-[#0a1a14]';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
    >
      {list.map((d) => {
        const sel = isSameDay(d, selected);
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelect(d)}
            className={`min-w-[46px] items-center rounded-xl px-2.5 py-1.5 border ${
              sel ? accent : 'bg-card border-border'
            }`}
          >
            <Text
              className={`text-[9px] font-bold uppercase tracking-wider ${
                sel ? `${textOnAccent} opacity-70` : 'text-muted2'
              }`}
            >
              {NAMES[d.getDay()]}
            </Text>
            <Text className={`text-base font-bold ${sel ? textOnAccent : 'text-text'}`}>
              {d.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
