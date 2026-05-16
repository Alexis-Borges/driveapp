-- ============================================================
-- DriveApp - Migration 015 : trigger auth.users → profiles + role row
-- ============================================================
-- Crée automatiquement la row profiles + students/instructors quand un
-- nouveau user s'inscrit (à partir des metadata passées dans signUp).
-- Évite le problème RLS quand la session n'est pas encore active.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_role_val user_role;
  referrer_uuid UUID;
BEGIN
  user_role_val := COALESCE((meta->>'role')::user_role, 'student'::user_role);

  -- profiles
  INSERT INTO profiles (id, role, first_name, last_name, email)
  VALUES (
    NEW.id,
    user_role_val,
    COALESCE(meta->>'first_name', ''),
    COALESCE(meta->>'last_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- role-specific row
  IF user_role_val = 'student' THEN
    referrer_uuid := NULL;
    IF (meta->>'referral_code') IS NOT NULL AND (meta->>'referral_code') <> '' THEN
      SELECT id INTO referrer_uuid
      FROM students
      WHERE referral_code = upper(meta->>'referral_code')
      LIMIT 1;
    END IF;

    INSERT INTO students (id, instructor_id, referred_by, referral_code)
    VALUES (
      NEW.id,
      NULLIF(meta->>'invited_by', '')::UUID,
      referrer_uuid,
      ''  -- généré par students_generate_code trigger
    )
    ON CONFLICT (id) DO NOTHING;

  ELSIF user_role_val = 'instructor' THEN
    INSERT INTO instructors (id, agreement_number)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(meta->>'agreement_number', ''), 'PENDING-' || left(NEW.id::text, 8))
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
