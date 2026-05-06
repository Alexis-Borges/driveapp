import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Privacy() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-3 py-2 flex-row items-center gap-2 border-b border-border">
        <Pressable
          onPress={() => router.back()}
          className="w-8 h-8 rounded-lg bg-card border border-border items-center justify-center"
        >
          <Text className="text-muted text-sm">‹</Text>
        </Pressable>
        <Text className="text-text text-base font-bold">Politique de confidentialité</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-muted2 text-[10px] uppercase mb-4">RGPD · Dernière mise à jour : 2026</Text>

        <Block title="Responsable du traitement">
          DriveApp SAS, [adresse à compléter], dpo@driveapp.fr
        </Block>

        <Block title="Données collectées">
          Identité (nom, prénom, email, téléphone), géolocalisation (lieu de prise en charge),
          paiements (via Stripe — DriveApp ne stocke jamais de coordonnées bancaires),
          historique des séances et compétences acquises, conversations avec le moniteur,
          tokens de notifications push.
        </Block>

        <Block title="Finalités">
          Fournir le service (planification, paiement, suivi), envoyer les notifications
          fonctionnelles, établir les factures (obligation comptable 10 ans), améliorer
          l'application (analytics anonymisées).
        </Block>

        <Block title="Bases légales">
          Exécution du contrat (CGU acceptées à l'inscription), obligations légales
          (facturation), intérêt légitime (sécurité, prévention fraude).
        </Block>

        <Block title="Durée de conservation">
          Compte actif : pendant toute la durée d'utilisation. Après suppression de compte :
          factures et paiements conservés 10 ans (obligation légale), reste anonymisé sous
          30 jours.
        </Block>

        <Block title="Sous-traitants">
          Supabase (hébergement données — UE), Stripe (paiements — UE), Expo (push
          notifications — US, encadré par les SCC). Aucune revente à des tiers.
        </Block>

        <Block title="Tes droits (RGPD)">
          Accès, rectification, effacement, portabilité, opposition, limitation. Exerce ces
          droits depuis l'écran « Profil » → « Données personnelles » ou en écrivant à
          dpo@driveapp.fr. Tu peux saisir la CNIL à tout moment (cnil.fr).
        </Block>

        <Block title="Cookies / traceurs">
          L'application n'utilise pas de cookies tiers publicitaires. Les traceurs analytics
          sont anonymisés (PostHog, Sentry).
        </Block>

        <Text className="text-muted2 text-[10px] mt-6 italic">
          Document à faire valider par un DPO ou un juriste RGPD avant production.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-text text-sm font-bold mb-1.5">{title}</Text>
      <Text className="text-muted text-[12px] leading-5">{children}</Text>
    </View>
  );
}
