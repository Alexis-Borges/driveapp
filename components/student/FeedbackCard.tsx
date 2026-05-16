import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useUpdateStudentComment } from '../../hooks/useLessons';
import { Icon } from '../ui/Icon';

type Props = {
  author: string;
  date: string;
  body: string;
  rating: number;
  lessonId?: string;
  studentComment?: string | null;
};

export function FeedbackCard({ author, date, body, rating, lessonId, studentComment }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(studentComment ?? '');
  const update = useUpdateStudentComment();

  async function save() {
    if (!lessonId) return;
    try {
      await update.mutateAsync({ id: lessonId, comment: draft });
      setEditing(false);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur');
    }
  }

  return (
    <View className="mx-5 mb-2 bg-card border border-border rounded-2xl px-3 py-3">
      <View className="flex-row justify-between mb-2">
        <Text className="text-muted text-xs font-bold">{author}</Text>
        <Text className="text-muted2 text-[10px]">{date}</Text>
      </View>
      <Text className="text-text text-[11px] leading-5 mb-2">{body}</Text>
      <View className="flex-row gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon
            key={n}
            name="star"
            size={14}
            color={n <= rating ? '#FFB230' : '#454B57'}
            fill={n <= rating ? '#FFB230' : 'none'}
          />
        ))}
      </View>

      {lessonId ? (
        <View className="mt-3 pt-2.5 border-t border-border">
          {editing ? (
            <>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ta réponse au moniteur…"
                placeholderTextColor="#454B57"
                multiline
                className="bg-card2 border border-border rounded-xl px-2.5 py-2 text-text text-[11px] min-h-[60px]"
              />
              <View className="flex-row gap-2 mt-2">
                <Pressable
                  onPress={() => {
                    setEditing(false);
                    setDraft(studentComment ?? '');
                  }}
                  className="flex-1 bg-card2 border border-border rounded-xl py-2 items-center"
                >
                  <Text className="text-muted text-[11px] font-bold">Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={save}
                  disabled={update.isPending}
                  className="flex-1 bg-student rounded-xl py-2 items-center"
                >
                  <Text className="text-[#0a1a14] text-[11px] font-bold">
                    {update.isPending ? '…' : 'Envoyer'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : studentComment ? (
            <Pressable onPress={() => setEditing(true)}>
              <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-1">
                Ta réponse
              </Text>
              <Text className="text-text text-[11px] leading-5">{studentComment}</Text>
              <Text className="text-student text-[10px] font-bold mt-1">Modifier ✎</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditing(true)} className="flex-row items-center gap-1">
              <Text className="text-student text-[11px] font-bold">+ Répondre</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
