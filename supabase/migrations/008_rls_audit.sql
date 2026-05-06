-- ============================================================
-- DriveApp - Migration 008 : audit RLS complet (sécurité prod)
-- ============================================================
-- Active RLS partout et pose des policies strictes : un user ne peut
-- voir/modifier que ses propres données (ou celles dont il est partie prenante).

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_or_linked_read" ON profiles;
DROP POLICY IF EXISTS "profiles_self_write" ON profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON profiles;

-- Lecture : soi-même + son moniteur lié + ses élèves liés (pour afficher noms/avatars)
CREATE POLICY "profiles_self_or_linked_read" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
    OR id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  );

CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_self_write" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- instructors
-- ------------------------------------------------------------
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instructors_self_or_linked_read" ON instructors;
DROP POLICY IF EXISTS "instructors_self_write" ON instructors;
DROP POLICY IF EXISTS "instructors_self_insert" ON instructors;

CREATE POLICY "instructors_self_or_linked_read" ON instructors
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
  );

CREATE POLICY "instructors_self_insert" ON instructors
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "instructors_self_write" ON instructors
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_self_or_instructor_read" ON students;
DROP POLICY IF EXISTS "students_self_write" ON students;
DROP POLICY IF EXISTS "students_self_insert" ON students;
DROP POLICY IF EXISTS "students_instructor_link_update" ON students;

CREATE POLICY "students_self_or_instructor_read" ON students
  FOR SELECT USING (
    id = auth.uid()
    OR instructor_id = auth.uid()
  );

CREATE POLICY "students_self_insert" ON students
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "students_self_write" ON students
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- lessons
-- ------------------------------------------------------------
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_party_read" ON lessons;
DROP POLICY IF EXISTS "lessons_instructor_write" ON lessons;
DROP POLICY IF EXISTS "lessons_instructor_insert" ON lessons;
DROP POLICY IF EXISTS "lessons_student_book" ON lessons;
DROP POLICY IF EXISTS "lessons_student_cancel" ON lessons;

-- Lecture : moniteur sur ses cours, élève sur ses cours, élève sur slots libres de son moniteur
CREATE POLICY "lessons_party_read" ON lessons
  FOR SELECT USING (
    instructor_id = auth.uid()
    OR student_id = auth.uid()
    OR (
      student_id IS NULL
      AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
    )
  );

-- Insert : seul un moniteur crée des slots pour lui-même
CREATE POLICY "lessons_instructor_insert" ON lessons
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid())
  );

-- Update : moniteur sur ses cours
CREATE POLICY "lessons_instructor_write" ON lessons
  FOR UPDATE USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Update : élève qui réserve un slot libre du moniteur lié
CREATE POLICY "lessons_student_book" ON lessons
  FOR UPDATE USING (
    student_id IS NULL
    AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
  )
  WITH CHECK (
    student_id = auth.uid()
    AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
  );

-- Update : élève qui annule sa propre séance (>=48h vérifié côté client + trigger)
CREATE POLICY "lessons_student_cancel" ON lessons
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_self_read" ON payments;
DROP POLICY IF EXISTS "payments_instructor_read" ON payments;

-- Élève voit ses paiements
CREATE POLICY "payments_self_read" ON payments
  FOR SELECT USING (student_id = auth.uid());

-- Moniteur voit les paiements de ses élèves
CREATE POLICY "payments_instructor_read" ON payments
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  );

-- Pas d'INSERT/UPDATE en direct : passe forcément par l'edge function (service role)

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_party_read" ON messages;
DROP POLICY IF EXISTS "messages_sender_insert" ON messages;
DROP POLICY IF EXISTS "messages_recipient_mark_read" ON messages;

CREATE POLICY "messages_party_read" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "messages_sender_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Élève → son moniteur
      recipient_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
      -- Moniteur → un de ses élèves
      OR recipient_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
    )
  );

CREATE POLICY "messages_recipient_mark_read" ON messages
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ------------------------------------------------------------
-- referrals
-- ------------------------------------------------------------
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_party_read" ON referrals;

CREATE POLICY "referrals_party_read" ON referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- INSERT/UPDATE : trigger DB seulement (SECURITY DEFINER)

-- ------------------------------------------------------------
-- Index supplémentaires pour perfs
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_scheduled
  ON lessons (instructor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lessons_student_scheduled
  ON lessons (student_id, scheduled_at) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_student
  ON payments (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair_time
  ON messages (sender_id, recipient_id, created_at);
