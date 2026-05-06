import { Pressable, Text, View } from 'react-native';
import type { CompetenceRow, CompetenceStatus, StudentCompetenceRow } from '../../types/database';

const STATUS_COLOR: Record<CompetenceStatus, string> = {
  not_started: 'bg-card2',
  in_progress: 'bg-warning/30',
  acquired: 'bg-student',
};

const STATUS_LABEL: Record<CompetenceStatus, string> = {
  not_started: 'À aborder',
  in_progress: 'En cours',
  acquired: 'Acquis ✓',
};

const ORDER: CompetenceStatus[] = ['not_started', 'in_progress', 'acquired'];

type Props = {
  catalog: CompetenceRow[];
  states: StudentCompetenceRow[];
  editable?: boolean;
  onChange?: (competenceId: string, status: CompetenceStatus) => void;
};

export function CompetencesList({ catalog, states, editable, onChange }: Props) {
  const stateMap = new Map(states.map((s) => [s.competence_id, s.status]));
  const parents = catalog.filter((c) => c.parent_id == null);
  const childrenByParent = new Map<string, CompetenceRow[]>();
  for (const c of catalog) {
    if (c.parent_id) {
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }
  }

  function nextStatus(current: CompetenceStatus): CompetenceStatus {
    const idx = ORDER.indexOf(current);
    return ORDER[(idx + 1) % ORDER.length];
  }

  return (
    <View className="px-5 gap-3">
      {parents.map((p) => {
        const children = childrenByParent.get(p.id) ?? [];
        const acquired = children.filter(
          (c) => (stateMap.get(c.id) ?? 'not_started') === 'acquired'
        ).length;
        return (
          <View key={p.id} className="bg-card border border-border rounded-2xl px-3 py-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-text text-sm font-bold flex-1 pr-2">{p.label}</Text>
              <Text className="text-student text-[11px] font-bold">
                {acquired}/{children.length}
              </Text>
            </View>
            {children.map((c) => {
              const status = (stateMap.get(c.id) ?? 'not_started') as CompetenceStatus;
              const node = (
                <View className="flex-row items-center justify-between py-1.5">
                  <Text className="text-text text-[12px] flex-1 pr-2">{c.label}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
                    <Text
                      className={`text-[10px] font-bold ${status === 'acquired' ? 'text-[#0a1a14]' : 'text-text'}`}
                    >
                      {STATUS_LABEL[status]}
                    </Text>
                  </View>
                </View>
              );
              if (!editable || !onChange) return <View key={c.id}>{node}</View>;
              return (
                <Pressable key={c.id} onPress={() => onChange(c.id, nextStatus(status))}>
                  {node}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
