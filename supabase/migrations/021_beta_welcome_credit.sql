-- ============================================================
-- DriveApp - Migration 021 : crédit de bienvenue (phase de bêta)
-- ============================================================
-- ⚠️ TEMPORAIRE — à retirer avant l'ouverture au public.
--
-- Réserver un créneau exige un solde > 0 (BookSlotSheet), et le solde ne
-- monte que par un paiement Stripe abouti. Tant que Stripe n'est pas
-- branché, aucun élève ne peut réserver : le cœur du produit est
-- intestable.
--
-- On crédite donc 5 h à chaque nouvel élève sous forme d'un paiement
-- marqué, sur le même canal que la vue student_balance (qui somme les
-- payments 'succeeded'). 5 h laisse de quoi réserver plusieurs séances
-- tout en permettant d'atteindre le dépassement, donc de tester les
-- alertes moniteur et la règle des 48 h.
--
-- Pour révoquer :
--   DROP TRIGGER students_beta_credit ON students;
--   DELETE FROM payments WHERE stripe_payment_intent_id LIKE 'pi_beta_credit_%';

-- payments.stripe_payment_intent_id n'a pas de contrainte UNIQUE : on ne
-- peut pas s'appuyer sur ON CONFLICT, d'où la garde NOT EXISTS.
CREATE OR REPLACE FUNCTION grant_beta_welcome_credit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payments (
    student_id,
    amount_cents,
    hours_purchased,
    plan,
    status,
    stripe_payment_intent_id,
    paid_at
  )
  SELECT
    NEW.id,
    0,                       -- offert : aucun encaissement réel
    5,
    'one_shot',
    'succeeded',             -- seul statut compté par student_balance
    'pi_beta_credit_' || replace(NEW.id::text, '-', ''),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM payments
    WHERE stripe_payment_intent_id = 'pi_beta_credit_' || replace(NEW.id::text, '-', '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- AFTER INSERT : la ligne students doit exister avant que payments la
-- référence.
DROP TRIGGER IF EXISTS students_beta_credit ON students;
CREATE TRIGGER students_beta_credit AFTER INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION grant_beta_welcome_credit();

-- Rattrapage des élèves déjà inscrits qui n'ont aucun paiement abouti.
INSERT INTO payments (
  student_id, amount_cents, hours_purchased, plan, status,
  stripe_payment_intent_id, paid_at
)
SELECT
  s.id, 0, 5, 'one_shot', 'succeeded',
  'pi_beta_credit_' || replace(s.id::text, '-', ''), NOW()
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM payments p
  WHERE p.student_id = s.id AND p.status = 'succeeded'
);
