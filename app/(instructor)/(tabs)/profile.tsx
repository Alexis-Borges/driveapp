import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { track } from '../../../lib/observability';
import { Button } from '../../../components/ui/Button';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { AvatarPicker } from '../../../components/shared/AvatarPicker';
import { EditProfileSheet } from '../../../components/shared/EditProfileSheet';
import { StripeConnectCard } from '../../../components/instructor/StripeConnectCard';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { AppFooter } from '../../../components/shared/AppFooter';
import { RgpdSection } from '../../../components/shared/RgpdSection';
import { useAuthStore } from '../../../stores/authStore';
import { confirmSignOut } from '../../../hooks/useAuth';
import { useInstructorSelf } from '../../../hooks/useInstructorSelf';

function Field({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <View className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-0.5">{label}</Text>
        <Text className="text-text text-sm font-medium">{value || '—'}</Text>
      </View>
      <Icon name={locked ? 'lock' : 'edit'} size={14} color="#454B57" />
    </View>
  );
}

function NavRow({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-3 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={16} color="#878D9A" />
        <Text className="text-text text-sm">{label}</Text>
      </View>
      <Icon name="chevron-right" size={16} color="#454B57" />
    </Pressable>
  );
}

export default function InstructorProfile() {
  const profile = useAuthStore((s) => s.profile);
  const { data: instr } = useInstructorSelf();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  // Pas de forme genrée : le libellé s'affiche à l'identique pour tout le monde.
  const bioParts: string[] = ['Enseignant·e agréé·e'];
  if (instr?.experience_years) bioParts.push(`${instr.experience_years} ans d'exp.`);
  if (instr?.zone_geo) bioParts.push(instr.zone_geo);
  const bioLine = bioParts.join(' · ');

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center pt-5 pb-2 gap-2">
          <AvatarPicker variant="instructor" size={72} />
          <Text className="text-text text-lg font-bold">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text className="text-muted text-xs">{bioLine}</Text>
        </View>

        <SectionLabel>Mon code élève</SectionLabel>
        <View className="mx-5 mb-2 bg-instructor/8 border border-instructor/20 rounded-2xl px-3 py-3">
          <Text className="text-muted text-[11px] leading-5 mb-3">
            Communique ce code à tes élèves : ils le saisissent dans l'app pour
            rejoindre ton planning. Il se dicte au téléphone, contrairement à
            une adresse email.
          </Text>
          <View className="bg-bg border border-border rounded-xl px-3 py-2.5 flex-row justify-between items-center">
            <Text className="text-instructor font-mono text-base tracking-wider">
              {instr?.invite_code ?? '—'}
            </Text>
            <Text
              accessibilityRole="button"
              onPress={async () => {
                const code = instr?.invite_code ?? '';
                if (!code) return;
                await Clipboard.setStringAsync(code);
                track('instructor_code_copied');
                Alert.alert('Copié', `Code ${code} copié dans le presse-papiers.`);
              }}
              className="bg-instructor rounded-md px-3 py-1 text-[11px] font-bold text-[#0f0d2b]"
            >
              Copier
            </Text>
          </View>
        </View>

        <SectionLabel>Paiements</SectionLabel>
        <StripeConnectCard />
        <NavRow
          icon="trending"
          label="Mes revenus"
          onPress={() => router.push('/(instructor)/revenue')}
        />

        <SectionLabel>Mon activité</SectionLabel>
        <NavRow
          icon="refresh"
          label="Créneaux récurrents"
          onPress={() => router.push('/(instructor)/recurring')}
        />
        <NavRow
          icon="calendar"
          label="Mes congés"
          onPress={() => router.push('/(instructor)/leaves')}
        />

        <SectionLabel>Informations</SectionLabel>
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Prénom & Nom" value={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`} />
        </Pressable>
        <Field label="Email" value={profile?.email ?? ''} locked />
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Téléphone" value={profile?.phone ?? ''} />
        </Pressable>
        <Field label="N° Agrément" value={instr?.agreement_number ?? ''} locked />
        <Pressable onPress={() => setEditOpen(true)}>
          <Field
            label="Années d'expérience"
            value={instr?.experience_years ? `${instr.experience_years} ans` : ''}
          />
        </Pressable>
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Zone géographique" value={instr?.zone_geo ?? ''} />
        </Pressable>
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Description" value={profile?.bio ?? ''} />
        </Pressable>

        <SectionLabel>Confidentialité</SectionLabel>
        <RgpdSection />

        <View className="px-5 mt-6">
          <Button label="Modifier mon profil" variant="instructor" onPress={() => setEditOpen(true)} />
        </View>
        <View className="px-5 mt-2">
          <Button label="Se déconnecter" onPress={confirmSignOut} variant="danger" />
        </View>

        <AppFooter />
      </ScrollView>

      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        variant="instructor"
      />
    </SafeAreaView>
  );
}
