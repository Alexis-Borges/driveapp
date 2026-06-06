import { Alert, Text, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useStudentCancelLesson, type Lesson } from '../../hooks/useLessons';
import { statusLabel, typeLabel } from '../../lib/lessons';
import { Badge } from '../ui/Badge';

type Props = {
  visible: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  instructorName?: string;
};

const TONE: Record<string, 'student' | 'warning' | 'danger' | 'neutral'> = {
  confirmed: 'student',
  completed: 'student',
  pending: 'warning',
  cancelled: 'danger',
  auto_cancelled: 'danger',
};

export function LessonDetailSheet({ visible, onClose, lesson, instructorName }: Props) {
  const cancel = useStudentCancelLesson();
  if (!lesson) return null;

  const date = new Date(lesson.scheduled_at);
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const hourLabel = `${String(date.getHours()).padStart(2, '0')}h00`;
  const hoursUntil = (date.getTime() - Date.now()) / 3_600_000;
  const canCancel =
    (lesson.status === 'pending' || lesson.status === 'confirmed') && hoursUntil > 0;
  const within48h = hoursUntil < 48;

  function confirmCancel() {
    if (!lesson) return;
    Alert.alert(
      'Annuler cette séance ?',
      within48h
        ? 'Attention : à moins de 48h, l\'annulation peut ne pas être autorisée.'
        : 'Tu peux annuler jusqu\'à 48h avant la séance.',
      [
        { text: 'Conserver', style: 'cancel' },
        {
          text: 'Annuler la séance',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel.mutateAsync({ id: lesson.id, scheduled_at: lesson.scheduled_at });
              onClose();
            } catch (e: unknown) {
              Alert.alert('Impossible', e instanceof Error ? e.message : 'Erreur');
            }
          },
        },
      ]
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text text-lg font-bold">Détail de la séance</Text>
        <Badge label={statusLabel(lesson.status)} tone={TONE[lesson.status] ?? 'neutral'} />
      </View>

      <View className="bg-card2 rounded-2xl px-4 py-3 mb-3 gap-2.5">
        <DetailRow icon="calendar" label="Quand" value={`${dateLabel} · ${hourLabel}`} />
        <DetailRow icon="car" label="Type" value={typeLabel(lesson.type)} />
        <DetailRow icon="clock" label="Durée" value={`${lesson.duration_minutes ?? 60} min`} />
        {instructorName ? (
          <DetailRow icon="user" label="Moniteur" value={instructorName} />
        ) : null}
        {lesson.pickup_address ? (
          <DetailRow icon="pin" label="Lieu de RDV" value={lesson.pickup_address} />
        ) : null}
      </View>

      {lesson.status === 'completed' && lesson.feedback ? (
        <View className="bg-card2 rounded-2xl px-4 py-3 mb-3">
          <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-1.5">
            Retour du moniteur
          </Text>
          <Text className="text-text text-[13px] leading-5">{lesson.feedback}</Text>
          {lesson.rating ? (
            <View className="flex-row gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon
                  key={n}
                  name="star"
                  size={14}
                  color={n <= lesson.rating! ? '#FFB230' : '#454B57'}
                  fill={n <= lesson.rating! ? '#FFB230' : 'none'}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {(lesson.status === 'cancelled' || lesson.status === 'auto_cancelled') && lesson.cancelled_reason ? (
        <View className="bg-danger/10 border border-danger/25 rounded-2xl px-4 py-3 mb-3">
          <Text className="text-danger text-[11px] font-bold mb-0.5">Motif d'annulation</Text>
          <Text className="text-muted text-[12px]">{lesson.cancelled_reason}</Text>
        </View>
      ) : null}

      {canCancel ? (
        <Button
          label="Annuler cette séance"
          variant="danger"
          onPress={confirmCancel}
          loading={cancel.isPending}
        />
      ) : (
        <Button label="Fermer" variant="outline" onPress={onClose} />
      )}
    </BottomSheet>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <Icon name={icon} size={15} color="#878D9A" />
      <Text className="text-muted2 text-[10px] uppercase tracking-wider w-20">{label}</Text>
      <Text className="text-text text-[13px] font-medium flex-1 text-right">{value}</Text>
    </View>
  );
}
