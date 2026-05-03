-- ============================================================
-- DriveApp - Migration 004 : récompense parrainage automatique
-- ============================================================
-- Au premier paiement réussi d'un élève parrainé, on crée la row
-- referrals avec reward_type pour le parrain.

CREATE OR REPLACE FUNCTION grant_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  referrer UUID;
  prior_count INT;
BEGIN
  IF NEW.status <> 'succeeded' THEN
    RETURN NEW;
  END IF;
  IF OLD IS NOT NULL AND OLD.status = 'succeeded' THEN
    RETURN NEW;
  END IF;

  SELECT referred_by INTO referrer FROM students WHERE id = NEW.student_id;
  IF referrer IS NULL THEN
    RETURN NEW;
  END IF;

  -- premier paiement réussi de cet élève uniquement
  SELECT count(*) INTO prior_count
  FROM payments
  WHERE student_id = NEW.student_id AND status = 'succeeded' AND id <> NEW.id;
  IF prior_count > 0 THEN
    RETURN NEW;
  END IF;

  -- récompense : séance offerte si pack >= 5h, sinon -50€
  INSERT INTO referrals (referrer_id, referred_id, reward_type)
  VALUES (
    referrer,
    NEW.student_id,
    CASE WHEN NEW.hours_purchased >= 5 THEN 'free_lesson' ELSE 'discount_50' END
  )
  ON CONFLICT (referrer_id, referred_id) DO NOTHING;

  -- notif au parrain
  PERFORM call_send_push(
    referrer,
    '🎁 Récompense parrainage',
    'Ton filleul vient de payer son premier forfait — tu reçois ta récompense.'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS payments_grant_referral ON payments;
CREATE TRIGGER payments_grant_referral
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW EXECUTE FUNCTION grant_referral_reward();
