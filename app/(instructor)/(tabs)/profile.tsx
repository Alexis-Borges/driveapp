import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { AvatarPicker } from '../../../components/shared/AvatarPicker';
import { EditProfileSheet } from '../../../components/shared/EditProfileSheet';
import { StripeConnectCard } from '../../../components/instructor/StripeConnectCard';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { useAuthStore } from '../../../stores/authStore';
import { confirmSignOut } from '../../../hooks/useAuth';

function Field({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <View className="mx-5 mb-1.5 bg-card border border-border rounded-2xl px-3 py-2.5 flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-muted2 text-[9px] uppercase tracking-wider mb-0.5">{label}</Text>
        <Text className="text-text text-sm font-medium">{value || '—'}</Text>
      </View>
      <Text className="text-muted2 text-xs">{locked ? '🔒' : '✎'}</Text>
    </View>
  );
}

export default function InstructorProfile() {
  const profile = useAuthStore((s) => s.profile);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center pt-5 pb-2 gap-2">
          <AvatarPicker variant="instructor" size={72} />
          <Text className="text-text text-lg font-bold">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text className="text-muted text-xs">Monitrice de conduite</Text>
        </View>

        <SectionLabel>Paiements</SectionLabel>
        <StripeConnectCard />

        <SectionLabel>Informations</SectionLabel>
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Prénom & Nom" value={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`} />
        </Pressable>
        <Field label="Email" value={profile?.email ?? ''} locked />
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Téléphone" value={profile?.phone ?? ''} />
        </Pressable>
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Description" value={profile?.bio ?? ''} />
        </Pressable>

        <View className="px-5 mt-6">
          <Button label="Modifier mon profil" variant="instructor" onPress={() => setEditOpen(true)} />
        </View>
        <View className="px-5 mt-2">
          <Button label="Se déconnecter" onPress={confirmSignOut} variant="danger" />
        </View>
      </ScrollView>

      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        variant="instructor"
      />
    </SafeAreaView>
  );
}
