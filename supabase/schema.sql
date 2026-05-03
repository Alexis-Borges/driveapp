-- ============================================================
-- DriveApp - Schéma Supabase MVP v3
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TYPE user_role AS ENUM ('instructor', 'student', 'admin');
CREATE TYPE lesson_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'auto_cancelled');
CREATE TYPE lesson_type AS ENUM ('city', 'highway', 'parking', 'evaluation', 'mock_exam', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE payment_plan AS ENUM ('one_shot', 'three_x');

CREATE TABLE profiles (
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

CREATE TABLE instructors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_number TEXT UNIQUE NOT NULL,
  hourly_rate INTEGER NOT NULL DEFAULT 3000,
  zone_geo TEXT,
  experience_years INTEGER,
  stripe_account_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  package_total_hours INTEGER DEFAULT 0,
  package_started_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_students_referral_code ON students(referral_code);

CREATE TABLE lessons (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lessons_instructor_date ON lessons(instructor_id, scheduled_at);
CREATE INDEX idx_lessons_student ON lessons(student_id);
CREATE INDEX idx_lessons_status ON lessons(status);

CREATE TABLE payments (
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
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE OR REPLACE VIEW student_balance AS
SELECT
  s.id AS student_id,
  COALESCE(SUM(p.hours_purchased) FILTER (WHERE p.status = 'succeeded'), 0) AS hours_paid,
  COALESCE(COUNT(l.id) FILTER (WHERE l.status IN ('confirmed', 'completed', 'pending')), 0) AS hours_booked,
  COALESCE(SUM(p.hours_purchased) FILTER (WHERE p.status = 'succeeded'), 0)
    - COALESCE(COUNT(l.id) FILTER (WHERE l.status IN ('confirmed', 'completed', 'pending')), 0) AS balance_hours
FROM students s
LEFT JOIN payments p ON p.student_id = s.id
LEFT JOIN lessons l ON l.student_id = s.id
GROUP BY s.id;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "student_views_instructor_profile" ON profiles FOR SELECT USING (
  id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
);
CREATE POLICY "instructor_views_students_profile" ON profiles FOR SELECT USING (
  id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
);

CREATE POLICY "instructors_public_read" ON instructors FOR SELECT USING (true);
CREATE POLICY "instructor_updates_self" ON instructors FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "instructor_inserts_self" ON instructors FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "student_views_self" ON students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "instructor_views_own_students" ON students FOR SELECT USING (auth.uid() = instructor_id);
CREATE POLICY "student_updates_self" ON students FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "student_inserts_self" ON students FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "student_views_own_lessons" ON lessons FOR SELECT USING (
  auth.uid() = student_id
  OR (student_id IS NULL AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid()))
);
CREATE POLICY "instructor_views_own_lessons" ON lessons FOR SELECT USING (auth.uid() = instructor_id);
CREATE POLICY "instructor_manages_lessons" ON lessons FOR ALL USING (auth.uid() = instructor_id);
CREATE POLICY "student_books_lesson" ON lessons FOR UPDATE USING (
  student_id IS NULL AND instructor_id IN (SELECT instructor_id FROM students WHERE id = auth.uid())
);

CREATE POLICY "student_views_own_payments" ON payments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "instructor_views_students_payments" ON payments FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE instructor_id = auth.uid())
);

CREATE POLICY "users_view_own_messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "users_send_messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "users_update_read_status" ON messages FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "student_views_own_referrals" ON referrals FOR SELECT USING (
  auth.uid() = referrer_id OR auth.uid() = referred_id
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

CREATE TRIGGER students_generate_code BEFORE INSERT ON students
  FOR EACH ROW WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
  EXECUTE FUNCTION generate_referral_code();

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
