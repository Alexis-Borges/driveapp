-- ============================================================
-- DriveApp - Migration 016 : fix handle_new_user (search_path + EXCEPTION)
-- ============================================================
-- Corrige 2 défauts du trigger 015 :
--   1. search_path explicite (sinon "user_role" enum introuvable si schéma pas dans path)
--   2. EXCEPTION qui ne bloque pas le signup même si l'insert profile échoue

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_role_val public.user_role;
  referrer_uuid UUID;
BEGIN
  BEGIN
    user_role_val := COALESCE((meta->>'role')::public.user_role, 'student'::public.user_role);
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'student'::public.user_role;
  END;

  -- profiles
  BEGIN
    INSERT INTO public.profiles (id, role, first_name, last_name, email)
    VALUES (
      NEW.id,
      user_role_val,
      COALESCE(meta->>'first_name', ''),
      COALESCE(meta->>'last_name', ''),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: %', SQLERRM;
  END;

  -- role-specific row
  IF user_role_val = 'student' THEN
    BEGIN
      referrer_uuid := NULL;
      IF (meta->>'referral_code') IS NOT NULL AND (meta->>'referral_code') <> '' THEN
        SELECT id INTO referrer_uuid
        FROM public.students
        WHERE referral_code = upper(meta->>'referral_code')
        LIMIT 1;
      END IF;

      INSERT INTO public.students (id, instructor_id, referred_by, referral_code)
      VALUES (
        NEW.id,
        NULLIF(meta->>'invited_by', '')::UUID,
        referrer_uuid,
        ''
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user student insert failed: %', SQLERRM;
    END;

  ELSIF user_role_val = 'instructor' THEN
    BEGIN
      INSERT INTO public.instructors (id, agreement_number)
      VALUES (
        NEW.id,
        COALESCE(NULLIF(meta->>'agreement_number', ''), 'PENDING-' || left(NEW.id::text, 8))
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user instructor insert failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
