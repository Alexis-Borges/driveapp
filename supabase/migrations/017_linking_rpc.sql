-- ============================================================
-- DriveApp - Migration 017 : RPC de liaison moniteur ↔ élève
-- ============================================================
-- Les RLS de `profiles` empêchent un user de voir un profil non lié.
-- La liaison passe donc par 2 fonctions SECURITY DEFINER qui valident
-- auth.uid() en interne et bypassent la RLS de façon contrôlée.

-- Élève → se lie à un moniteur via son email
CREATE OR REPLACE FUNCTION link_to_instructor(p_instructor_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_role user_role;
  instr_id UUID;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO caller_role FROM profiles WHERE id = caller;
  IF caller_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Action réservée aux élèves';
  END IF;

  SELECT id INTO instr_id
  FROM profiles
  WHERE lower(email) = lower(trim(p_instructor_email))
    AND role = 'instructor'
  LIMIT 1;

  IF instr_id IS NULL THEN
    RAISE EXCEPTION 'Aucun moniteur trouvé avec cet email';
  END IF;

  UPDATE students SET instructor_id = instr_id WHERE id = caller;

  RETURN jsonb_build_object('instructor_id', instr_id);
END;
$$;

-- Moniteur → rattache un élève existant via son email
CREATE OR REPLACE FUNCTION link_student_by_email(p_student_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_role user_role;
  stu_id UUID;
  stu_role user_role;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO caller_role FROM profiles WHERE id = caller;
  IF caller_role IS DISTINCT FROM 'instructor' THEN
    RAISE EXCEPTION 'Action réservée aux moniteurs';
  END IF;

  SELECT id, role INTO stu_id, stu_role
  FROM profiles
  WHERE lower(email) = lower(trim(p_student_email))
  LIMIT 1;

  IF stu_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  IF stu_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Cet utilisateur n''est pas un élève';
  END IF;

  UPDATE students SET instructor_id = caller WHERE id = stu_id;

  RETURN jsonb_build_object('found', true, 'student_id', stu_id);
END;
$$;

REVOKE ALL ON FUNCTION link_to_instructor(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION link_student_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_to_instructor(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_student_by_email(TEXT) TO authenticated;
