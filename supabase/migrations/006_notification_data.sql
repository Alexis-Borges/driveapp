-- ============================================================
-- DriveApp - Migration 006 : payloads `data` typés sur les notifs
-- ============================================================
-- Le client lit `data.type` pour router (chat / booking / cancel).

CREATE OR REPLACE FUNCTION call_send_push_with_data(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB
) RETURNS VOID AS $$
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
      'body', p_body,
      'data', p_data
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Réservation
CREATE OR REPLACE FUNCTION notify_lesson_booked()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
BEGIN
  IF NEW.student_id IS NOT NULL AND (OLD.student_id IS NULL OR OLD.student_id <> NEW.student_id) THEN
    SELECT first_name || ' ' || left(last_name, 1) || '.' INTO student_name
    FROM profiles WHERE id = NEW.student_id;

    PERFORM call_send_push_with_data(
      NEW.instructor_id,
      'Nouvelle demande de réservation',
      coalesce(student_name, 'Un élève') || ' veut réserver le ' ||
        to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM HH24h'),
      jsonb_build_object('type', 'booking', 'lesson_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirmation/annulation
CREATE OR REPLACE FUNCTION notify_lesson_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NOT NULL AND OLD.status <> NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM call_send_push_with_data(
        NEW.student_id,
        'Séance confirmée ✓',
        'Ta séance du ' ||
          to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24h') ||
          ' est confirmée.',
        jsonb_build_object('type', 'booking', 'lesson_id', NEW.id)
      );
    ELSIF NEW.status IN ('cancelled', 'auto_cancelled') THEN
      PERFORM call_send_push_with_data(
        NEW.student_id,
        'Séance annulée',
        coalesce(NEW.cancelled_reason, 'Ta séance a été annulée.'),
        jsonb_build_object('type', 'cancel', 'lesson_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nouveau message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT first_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  PERFORM call_send_push_with_data(
    NEW.recipient_id,
    'Message de ' || coalesce(sender_name, 'DriveApp'),
    left(NEW.content, 120),
    jsonb_build_object('type', 'message', 'chat_with', NEW.sender_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
