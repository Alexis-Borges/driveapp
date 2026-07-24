import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          className="flex-1 bg-black/70"
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} className="bg-card rounded-t-3xl">
          <View className="items-center pt-3 pb-2">
            <View className="w-9 h-1 rounded-full bg-border" />
          </View>
          {/* Pas de automaticallyAdjustKeyboardInsets ici : le
              KeyboardAvoidingView ci-dessus décale déjà la feuille, et sur iOS
              les deux s'additionnent — la feuille remontait trop haut. */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            style={{ maxHeight: 560 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
