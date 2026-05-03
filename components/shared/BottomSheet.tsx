import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/70" onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="bg-card rounded-t-3xl">
        <View className="items-center pt-3 pb-2">
          <View className="w-9 h-1 rounded-full bg-border" />
        </View>
        <View className="px-5 pb-4">{children}</View>
      </SafeAreaView>
    </Modal>
  );
}
