-- ============================================================
-- DriveApp - Migration 002 : push tokens + storage bucket
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Table des tokens Expo
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_inserts_own_token" ON push_tokens;
DROP POLICY IF EXISTS "user_views_own_token" ON push_tokens;
DROP POLICY IF EXISTS "user_deletes_own_token" ON push_tokens;

CREATE POLICY "user_inserts_own_token" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_views_own_token" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_deletes_own_token" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Storage bucket pour avatars
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policies storage
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_write" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
