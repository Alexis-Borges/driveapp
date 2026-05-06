import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function CGU() {
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
        <Text className="text-text text-base font-bold">Conditions Générales d'Utilisation</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-muted2 text-[10px] uppercase mb-4">Dernière mise à jour : 2026</Text>

        <Section title="1. Objet">
          DriveApp (« l'Application ») met en relation des moniteurs d'auto-école indépendants
          et des élèves en formation à la conduite, et leur fournit des outils de planification,
          paiement et suivi pédagogique.
        </Section>

        <Section title="2. Inscription">
          L'inscription requiert une adresse email valide. Les moniteurs doivent fournir un
          numéro d'agrément préfectoral en cours de validité. Les élèves mineurs doivent
          obtenir l'autorisation d'un représentant légal (conduite accompagnée à partir de 15 ans,
          conduite supervisée à partir de 18 ans, permis B à partir de 17 ans).
        </Section>

        <Section title="3. Tarifs et paiements">
          Les tarifs des heures de conduite sont fixés librement par chaque moniteur. Le
          paiement s'effectue via Stripe Connect. DriveApp prélève une commission de 15 % sur
          chaque transaction. Les paiements en 3× sans frais sont assurés par notre partenaire
          financier sous réserve d'éligibilité.
        </Section>

        <Section title="4. Annulation et règle des 48h">
          Toute séance non payée 48 heures avant son début est automatiquement annulée. Un
          élève peut annuler sa séance jusqu'à 48 h avant sans frais ; passé ce délai, la
          séance est due. Le moniteur peut annuler à tout moment en motivant.
        </Section>

        <Section title="5. Comportement">
          Tout propos injurieux, discriminatoire ou frauduleux entraîne la suspension immédiate
          du compte. DriveApp se réserve le droit de modérer les échanges et de signaler aux
          autorités compétentes tout comportement illégal.
        </Section>

        <Section title="6. Responsabilité">
          DriveApp est un intermédiaire technique. La responsabilité pédagogique et la sécurité
          pendant la conduite incombent au moniteur agréé. DriveApp ne saurait être tenu pour
          responsable d'un accident, d'un échec à l'examen, ou d'un litige entre moniteur et
          élève.
        </Section>

        <Section title="7. Propriété intellectuelle">
          L'Application, sa marque et son contenu sont la propriété exclusive de DriveApp SAS.
          Toute reproduction est interdite sans autorisation.
        </Section>

        <Section title="8. Droit applicable">
          Les présentes CGU sont soumises au droit français. En cas de litige et après
          tentative de conciliation, le tribunal compétent est celui du siège social de
          DriveApp SAS.
        </Section>

        <Text className="text-muted2 text-[10px] mt-6 italic">
          Document à faire valider par un avocat avant mise en production. Ces clauses sont
          fournies à titre indicatif et ne constituent pas un conseil juridique.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-text text-sm font-bold mb-1.5">{title}</Text>
      <Text className="text-muted text-[12px] leading-5">{children}</Text>
    </View>
  );
}
