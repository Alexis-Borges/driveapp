-- ============================================================
-- DriveApp — Schéma consolidé
-- ============================================================
-- Snapshot complet de la base après migration 019, à utiliser pour un
-- déploiement Supabase from scratch (un seul fichier à exécuter).
--
-- Pour un projet existant : ne pas rejouer ce fichier, appliquer plutôt
-- les migrations incrémentales dans supabase/migrations/ (002 → 019+).
-- Les deux sources convergent vers le même état.
--
-- Idempotent : tout est en CREATE IF NOT EXISTS / OR REPLACE / DROP IF
-- EXISTS, donc rejouable sans casser une base déjà initialisée.
--
-- Ordre :
--   1. Extensions
--   2. Enums
--   3. Tables (ordre des dépendances)
--   4. Index
--   5. Séquences & vues
--   6. Functions (helpers, triggers, RPC)
--   7. Triggers
--   8. RLS — activation et policies
--   9. Permissions RPC
--  10. pg_cron schedulers
--  11. Realtime publication
--  12. Storage buckets
--  13. Seed REMC
--  14. Étapes manuelles à faire après ce fichier
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 2. ENUMS
-- ============================================================
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('instructor', 'student', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lesson_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'auto_cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lesson_type AS ENUM ('city', 'highway', 'parking', 'evaluation', 'mock_exam', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_plan AS ENUM ('one_shot', 'three_x'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- Table privée pour la config (URL Supabase + service_role_key).
-- Lue uniquement par les triggers SECURITY DEFINER (bypass RLS, aucune policy).
CREATE TABLE IF NOT EXISTS _app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Profils utilisateurs (extension de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instructors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_number TEXT UNIQUE NOT NULL,
  hourly_rate INTEGER NOT NULL DEFAULT 3000,
  zone_geo TEXT,
  experience_years INTEGER,
  stripe_account_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  package_total_hours INTEGER DEFAULT 0,
  package_started_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  type lesson_type DEFAULT 'city',
  status lesson_status DEFAULT 'pending',
  feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  student_comment TEXT,
  cancelled_reason TEXT,
  reminder_sent_at TIMESTAMPTZ,
  pickup_address TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  hours_purchased INTEGER NOT NULL,
  plan payment_plan DEFAULT 'one_shot',
  status payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  hour SMALLINT NOT NULL CHECK (hour BETWEEN 6 AND 22),
  type TEXT NOT NULL DEFAULT 'city',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (instructor_id, weekday, hour)
);

CREATE TABLE IF NOT EXISTS instructor_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

-- Référentiel REMC (4 compétences générales, 16 sous-compétences). Seedé plus bas.
CREATE TABLE IF NOT EXISTS competences (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES competences(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_competences (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  competence_id TEXT NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'acquired')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  PRIMARY KEY (student_id, competence_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  amount_cents_ht INT NOT NULL,
  vat_rate_bps INT NOT NULL DEFAULT 2000,
  amount_cents_ttc INT NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_referral_code         ON students(referral_code);
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_date        ON lessons(instructor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lessons_student                ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status                 ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_scheduled   ON lessons (instructor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lessons_student_scheduled      ON lessons (student_id, scheduled_at) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_student               ON payments(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status                ON payments(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation          ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair_time             ON messages (sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user               ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_slots_instructor     ON recurring_slots (instructor_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_instructor_leaves              ON instructor_leaves (instructor_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_invoices_student               ON invoices(student_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_time          ON audit_log(action, created_at DESC);

-- Empêche un moniteur d'avoir 2 créneaux non annulés à la même heure.
CREATE UNIQUE INDEX IF NOT EXISTS unique_instructor_slot
  ON lessons (instructor_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'auto_cancelled');

-- ============================================================
-- 5. SEQUENCES & VIEWS
-- ============================================================

-- Numérotation factures FR (séquence stricte).
CREATE SEQUENCE IF NOT EXISTS invoices_seq;

-- Vue solde élève — sous-requêtes scalaires (PAS de JOIN, sinon produit
-- cartésien avec payments × lessons → comptes faussés). Cf migration 019.
DROP VIEW IF EXISTS student_balance;
CREATE VIEW student_balance AS
SELECT
  s.id AS student_id,
  COALESCE(
    (SELECT SUM(hours_purchased) FROM payments
      WHERE student_id = s.id AND status = 'succeeded'),
    0
  )::INT AS hours_paid,
  COALESCE(
    (SELECT COUNT(*) FROM lessons
      WHERE student_id = s.id AND status IN ('confirmed', 'completed', 'pending')),
    0
  )::INT AS hours_booked,
  COALESCE(
    (SELECT SUM(hours_purchased) FROM payments
      WHERE student_id = s.id AND status = 'succeeded'),
    0
  )::INT
  - COALESCE(
    (SELECT COUNT(*) FROM lessons
      WHERE student_id = s.id AND status IN ('confirmed', 'completed', 'pending')),
    0
  )::INT AS balance_hours
FROM students s;

-- ============================================================
-- 6. FUNCTIONS — helpers / triggers / RPC
-- ============================================================

-- 6a. Maintenance générique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Génère un code parrainage stable à la création d'un élève.
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  SELECT UPPER(first_name) INTO base_code FROM profiles WHERE id = NEW.id;
  final_code := base_code || (FLOOR(RANDOM() * 100))::TEXT;
  WHILE EXISTS (SELECT 1 FROM students WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || (FLOOR(RANDOM() * 1000))::TEXT;
    IF counter > 10 THEN EXIT; END IF;
  END LOOP;
  NEW.referral_code := final_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6b. Config push (lecture _app_config)
CREATE OR REPLACE FUNCTION app_config(p_key TEXT)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT value FROM _app_config WHERE key = p_key;
$$;

-- Appelle une edge function en HTTP POST avec la clé service_role.
CREATE OR REPLACE FUNCTION call_edge_function(fn_name TEXT)
RETURNS BIGINT AS $$
DECLARE
  base_url TEXT := app_config('supabase_url');
  service_key TEXT := app_config('service_role_key');
BEGIN
  IF base_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'app_config manquant — skip %', fn_name;
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := base_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Push simple
CREATE OR REPLACE FUNCTION call_send_push(p_user_id UUID, p_title TEXT, p_body TEXT)
RETURNS VOID AS $$
DECLARE
  base_url TEXT := app_config('supabase_url');
  service_key TEXT := app_config('service_role_key');
BEGIN
  IF base_url IS NULL OR service_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Push avec payload data (type / lesson_id / chat_with) lu par le client pour router.
CREATE OR REPLACE FUNCTION call_send_push_with_data(
  p_user_id UUID, p_title TEXT, p_body TEXT, p_data JSONB
) RETURNS VOID AS $$
DECLARE
  base_url TEXT := app_config('supabase_url');
  service_key TEXT := app_config('service_role_key');
BEGIN
  IF base_url IS NULL OR service_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'data', p_data)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6c. Triggers métier

-- Notif moniteur quand un élève réserve un slot libre.
CREATE OR REPLACE FUNCTION notify_lesson_booked()
RETURNS TRIGGER AS $$
DECLARE student_name TEXT;
BEGIN
  IF NEW.student_id IS NOT NULL AND (OLD.student_id IS NULL OR OLD.student_id <> NEW.student_id) THEN
    SELECT first_name || ' ' || left(last_name, 1) || '.' INTO student_name
    FROM profiles WHERE id = NEW.student_id;
    PERFORM call_send_push_with_data(
      NEW.instructor_id,
      'Nouvelle demande de réservation',
      coalesce(student_name, 'Un élève') || ' veut réserver le ' ||
        to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM HH24h'),
      jsonb_build_object('type', 'booking', 'lesson_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notif élève sur changement de statut (confirmation / annulation).
CREATE OR REPLACE FUNCTION notify_lesson_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NOT NULL AND OLD.status <> NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM call_send_push_with_data(
        NEW.student_id,
        'Séance confirmée',
        'Ta séance du ' || to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24h') || ' est confirmée.',
        jsonb_build_object('type', 'booking', 'lesson_id', NEW.id)
      );
    ELSIF NEW.status IN ('cancelled', 'auto_cancelled') THEN
      PERFORM call_send_push_with_data(
        NEW.student_id,
        'Séance annulée',
        coalesce(NEW.cancelled_reason, 'Ta séance a été annulée.'),
        jsonb_build_object('type', 'cancel', 'lesson_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notif destinataire pour chaque nouveau message.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE sender_name TEXT;
BEGIN
  SELECT first_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  PERFORM call_send_push_with_data(
    NEW.recipient_id,
    'Message de ' || coalesce(sender_name, 'DriveApp'),
    left(NEW.content, 120),
    jsonb_build_object('type', 'message', 'chat_with', NEW.sender_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Au premier paiement succeeded d'un filleul, crée la récompense pour le parrain.
CREATE OR REPLACE FUNCTION grant_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  referrer UUID;
  prior_count INT;
BEGIN
  IF NEW.status <> 'succeeded' THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.status = 'succeeded' THEN RETURN NEW; END IF;

  SELECT referred_by INTO referrer FROM students WHERE id = NEW.student_id;
  IF referrer IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO prior_count
  FROM payments
  WHERE student_id = NEW.student_id AND status = 'succeeded' AND id <> NEW.id;
  IF prior_count > 0 THEN RETURN NEW; END IF;

  INSERT INTO referrals (referrer_id, referred_id, reward_type)
  VALUES (
    referrer,
    NEW.student_id,
    CASE WHEN NEW.hours_purchased >= 5 THEN 'free_lesson' ELSE 'discount_50' END
  )
  ON CONFLICT (referrer_id, referred_id) DO NOTHING;

  PERFORM call_send_push(
    referrer,
    'Récompense parrainage',
    'Ton filleul vient de payer son premier forfait — tu reçois ta récompense.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérification d'email obligatoire avant que l'élève ne réserve.
CREATE OR REPLACE FUNCTION require_verified_email()
RETURNS TRIGGER AS $$
DECLARE confirmed TIMESTAMPTZ;
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

-- 6d. Facturation
CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  yr TEXT := to_char(NOW(), 'YYYY');
  n INT := nextval('invoices_seq');
BEGIN
  RETURN 'FA-' || yr || '-' || lpad(n::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 6e. Admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

-- 6f. Refund (appelé par admin-refund edge function)
CREATE OR REPLACE FUNCTION refund_student_hours(p_student_id UUID, p_hours INT)
RETURNS VOID AS $$
BEGIN
  UPDATE students
     SET package_total_hours = GREATEST(0, package_total_hours - p_hours)
   WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6g. Provisioning auto à l'inscription (lit user_metadata).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_role_val public.user_role;
  referrer_uuid UUID;
BEGIN
  BEGIN
    user_role_val := COALESCE((meta->>'role')::public.user_role, 'student'::public.user_role);
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'student'::public.user_role;
  END;

  BEGIN
    INSERT INTO public.profiles (id, role, first_name, last_name, email)
    VALUES (
      NEW.id,
      user_role_val,
      COALESCE(meta->>'first_name', ''),
      COALESCE(meta->>'last_name', ''),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: %', SQLERRM;
  END;

  IF user_role_val = 'student' THEN
    BEGIN
      referrer_uuid := NULL;
      IF (meta->>'referral_code') IS NOT NULL AND (meta->>'referral_code') <> '' THEN
        SELECT id INTO referrer_uuid
        FROM public.students
        WHERE referral_code = upper(meta->>'referral_code')
        LIMIT 1;
      END IF;
      INSERT INTO public.students (id, instructor_id, referred_by, referral_code)
      VALUES (
        NEW.id,
        NULLIF(meta->>'invited_by', '')::UUID,
        referrer_uuid,
        ''
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user student insert failed: %', SQLERRM;
    END;
  ELSIF user_role_val = 'instructor' THEN
    BEGIN
      INSERT INTO public.instructors (id, agreement_number)
      VALUES (
        NEW.id,
        COALESCE(NULLIF(meta->>'agreement_number', ''), 'PENDING-' || left(NEW.id::text, 8))
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user instructor insert failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 6h. RPC de liaison moniteur ↔ élève (bypass RLS de profiles de manière contrôlée).
CREATE OR REPLACE FUNCTION link_to_instructor(p_instructor_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_role user_role;
  instr_id UUID;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT role INTO caller_role FROM profiles WHERE id = caller;
  IF caller_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Action réservée aux élèves';
  END IF;

  SELECT id INTO instr_id FROM profiles
  WHERE lower(email) = lower(trim(p_instructor_email)) AND role = 'instructor'
  LIMIT 1;

  IF instr_id IS NULL THEN RAISE EXCEPTION 'Aucun moniteur trouvé avec cet email'; END IF;

  UPDATE students SET instructor_id = instr_id WHERE id = caller;
  RETURN jsonb_build_object('instructor_id', instr_id);
END;
$$;

CREATE OR REPLACE FUNCTION link_student_by_email(p_student_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_role user_role;
  stu_id UUID;
  stu_role user_role;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT role INTO caller_role FROM profiles WHERE id = caller;
  IF caller_role IS DISTINCT FROM 'instructor' THEN
    RAISE EXCEPTION 'Action réservée aux moniteurs';
  END IF;

  SELECT id, role INTO stu_id, stu_role FROM profiles
  WHERE lower(email) = lower(trim(p_student_email))
  LIMIT 1;

  IF stu_id IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  IF stu_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Cet utilisateur n''est pas un élève';
  END IF;

  UPDATE students SET instructor_id = caller WHERE id = stu_id;
  RETURN jsonb_build_object('found', true, 'student_id', stu_id);
END;
$$;

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS lessons_updated_at ON lessons;
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS students_generate_code ON students;
CREATE TRIGGER students_generate_code BEFORE INSERT ON students
  FOR EACH ROW WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
  EXECUTE FUNCTION generate_referral_code();

DROP TRIGGER IF EXISTS lessons_notify_booked ON lessons;
CREATE TRIGGER lessons_notify_booked AFTER UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION notify_lesson_booked();

DROP TRIGGER IF EXISTS lessons_notify_status ON lessons;
CREATE TRIGGER lessons_notify_status AFTER UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION notify_lesson_status_change();

DROP TRIGGER IF EXISTS messages_notify ON messages;
CREATE TRIGGER messages_notify AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

DROP TRIGGER IF EXISTS payments_grant_referral ON payments;
CREATE TRIGGER payments_grant_referral
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW EXECUTE FUNCTION grant_referral_reward();

DROP TRIGGER IF EXISTS lessons_require_verified_email ON lessons;
CREATE TRIGGER lessons_require_verified_email BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION require_verified_email();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. RLS — activation + policies
-- ============================================================
ALTER TABLE _app_config             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_leaves       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences             ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_competences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;
-- _app_config : aucune policy = seul le rôle postgres (bypass) lit. Voulu.

-- profiles
DROP POLICY IF EXISTS "profiles_self_or_linked_read" ON profiles;
CREATE POLICY "profiles_self_or_linked_read" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
  OR id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
);
DROP POLICY IF EXISTS "profiles_self_insert" ON profiles;
CREATE POLICY "profiles_self_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_self_write" ON profiles;
CREATE POLICY "profiles_self_write" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "admin_all_read_profiles" ON profiles;
CREATE POLICY "admin_all_read_profiles" ON profiles FOR SELECT USING (is_admin(auth.uid()));

-- instructors
DROP POLICY IF EXISTS "instructors_self_or_linked_read" ON instructors;
CREATE POLICY "instructors_self_or_linked_read" ON instructors FOR SELECT USING (
  id = auth.uid()
  OR id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "instructors_self_insert" ON instructors;
CREATE POLICY "instructors_self_insert" ON instructors FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "instructors_self_write" ON instructors;
CREATE POLICY "instructors_self_write" ON instructors FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- students
DROP POLICY IF EXISTS "students_self_or_instructor_read" ON students;
CREATE POLICY "students_self_or_instructor_read" ON students FOR SELECT USING (
  id = auth.uid() OR instructor_id = auth.uid()
);
DROP POLICY IF EXISTS "students_self_insert" ON students;
CREATE POLICY "students_self_insert" ON students FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "students_self_write" ON students;
CREATE POLICY "students_self_write" ON students FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- lessons
DROP POLICY IF EXISTS "lessons_party_read" ON lessons;
CREATE POLICY "lessons_party_read" ON lessons FOR SELECT USING (
  instructor_id = auth.uid()
  OR student_id = auth.uid()
  OR (student_id IS NULL AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid()))
);
DROP POLICY IF EXISTS "lessons_instructor_insert" ON lessons;
CREATE POLICY "lessons_instructor_insert" ON lessons FOR INSERT WITH CHECK (
  instructor_id = auth.uid() AND EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "lessons_instructor_write" ON lessons;
CREATE POLICY "lessons_instructor_write" ON lessons FOR UPDATE USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());
DROP POLICY IF EXISTS "lessons_student_book" ON lessons;
CREATE POLICY "lessons_student_book" ON lessons FOR UPDATE USING (
  student_id IS NULL AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
) WITH CHECK (
  student_id = auth.uid() AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "lessons_student_cancel" ON lessons;
CREATE POLICY "lessons_student_cancel" ON lessons FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "admin_all_read_lessons" ON lessons;
CREATE POLICY "admin_all_read_lessons" ON lessons FOR SELECT USING (is_admin(auth.uid()));

-- payments (pas d'INSERT/UPDATE direct — uniquement via edge function / service_role)
DROP POLICY IF EXISTS "payments_self_read" ON payments;
CREATE POLICY "payments_self_read" ON payments FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "payments_instructor_read" ON payments;
CREATE POLICY "payments_instructor_read" ON payments FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
);
DROP POLICY IF EXISTS "admin_all_read_payments" ON payments;
CREATE POLICY "admin_all_read_payments" ON payments FOR SELECT USING (is_admin(auth.uid()));

-- messages
DROP POLICY IF EXISTS "messages_party_read" ON messages;
CREATE POLICY "messages_party_read" ON messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
DROP POLICY IF EXISTS "messages_sender_insert" ON messages;
CREATE POLICY "messages_sender_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    recipient_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
    OR recipient_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "messages_recipient_mark_read" ON messages;
CREATE POLICY "messages_recipient_mark_read" ON messages FOR UPDATE USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- referrals
DROP POLICY IF EXISTS "referrals_party_read" ON referrals;
CREATE POLICY "referrals_party_read" ON referrals FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- push_tokens
DROP POLICY IF EXISTS "user_inserts_own_token" ON push_tokens;
DROP POLICY IF EXISTS "user_views_own_token" ON push_tokens;
DROP POLICY IF EXISTS "user_deletes_own_token" ON push_tokens;
CREATE POLICY "user_inserts_own_token" ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_views_own_token"   ON push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_deletes_own_token" ON push_tokens FOR DELETE USING (auth.uid() = user_id);

-- recurring_slots
DROP POLICY IF EXISTS "recurring_slots_owner" ON recurring_slots;
CREATE POLICY "recurring_slots_owner" ON recurring_slots FOR ALL
  USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

-- instructor_leaves
DROP POLICY IF EXISTS "leaves_owner_or_student" ON instructor_leaves;
CREATE POLICY "leaves_owner_or_student" ON instructor_leaves FOR SELECT USING (
  instructor_id = auth.uid()
  OR instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "leaves_owner_write" ON instructor_leaves;
CREATE POLICY "leaves_owner_write" ON instructor_leaves FOR INSERT WITH CHECK (instructor_id = auth.uid());
DROP POLICY IF EXISTS "leaves_owner_update" ON instructor_leaves;
CREATE POLICY "leaves_owner_update" ON instructor_leaves FOR UPDATE USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());
DROP POLICY IF EXISTS "leaves_owner_delete" ON instructor_leaves;
CREATE POLICY "leaves_owner_delete" ON instructor_leaves FOR DELETE USING (instructor_id = auth.uid());

-- competences (référentiel public, lecture seule)
DROP POLICY IF EXISTS "competences_public_read" ON competences;
CREATE POLICY "competences_public_read" ON competences FOR SELECT USING (TRUE);

-- student_competences
DROP POLICY IF EXISTS "competences_party_read" ON student_competences;
CREATE POLICY "competences_party_read" ON student_competences FOR SELECT USING (
  student_id = auth.uid()
  OR student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
);
DROP POLICY IF EXISTS "competences_instructor_write" ON student_competences;
CREATE POLICY "competences_instructor_write" ON student_competences FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
  AND updated_by = auth.uid()
);
DROP POLICY IF EXISTS "competences_instructor_update" ON student_competences;
CREATE POLICY "competences_instructor_update" ON student_competences FOR UPDATE
  USING (student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid()))
  WITH CHECK (updated_by = auth.uid());

-- invoices
DROP POLICY IF EXISTS "invoices_self_read" ON invoices;
CREATE POLICY "invoices_self_read" ON invoices FOR SELECT USING (
  student_id = auth.uid()
  OR student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
);
DROP POLICY IF EXISTS "admin_all_read_invoices" ON invoices;
CREATE POLICY "admin_all_read_invoices" ON invoices FOR SELECT USING (is_admin(auth.uid()));

-- audit_log
DROP POLICY IF EXISTS "audit_admin_read" ON audit_log;
CREATE POLICY "audit_admin_read" ON audit_log FOR SELECT USING (is_admin(auth.uid()));

-- ============================================================
-- 9. PERMISSIONS RPC
-- ============================================================
REVOKE ALL ON FUNCTION link_to_instructor(TEXT)        FROM PUBLIC;
REVOKE ALL ON FUNCTION link_student_by_email(TEXT)     FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_to_instructor(TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION link_student_by_email(TEXT)  TO authenticated;

-- ============================================================
-- 10. pg_cron — schedulers
-- ============================================================
SELECT cron.unschedule(jobid) FROM cron.job
  WHERE jobname IN (
    'driveapp-auto-cancel-48h',
    'driveapp-lesson-reminders',
    'driveapp-generate-recurring-slots'
  );

SELECT cron.schedule('driveapp-auto-cancel-48h', '5 * * * *',
  $$SELECT call_edge_function('auto-cancel-48h')$$);

SELECT cron.schedule('driveapp-lesson-reminders', '15 * * * *',
  $$SELECT call_edge_function('lesson-reminders')$$);

SELECT cron.schedule('driveapp-generate-recurring-slots', '0 23 * * 0',
  $$SELECT call_edge_function('generate-recurring-slots')$$);

-- ============================================================
-- 11. REALTIME publication
-- ============================================================
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE lessons  REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 12. STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_write"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 13. SEED — référentiel REMC (4 compétences générales, 16 sous-compétences)
-- ============================================================
INSERT INTO competences (id, parent_id, label, sort_order) VALUES
  ('C1',   NULL, 'Maîtriser la maniabilité du véhicule', 1),
  ('C1.1', 'C1', 'S''installer au poste de conduite', 1),
  ('C1.2', 'C1', 'Démarrer / s''arrêter en sécurité', 2),
  ('C1.3', 'C1', 'Utiliser les commandes (boîte, embrayage)', 3),
  ('C1.4', 'C1', 'Maîtriser les manœuvres', 4),

  ('C2',   NULL, 'Appréhender la route et circuler', 2),
  ('C2.1', 'C2', 'Tourner à droite / à gauche', 1),
  ('C2.2', 'C2', 'Franchir intersections et giratoires', 2),
  ('C2.3', 'C2', 'Détecter, analyser, réagir', 3),
  ('C2.4', 'C2', 'Adapter l''allure et les trajectoires', 4),

  ('C3',   NULL, 'Circuler dans des conditions difficiles et partager la route', 3),
  ('C3.1', 'C3', 'Conduire de nuit / par temps dégradé', 1),
  ('C3.2', 'C3', 'Conduire sur autoroute', 2),
  ('C3.3', 'C3', 'Partager la route avec les autres usagers', 3),
  ('C3.4', 'C3', 'Anticiper et coopérer', 4),

  ('C4',   NULL, 'Pratiquer une conduite autonome, sûre et économique', 4),
  ('C4.1', 'C4', 'Suivre un itinéraire de manière autonome', 1),
  ('C4.2', 'C4', 'Préparer et effectuer un voyage longue distance', 2),
  ('C4.3', 'C4', 'Conduire en éco-conduite', 3),
  ('C4.4', 'C4', 'Détecter une défaillance et l''anticiper', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. ÉTAPES MANUELLES À FAIRE APRÈS CE FICHIER
-- ============================================================
-- 14a. Renseigner _app_config avec l'URL et la service_role_key (lues par
--      les triggers de push + le cron). Sans ça les notifs et l'auto-cancel
--      ne tournent pas, mais l'app reste fonctionnelle.
--
--   INSERT INTO _app_config (key, value) VALUES
--     ('supabase_url',     'https://VOTRE-PROJET.supabase.co'),
--     ('service_role_key', 'sb_secret_VOTRE_CLE')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- 14b. Premier admin (le SQL ne peut pas le déterminer) :
--
--   UPDATE profiles SET role = 'admin' WHERE email = 'vous@exemple.fr';
--
-- 14c. Déployer les edge functions (depuis le repo, après supabase link) :
--
--   npm run supabase:deploy:fns
--
-- 14d. Stripe : activer Klarna dans le dashboard, configurer le webhook
--      pointant vers /functions/v1/stripe-webhook avec STRIPE_WEBHOOK_SECRET.
-- ============================================================
