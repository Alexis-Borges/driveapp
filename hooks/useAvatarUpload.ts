import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const BUCKET = 'avatars';

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

export function usePickAndUploadAvatar() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Not authenticated');

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Permission photo refusée');

      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (pick.canceled || !pick.assets[0]) throw new Error('cancelled');

      const asset = pick.assets[0];
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const buffer = await uriToArrayBuffer(asset.uri);

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: asset.mimeType ?? `image/${ext}`,
          upsert: true,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url } as never)
        .eq('id', profile.id);
      if (updErr) throw updErr;

      return url;
    },
    onSuccess: (url) => {
      if (profile) setProfile({ ...profile, avatar_url: url } as never);
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
