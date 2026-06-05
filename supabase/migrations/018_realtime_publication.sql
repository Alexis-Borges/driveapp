-- ============================================================
-- DriveApp - Migration 018 : garantir le realtime sur messages + lessons
-- ============================================================
-- Le realtime postgres_changes nécessite (1) la table dans la publication
-- supabase_realtime et (2) REPLICA IDENTITY FULL pour que les filtres RLS
-- s'appliquent à chaque event. schema.sql le faisait mais n'est pas rejoué
-- par `supabase db push` — on le rend idempotent ici.

-- REPLICA IDENTITY FULL : indispensable pour que Realtime envoie la ligne
-- complète et applique la RLS sur chaque change.
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE lessons REPLICA IDENTITY FULL;

-- Ajout à la publication (ignore si déjà présent).
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
