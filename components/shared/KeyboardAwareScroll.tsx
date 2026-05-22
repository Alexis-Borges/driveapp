import { forwardRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

/**
 * ScrollView qui garde les champs visibles quand le clavier s'ouvre.
 * - iOS : automaticallyAdjustKeyboardInsets ajuste l'inset automatiquement.
 * - Android : softwareKeyboardLayoutMode "resize" (défaut Expo) redimensionne
 *   déjà la fenêtre, le ScrollView suit.
 * 100 % JS — déployable via `eas update` (aucun module natif).
 */
export const KeyboardAwareScroll = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAwareScroll(props, ref) {
    return (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        {...props}
      />
    );
  }
);
