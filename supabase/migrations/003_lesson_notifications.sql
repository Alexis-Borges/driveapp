-- ============================================================
-- DriveApp - Migration 003 : trigger notifications réservation/message
-- ============================================================
-- Hypothèse : extension `pg_net` activée (Supabase l'expose).
-- Permet d'appeler l'edge function send-push depuis Postgres.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- helper : appelle send-push de manière non-bloquante
CREATE OR REPLACE FUNCTION call_send_push(p_user_id UUID, p_title TEXT, p_body TEXT)
RETURNS VOID AS $$
DECLARE
  url TEXT := current_setting('app.supabase_url', true) || '/functions/v1/send-push';
  service_key TEXT := current_setting('app.service_role_key', true);
BEGIN
  IF service_key IS NULL OR service_key = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := url,
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

-- Trigger : quand un élève réserve un créneau (student_id passe de NULL à NOT NULL)
CREATE OR REPLACE FUNCTION notify_lesson_booked()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
BEGIN
  IF NEW.student_id IS NOT NULL AND (OLD.student_id IS NULL OR OLD.student_id <> NEW.student_id) THEN
    SELECT first_name || ' ' || left(last_name, 1) || '.' INTO student_name
    FROM profiles WHERE id = NEW.student_id;

    PERFORM call_send_push(
      NEW.instructor_id,
      'Nouvelle demande de réservation',
      coalesce(student_name, 'Un élève') || ' veut réserver le ' ||
        to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM HH24h')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lessons_notify_booked ON lessons;
CREATE TRIGGER lessons_notify_booked AFTER UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION notify_lesson_booked();

-- Trigger : confirmation moniteur → notif élève
CREATE OR REPLACE FUNCTION notify_lesson_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NOT NULL AND OLD.status <> NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM call_send_push(
        NEW.student_id,
        'Séance confirmée ✓',
        'Ta séance du ' ||
          to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24h') ||
          ' est confirmée.'
      );
    ELSIF NEW.status IN ('cancelled', 'auto_cancelled') THEN
      PERFORM call_send_push(
        NEW.student_id,
        'Séance annulée',
        coalesce(NEW.cancelled_reason, 'Ta séance a été annulée.')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lessons_notify_status ON lessons;
CREATE TRIGGER lessons_notify_status AFTER UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION notify_lesson_status_change();

-- Trigger : nouveau message → notif destinataire
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT first_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  PERFORM call_send_push(
    NEW.recipient_id,
    'Message de ' || coalesce(sender_name, 'DriveApp'),
    left(NEW.content, 120)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS messages_notify ON messages;
CREATE TRIGGER messages_notify AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- ============================================================
-- Configuration : à exécuter dans Supabase une seule fois
-- ============================================================
-- ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
