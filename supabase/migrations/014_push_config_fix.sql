-- ============================================================
-- DriveApp - Migration 014 : config push sans ALTER DATABASE
-- ============================================================
-- Supabase hosted ne permet pas ALTER DATABASE postgres SET app.*.
-- On stocke supabase_url + service_role_key dans une table privée
-- lisible uniquement par le rôle postgres (utilisé par les triggers).

CREATE TABLE IF NOT EXISTS _app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE _app_config ENABLE ROW LEVEL SECURITY;
-- Aucune policy => personne d'autre que le rôle postgres (bypass RLS) ne lit.

-- ------------------------------------------------------------
-- ⚠️ À EXÉCUTER À LA MAIN une seule fois après la migration :
-- ⚠️ Remplace les deux placeholders par tes vraies valeurs.
-- ------------------------------------------------------------
-- INSERT INTO _app_config (key, value)
-- VALUES
--   ('supabase_url', 'https://gaqivtanxcqcekfdzlfk.supabase.co'),
--   ('service_role_key', 'sb_secret_xxx_ta_vraie_clé')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Helper : lit une config par clé
CREATE OR REPLACE FUNCTION app_config(p_key TEXT)
RETURNS TEXT AS $$
  SELECT value FROM _app_config WHERE key = p_key;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Réécriture des 2 helpers de push
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION call_send_push(p_user_id UUID, p_title TEXT, p_body TEXT)
RETURNS VOID AS $$
DECLARE
  base_url TEXT := app_config('supabase_url');
  service_key TEXT := app_config('service_role_key');
BEGIN
  IF base_url IS NULL OR service_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION call_send_push_with_data(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB
) RETURNS VOID AS $$
DECLARE
  base_url TEXT := app_config('supabase_url');
  service_key TEXT := app_config('service_role_key');
BEGIN
  IF base_url IS NULL OR service_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
