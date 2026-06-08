-- ============================================================
-- DriveApp - Migration 019 : fix student_balance (Cartesian bug)
-- ============================================================
-- La vue d'origine (schema.sql) joint LEFT JOIN payments puis LEFT JOIN
-- lessons sans relier les deux : Postgres produit un produit cartésien
-- (N paiements × M leçons) → SUM(hours_purchased) compte chaque paiement
-- M fois, COUNT(lessons) compte chaque leçon N fois.
--
-- Exemple réel : 1 paiement de 5h + 1 paiement pending + 8 séances actives
--   Attendu : 5 − 8 = −3
--   Bug     : (5+0)×8 = 40 puis filter succeeded → 5×8 = 40 / hmm en fait
--             FILTER restreint aux lignes où status='succeeded' : 1×8 lignes
--             pour le paiement succeeded → SUM = 5×8 = 40 ; COUNT lessons
--             = 8×2 = 16 → balance = 24 au lieu de −3.
--
-- Impact :
--   - Soldes affichés faux dans toute l'app (instructor home, planning,
--     student planning, BookSlotSheet)
--   - Tri élèves par solde croissant dégradé
--   - Détection slot CRITIQUE faussée (balance utilisé comme entrée)
--   - Auto-cancel-48h prend des décisions sur la mauvaise balance
--
-- Fix : sous-requêtes scalaires (zéro join → zéro cartésien).
-- ============================================================

DROP VIEW IF EXISTS student_balance;

CREATE VIEW student_balance AS
SELECT
  s.id AS student_id,
  COALESCE(
    (SELECT SUM(hours_purchased)
       FROM payments
      WHERE student_id = s.id
        AND status = 'succeeded'),
    0
  )::INT AS hours_paid,
  COALESCE(
    (SELECT COUNT(*)
       FROM lessons
      WHERE student_id = s.id
        AND status IN ('confirmed', 'completed', 'pending')),
    0
  )::INT AS hours_booked,
  COALESCE(
    (SELECT SUM(hours_purchased)
       FROM payments
      WHERE student_id = s.id
        AND status = 'succeeded'),
    0
  )::INT
  - COALESCE(
    (SELECT COUNT(*)
       FROM lessons
      WHERE student_id = s.id
        AND status IN ('confirmed', 'completed', 'pending')),
    0
  )::INT AS balance_hours
FROM students s;
