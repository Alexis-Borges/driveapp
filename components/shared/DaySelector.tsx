import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

type Props = {
  selected: Date;
  onSelect: (d: Date) => void;
  variant: 'instructor' | 'student';
  daysBefore?: number;
  daysAfter?: number;
};

const NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const ITEM_WIDTH = 52;

export function DaySelector({
  selected,
  onSelect,
  variant,
  daysBefore = 7,
  daysAfter = 21,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - daysBefore);
  const total = daysBefore + daysAfter + 1;

  const list: Date[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    list.push(d);
  }

  // auto-center on selected when it changes
  useEffect(() => {
    const idx = list.findIndex((d) => isSameDay(d, selected));
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, (idx - 2) * (ITEM_WIDTH + 6)), animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.toDateString()]);

  const accent =
    variant === 'instructor' ? 'bg-instructor border-instructor' : 'bg-student border-student';
  const textOnAccent = variant === 'instructor' ? 'text-white' : 'text-[#0a1a14]';

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
    >
      {list.map((d) => {
        const sel = isSameDay(d, selected);
        const isToday = isSameDay(d, today);
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelect(d)}
            style={{ minWidth: ITEM_WIDTH }}
            className={`items-center rounded-xl px-2.5 py-1.5 border ${
              sel ? accent : isToday ? 'bg-card border-instructor/40' : 'bg-card border-border'
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
