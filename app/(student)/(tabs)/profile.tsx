import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { AvatarPicker } from '../../../components/shared/AvatarPicker';
import { EditProfileSheet } from '../../../components/shared/EditProfileSheet';
import { LinkInstructorSheet } from '../../../components/student/LinkInstructorSheet';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { AppFooter } from '../../../components/shared/AppFooter';
import { useAuthStore } from '../../../stores/authStore';
import { confirmSignOut } from '../../../hooks/useAuth';
import { useStudentPackage } from '../../../hooks/useBalance';

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

export default function StudentProfile() {
  const profile = useAuthStore((s) => s.profile);
  const { data: pkg } = useStudentPackage();
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center pt-5 pb-2 gap-2">
          <AvatarPicker variant="student" size={72} />
          <Text className="text-text text-lg font-bold">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text className="text-muted text-xs">Élève en formation</Text>
        </View>

        <SectionLabel>Informations</SectionLabel>
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Prénom & Nom" value={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`} />
        </Pressable>
        <Field label="Email" value={profile?.email ?? ''} locked />
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Téléphone" value={profile?.phone ?? ''} />
        </Pressable>
        <Field
          label="Forfait actif"
          value={
            pkg?.package_total_hours
              ? `${pkg.package_total_hours}h${pkg.package_started_at ? ` · démarré ${new Date(pkg.package_started_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}` : ''}`
              : '—'
          }
          locked
        />
        <Pressable onPress={() => setEditOpen(true)}>
          <Field label="Description" value={profile?.bio ?? ''} />
        </Pressable>

        <View className="px-5 mt-6 gap-2">
          <Button label="Modifier mon profil" variant="student" onPress={() => setEditOpen(true)} />
          {!pkg?.instructor_id ? (
            <Button label="Lier mon moniteur" variant="outline" onPress={() => setLinkOpen(true)} />
          ) : null}
          <Button label="Se déconnecter" onPress={confirmSignOut} variant="danger" />
        </View>

        <AppFooter />
      </ScrollView>

      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        variant="student"
      />
      <LinkInstructorSheet visible={linkOpen} onClose={() => setLinkOpen(false)} />
    </SafeAreaView>
  );
}
