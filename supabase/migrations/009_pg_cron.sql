-- ============================================================
-- DriveApp - Migration 009 : pg_cron schedulers
-- ============================================================
-- Schedule auto-cancel-48h et lesson-reminders toutes les heures.
-- Nécessite : extensions pg_cron + pg_net (Supabase les fournit).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper : appelle une edge function en HTTP POST avec service role
CREATE OR REPLACE FUNCTION call_edge_function(fn_name TEXT)
RETURNS BIGINT AS $$
DECLARE
  url TEXT := current_setting('app.supabase_url', true) || '/functions/v1/' || fn_name;
  service_key TEXT := current_setting('app.service_role_key', true);
BEGIN
  IF service_key IS NULL OR service_key = '' THEN
    RAISE NOTICE 'app.service_role_key not set — skipping %', fn_name;
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unschedule existing (idempotent)
SELECT cron.unschedule(jobid) FROM cron.job
  WHERE jobname IN ('driveapp-auto-cancel-48h', 'driveapp-lesson-reminders');

-- Auto-cancel : toutes les heures à h:05
SELECT cron.schedule(
  'driveapp-auto-cancel-48h',
  '5 * * * *',
  $$SELECT call_edge_function('auto-cancel-48h')$$
);

-- Rappels J-1 : toutes les heures à h:15
SELECT cron.schedule(
  'driveapp-lesson-reminders',
  '15 * * * *',
  $$SELECT call_edge_function('lesson-reminders')$$
);

-- ============================================================
-- Configuration : à exécuter UNE FOIS dans Supabase SQL editor
-- ============================================================
-- ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
-- (puis SELECT pg_reload_conf();)
