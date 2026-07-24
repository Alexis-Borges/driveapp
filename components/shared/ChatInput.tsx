import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { haptics } from '../../lib/haptics';

type Props = {
  onSend: (text: string) => void | Promise<void>;
  variant: 'instructor' | 'student';
};

export function ChatInput({ onSend, variant }: Props) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const accent = variant === 'instructor' ? 'bg-instructor' : 'bg-student';
  const arrowColor = variant === 'instructor' ? '#fff' : '#0a1a14';

  async function send() {
    const t = value.trim();
    if (!t) return;
    // tap plutôt que success : on envoie des dizaines de messages, une
    // vibration de confirmation à chaque fois serait pénible.
    haptics.tap();
    setSending(true);
    try {
      await onSend(t);
      setValue('');
    } catch {
      haptics.error();
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="px-3 py-2.5 border-t border-border flex-row items-center gap-2 bg-bg">
      <TextInput
        className="flex-1 bg-card border border-border rounded-full px-3 py-2 text-text"
        placeholder="Ton message…"
        placeholderTextColor="#454B57"
        value={value}
        onChangeText={setValue}
        editable={!sending}
        onSubmitEditing={send}
        returnKeyType="send"
        // Sans blurOnSubmit, la touche « envoyer » du clavier laisse le champ
        // focalisé et le clavier ouvert.
        blurOnSubmit
        maxLength={2000}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Envoyer le message"
        onPress={send}
        disabled={sending || !value.trim()}
        className={`${accent} w-9 h-9 rounded-full items-center justify-center ${sending || !value.trim() ? 'opacity-50' : ''}`}
      >
        <Icon name="send" size={16} color={arrowColor} fill={arrowColor} />
      </Pressable>
    </View>
  );
}
