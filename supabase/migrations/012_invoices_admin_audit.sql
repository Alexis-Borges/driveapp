-- ============================================================
-- DriveApp - Migration 012 : factures, rôle admin, audit log
-- ============================================================

-- ------------------------------------------------------------
-- Numérotation factures (FR : séquence stricte)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  amount_cents_ht INT NOT NULL,
  vat_rate_bps INT NOT NULL DEFAULT 2000, -- 20.00 %
  amount_cents_ttc INT NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id, issued_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_self_read" ON invoices;
CREATE POLICY "invoices_self_read" ON invoices
  FOR SELECT USING (
    student_id = auth.uid()
    OR student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  );

-- Séquence annuelle pour la numérotation
CREATE SEQUENCE IF NOT EXISTS invoices_seq;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  yr TEXT := to_char(NOW(), 'YYYY');
  n INT := nextval('invoices_seq');
BEGIN
  RETURN 'FA-' || yr || '-' || lpad(n::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Rôle admin
-- ------------------------------------------------------------
-- profiles.role contient déjà 'admin' (enum). On ajoute une check policy
-- réutilisable + un helper.
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Admin peut tout lire (sur toutes tables sensibles)
DROP POLICY IF EXISTS "admin_all_read_lessons" ON lessons;
CREATE POLICY "admin_all_read_lessons" ON lessons
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_all_read_payments" ON payments;
CREATE POLICY "admin_all_read_payments" ON payments
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_all_read_invoices" ON invoices;
CREATE POLICY "admin_all_read_invoices" ON invoices
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_all_read_profiles" ON profiles;
CREATE POLICY "admin_all_read_profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

-- ------------------------------------------------------------
-- Audit log (trace des actions sensibles : refund, suppression compte…)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_time ON audit_log(action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_read" ON audit_log;
CREATE POLICY "audit_admin_read" ON audit_log
  FOR SELECT USING (is_admin(auth.uid()));

-- ------------------------------------------------------------
-- Vérification d'email obligatoire avant réservation
-- (déclencheur défensif côté serveur en plus de la policy client)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION require_verified_email()
RETURNS TRIGGER AS $$
DECLARE
  confirmed TIMESTAMPTZ;
BEGIN
  IF NEW.student_id IS NOT NULL AND (OLD.student_id IS NULL OR OLD.student_id <> NEW.student_id) THEN
    SELECT email_confirmed_at INTO confirmed FROM auth.users WHERE id = NEW.student_id;
    IF confirmed IS NULL THEN
      RAISE EXCEPTION 'Email non vérifié — confirmez votre adresse pour réserver.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lessons_require_verified_email ON lessons;
CREATE TRIGGER lessons_require_verified_email BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION require_verified_email();
