-- ============================================================
-- DriveApp - Migration 007 : éviter les chevauchements de créneaux
-- ============================================================
-- Empêche un moniteur d'avoir deux créneaux non annulés à la même heure.

CREATE UNIQUE INDEX IF NOT EXISTS unique_instructor_slot
  ON lessons (instructor_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'auto_cancelled');
