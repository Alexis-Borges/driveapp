-- ============================================================
-- DriveApp - Migration 022 : pause déjeuner configurable
-- ============================================================
-- La pause de 13 h était codée en dur dans lib/planning.ts : aucun moniteur
-- ne pouvait ouvrir ce créneau, même s'il travaille sur cette plage.
-- Un moniteur indépendant gère ses propres horaires.
--
-- FALSE par défaut : le comportement actuel (13 h fermé) reste celui de
-- tout le monde tant que le moniteur ne l'active pas explicitement.

ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS works_lunch_hour BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN instructors.works_lunch_hour IS
  'Le moniteur accepte les séances sur le créneau de 13 h (pause déjeuner par défaut).';
