-- ============================================================
-- DriveApp - Migration 011 : compétences REMC + livret apprentissage
-- ============================================================
-- Référentiel Éducatif de la Conduite (REMC) — 4 compétences générales,
-- chacune subdivisée en sous-compétences. On stocke un état "atteint /
-- en cours / non abordé" par couple (élève, sous-compétence).

-- Compétences référentielles (read-only, seedées)
CREATE TABLE IF NOT EXISTS competences (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES competences(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "competences_public_read" ON competences;
CREATE POLICY "competences_public_read" ON competences
  FOR SELECT USING (TRUE);

-- Seed REMC (4 compétences générales + sous-compétences principales)
INSERT INTO competences (id, parent_id, label, sort_order) VALUES
  ('C1', NULL, 'Maîtriser la maniabilité du véhicule', 1),
  ('C1.1', 'C1', 'S''installer au poste de conduite', 1),
  ('C1.2', 'C1', 'Démarrer / s''arrêter en sécurité', 2),
  ('C1.3', 'C1', 'Utiliser les commandes (boîte, embrayage)', 3),
  ('C1.4', 'C1', 'Maîtriser les manœuvres', 4),

  ('C2', NULL, 'Appréhender la route et circuler', 2),
  ('C2.1', 'C2', 'Tourner à droite / à gauche', 1),
  ('C2.2', 'C2', 'Franchir intersections et giratoires', 2),
  ('C2.3', 'C2', 'Détecter, analyser, réagir', 3),
  ('C2.4', 'C2', 'Adapter l''allure et les trajectoires', 4),

  ('C3', NULL, 'Circuler dans des conditions difficiles et partager la route', 3),
  ('C3.1', 'C3', 'Conduire de nuit / par temps dégradé', 1),
  ('C3.2', 'C3', 'Conduire sur autoroute', 2),
  ('C3.3', 'C3', 'Partager la route avec les autres usagers', 3),
  ('C3.4', 'C3', 'Anticiper et coopérer', 4),

  ('C4', NULL, 'Pratiquer une conduite autonome, sûre et économique', 4),
  ('C4.1', 'C4', 'Suivre un itinéraire de manière autonome', 1),
  ('C4.2', 'C4', 'Préparer et effectuer un voyage longue distance', 2),
  ('C4.3', 'C4', 'Conduire en éco-conduite', 3),
  ('C4.4', 'C4', 'Détecter une défaillance et l''anticiper', 4)
ON CONFLICT (id) DO NOTHING;

-- État des compétences par élève
CREATE TABLE IF NOT EXISTS student_competences (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  competence_id TEXT NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'acquired')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  PRIMARY KEY (student_id, competence_id)
);

ALTER TABLE student_competences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competences_party_read" ON student_competences;
CREATE POLICY "competences_party_read" ON student_competences
  FOR SELECT USING (
    student_id = auth.uid()
    OR student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  );

DROP POLICY IF EXISTS "competences_instructor_write" ON student_competences;
CREATE POLICY "competences_instructor_write" ON student_competences
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
    AND updated_by = auth.uid()
  );

DROP POLICY IF EXISTS "competences_instructor_update" ON student_competences;
CREATE POLICY "competences_instructor_update" ON student_competences
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  )
  WITH CHECK (updated_by = auth.uid());
