// Types Supabase — peuvent être régénérés via :
//   npm run supabase:types
// (placeholder maintenu manuellement en attendant la génération réelle)

export type UserRole = 'instructor' | 'student' | 'admin';
export type LessonStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'auto_cancelled';
export type LessonType =
  | 'city'
  | 'highway'
  | 'parking'
  | 'evaluation'
  | 'mock_exam'
  | 'other';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentPlan = 'one_shot' | 'three_x';

type Iso = string;

export type ProfileRow = {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: Iso;
  updated_at: Iso;
};

export type InstructorRow = {
  id: string;
  agreement_number: string;
  hourly_rate: number;
  zone_geo: string | null;
  experience_years: number | null;
  stripe_account_id: string | null;
  is_verified: boolean;
  created_at: Iso;
};

export type StudentRow = {
  id: string;
  instructor_id: string | null;
  package_total_hours: number;
  package_started_at: Iso | null;
  referral_code: string;
  referred_by: string | null;
  created_at: Iso;
};

export type LessonRow = {
  id: string;
  instructor_id: string;
  student_id: string | null;
  scheduled_at: Iso;
  duration_minutes: number;
  type: LessonType;
  status: LessonStatus;
  feedback: string | null;
  rating: number | null;
  student_comment: string | null;
  cancelled_reason: string | null;
  reminder_sent_at: Iso | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  created_at: Iso;
  updated_at: Iso;
};

export type RecurringSlotRow = {
  id: string;
  instructor_id: string;
  weekday: number;
  hour: number;
  type: LessonType;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: Iso;
};

export type InstructorLeaveRow = {
  id: string;
  instructor_id: string;
  starts_at: Iso;
  ends_at: Iso;
  reason: string | null;
  created_at: Iso;
};

export type CompetenceRow = {
  id: string;
  parent_id: string | null;
  label: string;
  sort_order: number;
};

export type CompetenceStatus = 'not_started' | 'in_progress' | 'acquired';

export type StudentCompetenceRow = {
  student_id: string;
  competence_id: string;
  status: CompetenceStatus;
  updated_at: Iso;
  updated_by: string | null;
};

export type InvoiceRow = {
  id: string;
  number: string;
  payment_id: string;
  student_id: string;
  amount_cents_ht: number;
  vat_rate_bps: number;
  amount_cents_ttc: number;
  pdf_url: string | null;
  issued_at: Iso;
};

export type PaymentRow = {
  id: string;
  student_id: string;
  amount_cents: number;
  hours_purchased: number;
  plan: PaymentPlan;
  status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  paid_at: Iso | null;
  created_at: Iso;
};

export type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: Iso | null;
  created_at: Iso;
};

export type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_id: string;
  reward_claimed: boolean;
  reward_type: string | null;
  created_at: Iso;
};

export type PushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  device_info: string | null;
  created_at: Iso;
  updated_at: Iso;
};

export type StudentBalanceView = {
  student_id: string;
  hours_paid: number;
  hours_booked: number;
  balance_hours: number;
};

type WithDefaults<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: WithDefaults<ProfileRow, 'created_at' | 'updated_at' | 'phone' | 'avatar_url' | 'bio'>;
        Update: Partial<ProfileRow>;
      };
      instructors: {
        Row: InstructorRow;
        Insert: WithDefaults<
          InstructorRow,
          'created_at' | 'hourly_rate' | 'is_verified' | 'zone_geo' | 'experience_years' | 'stripe_account_id'
        >;
        Update: Partial<InstructorRow>;
      };
      students: {
        Row: StudentRow;
        Insert: WithDefaults<
          StudentRow,
          'created_at' | 'package_total_hours' | 'package_started_at' | 'instructor_id' | 'referred_by' | 'referral_code'
        >;
        Update: Partial<StudentRow>;
      };
      lessons: {
        Row: LessonRow;
        Insert: WithDefaults<
          LessonRow,
          | 'id'
          | 'student_id'
          | 'duration_minutes'
          | 'type'
          | 'status'
          | 'feedback'
          | 'rating'
          | 'student_comment'
          | 'cancelled_reason'
          | 'reminder_sent_at'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<LessonRow>;
      };
      payments: {
        Row: PaymentRow;
        Insert: WithDefaults<
          PaymentRow,
          | 'id'
          | 'plan'
          | 'status'
          | 'stripe_payment_intent_id'
          | 'stripe_subscription_id'
          | 'paid_at'
          | 'created_at'
        >;
        Update: Partial<PaymentRow>;
      };
      messages: {
        Row: MessageRow;
        Insert: WithDefaults<MessageRow, 'id' | 'read_at' | 'created_at'>;
        Update: Partial<MessageRow>;
      };
      referrals: {
        Row: ReferralRow;
        Insert: WithDefaults<
          ReferralRow,
          'id' | 'reward_claimed' | 'reward_type' | 'created_at'
        >;
        Update: Partial<ReferralRow>;
      };
      push_tokens: {
        Row: PushTokenRow;
        Insert: WithDefaults<PushTokenRow, 'id' | 'device_info' | 'created_at' | 'updated_at'>;
        Update: Partial<PushTokenRow>;
      };
    };
    Views: {
      student_balance: {
        Row: StudentBalanceView;
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      lesson_status: LessonStatus;
      lesson_type: LessonType;
      payment_status: PaymentStatus;
      payment_plan: PaymentPlan;
    };
    CompositeTypes: Record<string, never>;
  };
}
