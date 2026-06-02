// Feedback tactile pour les actions importantes (réservation, confirmation,
// annulation, suppression). Wrapper sûr : silencieux si expo-haptics n'est
// pas dispo ou sur un device qui ne le supporte pas.
//
// Convention :
//   tap()     → action légère (tap d'un bouton non destructif)
//   success() → confirmation positive (réservation, paiement OK)
//   warning() → avertissement (annulation, action destructive)
//   error()   → échec de mutation

type ImpactStyle = 'Light' | 'Medium' | 'Heavy';
type NotificationStyle = 'Success' | 'Warning' | 'Error';

function impact(style: ImpactStyle) {
  try {
    const Haptics = require('expo-haptics') as typeof import('expo-haptics');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]).catch(() => {});
  } catch {
    // module absent ou plateforme non supportée
  }
}

function notification(style: NotificationStyle) {
  try {
    const Haptics = require('expo-haptics') as typeof import('expo-haptics');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType[style]).catch(() => {});
  } catch {
    // module absent ou plateforme non supportée
  }
}

export const haptics = {
  tap: () => impact('Light'),
  success: () => notification('Success'),
  warning: () => notification('Warning'),
  error: () => notification('Error'),
};
