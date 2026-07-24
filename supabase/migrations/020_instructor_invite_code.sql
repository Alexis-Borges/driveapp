-- ============================================================
-- DriveApp - Migration 020 : code d'invitation moniteur
-- ============================================================
-- Jusqu'ici l'élève devait saisir l'EMAIL de son moniteur pour se lier
-- (link_to_instructor). Peu pratique : c'est une donnée perso, impossible
-- à dicter au téléphone sans faute de frappe.
--
-- On donne au moniteur un code court sur le modèle du code de parrainage
-- élève (PRENOM + chiffres) : dictable, mémorisable, non sensible.
-- Les deux autres chemins (invitation par email, lien de partage) restent
-- en place — ce code s'ajoute, il ne remplace rien.

ALTER TABLE instructors ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Génère un code stable à la création d'un moniteur.
-- Même forme que generate_referral_code, mais sur son propre espace de noms :
-- l'unicité n'est vérifiée que parmi les moniteurs.
CREATE OR REPLACE FUNCTION generate_instructor_code()
RETURNS TRIGGER AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  SELECT UPPER(regexp_replace(COALESCE(first_name, ''), '[^A-Za-zÀ-ÿ]', '', 'g'))
    INTO base_code
    FROM profiles WHERE id = NEW.id;

  -- Prénom absent ou non alphabétique → préfixe neutre plutôt qu'un code
  -- réduit aux seuls chiffres.
  IF base_code IS NULL OR base_code = '' THEN
    base_code := 'MONITEUR';
  END IF;

  final_code := base_code || (FLOOR(RANDOM() * 100))::TEXT;
  WHILE EXISTS (SELECT 1 FROM instructors WHERE invite_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || (FLOOR(RANDOM() * 1000))::TEXT;
    IF counter > 10 THEN
      final_code := base_code || left(replace(gen_random_uuid()::text, '-', ''), 4);
      EXIT;
    END IF;
  END LOOP;

  NEW.invite_code := final_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS instructors_generate_code ON instructors;
CREATE TRIGGER instructors_generate_code BEFORE INSERT ON instructors
  FOR EACH ROW WHEN (NEW.invite_code IS NULL OR NEW.invite_code = '')
  EXECUTE FUNCTION generate_instructor_code();

-- Rattrapage des moniteurs déjà créés (la colonne vient d'apparaître).
DO $$
DECLARE
  r RECORD;
  base_code TEXT;
  final_code TEXT;
BEGIN
  FOR r IN SELECT i.id FROM instructors i WHERE i.invite_code IS NULL OR i.invite_code = '' LOOP
    SELECT UPPER(regexp_replace(COALESCE(first_name, ''), '[^A-Za-zÀ-ÿ]', '', 'g'))
      INTO base_code FROM profiles WHERE id = r.id;
    IF base_code IS NULL OR base_code = '' THEN
      base_code := 'MONITEUR';
    END IF;
    final_code := base_code || (FLOOR(RANDOM() * 100))::TEXT;
    WHILE EXISTS (SELECT 1 FROM instructors WHERE invite_code = final_code) LOOP
      final_code := base_code || left(replace(gen_random_uuid()::text, '-', ''), 4);
    END LOOP;
    UPDATE instructors SET invite_code = final_code WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_instructors_invite_code
  ON instructors(invite_code);

-- ------------------------------------------------------------
-- RPC : élève → se lie à un moniteur via son code
-- ------------------------------------------------------------
-- Même contrat que link_to_instructor (SECURITY DEFINER, valide auth.uid()
-- en interne) : les RLS de `profiles` empêchent l'élève de lire le profil
-- d'un moniteur auquel il n'est pas encore rattaché.
CREATE OR REPLACE FUNCTION link_to_instructor_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_role user_role;
  instr_id UUID;
  clean_code TEXT := upper(trim(COALESCE(p_code, '')));
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF clean_code = '' THEN
    RAISE EXCEPTION 'Code manquant';
  END IF;

  SELECT role INTO caller_role FROM profiles WHERE id = caller;
  IF caller_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Action réservée aux élèves';
  END IF;

  SELECT id INTO instr_id FROM instructors WHERE invite_code = clean_code LIMIT 1;

  IF instr_id IS NULL THEN
    RAISE EXCEPTION 'Code invalide';
  END IF;

  UPDATE students SET instructor_id = instr_id WHERE id = caller;

  RETURN jsonb_build_object('instructor_id', instr_id);
END;
$$;

REVOKE ALL ON FUNCTION link_to_instructor_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_to_instructor_by_code(TEXT) TO authenticated;
