import Constants from 'expo-constants';

// Le client Expo Go n'embarque pas les modules natifs tiers (Stripe...).
// On désactive les écrans concernés quand l'app tourne dedans (preview sans
// compte Apple Developer / build EAS).
export const isExpoGo = Constants.appOwnership === 'expo';
