import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';

type Props = {
  /** Mode plage : sélection début → fin. Mode simple : une seule date. */
  mode?: 'single' | 'range';
  /** Date sélectionnée (single) */
  value?: Date | null;
  onChange?: (d: Date) => void;
  /** Plage sélectionnée (range) */
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onRangeChange?: (start: Date | null, end: Date | null) => void;
  /** Empêche la sélection avant aujourd'hui */
  minToday?: boolean;
  variant?: 'instructor' | 'student';
};

const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Calendar({
  mode = 'single',
  value,
  onChange,
  rangeStart,
  rangeEnd,
  onRangeChange,
  minToday = true,
  variant = 'instructor',
}: Props) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => {
    const base = value ?? rangeStart ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const accent = variant === 'instructor' ? '#7C75FF' : '#00C896';
  const accentBg = variant === 'instructor' ? 'bg-instructor' : 'bg-student';
  const accentSoft = variant === 'instructor' ? 'bg-instructor/20' : 'bg-student/20';
  const textOnAccent = variant === 'instructor' ? 'text-white' : 'text-[#0a1a14]';

  // grille de 6 semaines (lundi en première colonne)
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (firstOfMonth.getDay() + 6) % 7; // 0 = lundi
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - offset);
    const list: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(startOfDay(d));
    }
    return list;
  }, [cursor]);

  function shiftMonth(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  function handlePress(d: Date) {
    if (minToday && d < today) return;
    if (mode === 'single') {
      onChange?.(d);
      return;
    }
    // mode range
    if (!rangeStart || (rangeStart && rangeEnd)) {
      onRangeChange?.(d, null); // démarre une nouvelle plage
    } else {
      if (d < rangeStart) onRangeChange?.(d, rangeStart);
      else onRangeChange?.(rangeStart, d);
    }
  }

  function cellState(d: Date) {
    const inMonth = d.getMonth() === cursor.getMonth();
    const disabled = minToday && d < today;
    if (mode === 'single') {
      const selected = value ? sameDay(d, value) : false;
      return { inMonth, disabled, selected, inRange: false, edge: false };
    }
    const isStart = rangeStart ? sameDay(d, rangeStart) : false;
    const isEnd = rangeEnd ? sameDay(d, rangeEnd) : false;
    const inRange =
      rangeStart && rangeEnd ? d > rangeStart && d < rangeEnd : false;
    return { inMonth, disabled, selected: isStart || isEnd, inRange, edge: isStart || isEnd };
  }

  return (
    <View className="bg-card border border-border rounded-2xl p-3">
      {/* header mois */}
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          onPress={() => shiftMonth(-1)}
          className="w-8 h-8 rounded-lg bg-card2 items-center justify-center"
        >
          <Icon name="chevron-left" size={16} color="#878D9A" />
        </Pressable>
        <Text className="text-text text-sm font-bold">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          className="w-8 h-8 rounded-lg bg-card2 items-center justify-center"
        >
          <Icon name="chevron-right" size={16} color="#878D9A" />
        </Pressable>
      </View>

      {/* en-têtes jours */}
      <View className="flex-row mb-1">
        {DAY_NAMES.map((n, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-muted2 text-[10px] font-bold">{n}</Text>
          </View>
        ))}
      </View>

      {/* grille */}
      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          const s = cellState(d);
          return (
            <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-0.5">
              <Pressable
                onPress={() => handlePress(d)}
                disabled={s.disabled}
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  s.selected ? accentBg : s.inRange ? accentSoft : ''
                }`}
              >
                <Text
                  className={`text-[13px] ${
                    s.selected
                      ? `${textOnAccent} font-bold`
                      : s.disabled
                        ? 'text-muted2/40'
                        : s.inMonth
                          ? 'text-text'
                          : 'text-muted2'
                  }`}
                >
                  {d.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
