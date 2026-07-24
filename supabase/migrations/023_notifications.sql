-- ============================================================
-- DriveApp - Migration 023 : centre de notifications
-- ============================================================
-- Les push étaient envoyés à Expo puis oubliés : une notification ratée
-- (téléphone éteint, permission refusée, notification balayée) était perdue
-- définitivement. On les persiste pour offrir un historique consultable.
--
-- Tous les envois passent par l'edge function send-push — y compris ceux
-- déclenchés par les triggers DB via call_send_push. C'est donc le seul
-- point d'insertion à instrumenter pour tout capter.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  -- Reprend le payload du push : permet de router vers l'écran concerné.
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La liste est toujours lue par destinataire, du plus récent au plus ancien.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Index partiel : le badge ne compte que les non lues.
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Lecture et mise à jour réservées au destinataire. Aucune policy INSERT :
-- seul le service_role (send-push) écrit, et il bypasse la RLS.
DROP POLICY IF EXISTS "user_views_own_notifications" ON notifications;
CREATE POLICY "user_views_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_updates_own_notifications" ON notifications;
CREATE POLICY "user_updates_own_notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_deletes_own_notifications" ON notifications;
CREATE POLICY "user_deletes_own_notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Marque toutes les notifications non lues du porteur du token.
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  touched INTEGER;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  UPDATE notifications
     SET read_at = NOW()
   WHERE user_id = caller AND read_at IS NULL;

  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END;
$$;

REVOKE ALL ON FUNCTION mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- Realtime : le badge doit se mettre à jour sans rafraîchissement manuel.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
