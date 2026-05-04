import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../shared/BottomSheet';
import { Button } from '../ui/Button';
import { useUpdateLessonStatus, type Lesson } from '../../hooks/useLessons';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

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

  const time = new Date(lesson.scheduled_at).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-text text-base font-bold mb-1">Séance · {time}</Text>
      <Text className="text-muted text-xs mb-4">Statut actuel : {lesson.status}</Text>

      {lesson.student_id == null ? (
        <Text className="text-muted2 text-xs mb-4">Créneau libre.</Text>
      ) : null}

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
              label="✓ Confirmer la séance"
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
                    <Text className={`text-2xl ${n <= rating ? 'text-warning' : 'text-muted2'}`}>
                      ★
                    </Text>
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
                label={saving ? '…' : '✓ Marquer terminée'}
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
