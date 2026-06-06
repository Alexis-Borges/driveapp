import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { useUpdateLessonStatus, type Lesson } from '../../hooks/useLessons';
import { statusLabel, typeLabel } from '../../lib/lessons';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_TONE: Record<string, 'student' | 'warning' | 'danger' | 'neutral'> = {
  confirmed: 'student',
  completed: 'student',
  pending: 'warning',
  cancelled: 'danger',
  auto_cancelled: 'danger',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  lesson: Lesson | null;
};

const CANCEL_REASONS = [
  'Élève absent',
  'Mauvais temps',
  'Conflit de planning',
  'Maladie',
  'Autre',
];

export function LessonActionSheet({ visible, onClose, lesson }: Props) {
  const updateStatus = useUpdateLessonStatus();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState('');

  useEffect(() => {
    if (visible && lesson) {
      setFeedback(lesson.feedback ?? '');
      setRating(lesson.rating ?? 0);
      setCancelMode(false);
      setCancelReason(null);
      setOtherReason('');
    }
  }, [visible, lesson]);

  if (!lesson) return null;

  async function setStatus(status: 'confirmed' | 'completed') {
    try {
      await updateStatus.mutateAsync({ id: lesson!.id, status });
      onClose();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function confirmCancel() {
    if (!cancelReason) {
      Alert.alert('Motif requis', 'Choisis un motif d\'annulation.');
      return;
    }
    const reason = cancelReason === 'Autre' ? otherReason.trim() || 'Autre' : cancelReason;
    try {
      await updateStatus.mutateAsync({
        id: lesson!.id,
        status: 'cancelled',
        cancelled_reason: reason,
      });
      onClose();
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function saveFeedback() {
    setSaving(true);
    const { error } = await supabase
      .from('lessons')
      .update({
        feedback: feedback || null,
        rating: rating || null,
        status: 'completed',
      } as never)
      .eq('id', lesson!.id);
    setSaving(false);
    if (error) return Alert.alert('Erreur', error.message);
    qc.invalidateQueries({ queryKey: ['lessons'] });
    onClose();
  }

  const date = new Date(lesson.scheduled_at);
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const hourLabel = `${String(date.getHours()).padStart(2, '0')}h00`;
  const studentProfile = (lesson as unknown as {
    students?: { profiles?: { first_name: string; last_name: string } | null } | null;
  }).students?.profiles;
  const studentName = studentProfile
    ? `${studentProfile.first_name} ${studentProfile.last_name[0] ?? ''}.`
    : null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text text-lg font-bold">
          {lesson.student_id == null ? 'Créneau libre' : 'Séance'}
        </Text>
        <Badge label={statusLabel(lesson.status)} tone={STATUS_TONE[lesson.status] ?? 'neutral'} />
      </View>

      {/* détail harmonisé avec le sheet élève */}
      <View className="bg-card2 rounded-2xl px-4 py-3 mb-3 gap-2.5">
        <DetailRow icon="calendar" label="Quand" value={`${dateLabel} · ${hourLabel}`} />
        <DetailRow icon="car" label="Type" value={typeLabel(lesson.type)} />
        <DetailRow icon="clock" label="Durée" value={`${lesson.duration_minutes ?? 60} min`} />
        {studentName ? <DetailRow icon="user" label="Élève" value={studentName} /> : null}
        {lesson.pickup_address ? (
          <DetailRow icon="pin" label="Lieu de RDV" value={lesson.pickup_address} />
        ) : null}
      </View>

      {cancelMode ? (
        <View className="gap-2 mb-2">
          <Text className="text-muted2 text-[10px] uppercase tracking-wider">
            Motif d'annulation
          </Text>
          {CANCEL_REASONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setCancelReason(r)}
              className={`bg-card2 border rounded-2xl px-3 py-2.5 ${
                cancelReason === r ? 'border-instructor' : 'border-border'
              }`}
            >
              <Text className="text-text text-sm">{r}</Text>
            </Pressable>
          ))}
          {cancelReason === 'Autre' ? (
            <TextInput
              value={otherReason}
              onChangeText={setOtherReason}
              placeholder="Précise le motif…"
              placeholderTextColor="#454B57"
              className="bg-card2 border border-border rounded-2xl px-3 py-2.5 text-text"
            />
          ) : null}
          <View className="flex-row gap-2 mt-1">
            <View className="flex-1">
              <Button label="Retour" variant="outline" onPress={() => setCancelMode(false)} />
            </View>
            <View className="flex-1">
              <Button
                label="Confirmer annulation"
                variant="danger"
                onPress={confirmCancel}
                loading={updateStatus.isPending}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-2 mb-3">
          {lesson.status === 'pending' ? (
            <Button
              label="Confirmer la séance"
              variant="instructor"
              onPress={() => setStatus('confirmed')}
              loading={updateStatus.isPending}
            />
          ) : null}

          {lesson.status === 'confirmed' ? (
            <>
              <Text className="text-muted2 text-[10px] uppercase tracking-wider mt-1">
                Retour post-séance
              </Text>
              <View className="flex-row gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setRating(n)}>
                    <Icon
                      name="star"
                      size={26}
                      color={n <= rating ? '#FFB230' : '#454B57'}
                      fill={n <= rating ? '#FFB230' : 'none'}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                placeholder="Commentaire pour l'élève…"
                placeholderTextColor="#454B57"
                multiline
                value={feedback}
                onChangeText={setFeedback}
                className="bg-card2 border border-border rounded-2xl px-3 py-2.5 text-text min-h-[80px]"
              />
              <Button
                label={saving ? '…' : 'Marquer terminée'}
                variant="student"
                onPress={saveFeedback}
                loading={saving}
              />
            </>
          ) : null}

          {(lesson.status === 'pending' || lesson.status === 'confirmed') ? (
            <Button
              label="Annuler la séance"
              variant="danger"
              onPress={() => setCancelMode(true)}
            />
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <Icon name={icon} size={15} color="#878D9A" />
      <Text className="text-muted2 text-[10px] uppercase tracking-wider w-20">{label}</Text>
      <Text className="text-text text-[13px] font-medium flex-1 text-right">{value}</Text>
    </View>
  );
}
