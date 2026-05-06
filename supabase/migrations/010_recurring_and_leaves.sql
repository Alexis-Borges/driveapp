-- ============================================================
-- DriveApp - Migration 010 : récurrence créneaux + congés moniteur
-- ============================================================

-- Table des règles de récurrence (créneaux hebdomadaires)
CREATE TABLE IF NOT EXISTS recurring_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=dimanche
  hour SMALLINT NOT NULL CHECK (hour BETWEEN 6 AND 22),
  type TEXT NOT NULL DEFAULT 'city',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (instructor_id, weekday, hour)
);

CREATE INDEX IF NOT EXISTS idx_recurring_slots_instructor
  ON recurring_slots (instructor_id) WHERE active = TRUE;

ALTER TABLE recurring_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_slots_owner" ON recurring_slots;
CREATE POLICY "recurring_slots_owner" ON recurring_slots
  FOR ALL USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Table des congés moniteur (jours/plages bloquées)
CREATE TABLE IF NOT EXISTS instructor_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_instructor_leaves
  ON instructor_leaves (instructor_id, starts_at, ends_at);

ALTER TABLE instructor_leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaves_owner_or_student" ON instructor_leaves;
CREATE POLICY "leaves_owner_or_student" ON instructor_leaves
  FOR SELECT USING (
    instructor_id = auth.uid()
    OR instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "leaves_owner_write" ON instructor_leaves;
CREATE POLICY "leaves_owner_write" ON instructor_leaves
  FOR INSERT WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "leaves_owner_update" ON instructor_leaves;
CREATE POLICY "leaves_owner_update" ON instructor_leaves
  FOR UPDATE USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "leaves_owner_delete" ON instructor_leaves;
CREATE POLICY "leaves_owner_delete" ON instructor_leaves
  FOR DELETE USING (instructor_id = auth.uid());

-- Lieu de prise en charge sur lessons
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION;
