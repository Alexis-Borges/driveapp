export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competences: {
        Row: {
          id: string
          label: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          id: string
          label: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "competences_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "competences"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_leaves: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          instructor_id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          instructor_id: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          instructor_id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_leaves_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          agreement_number: string
          created_at: string | null
          experience_years: number | null
          hourly_rate: number
          id: string
          invite_code: string | null
          is_verified: boolean | null
          stripe_account_id: string | null
          works_lunch_hour: boolean
          zone_geo: string | null
        }
        Insert: {
          agreement_number: string
          created_at?: string | null
          experience_years?: number | null
          hourly_rate?: number
          id: string
          invite_code?: string | null
          is_verified?: boolean | null
          stripe_account_id?: string | null
          works_lunch_hour?: boolean
          zone_geo?: string | null
        }
        Update: {
          agreement_number?: string
          created_at?: string | null
          experience_years?: number | null
          hourly_rate?: number
          id?: string
          invite_code?: string | null
          is_verified?: boolean | null
          stripe_account_id?: string | null
          works_lunch_hour?: boolean
          zone_geo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents_ht: number
          amount_cents_ttc: number
          id: string
          issued_at: string
          number: string
          payment_id: string
          pdf_url: string | null
          student_id: string
          vat_rate_bps: number
        }
        Insert: {
          amount_cents_ht: number
          amount_cents_ttc: number
          id?: string
          issued_at?: string
          number: string
          payment_id: string
          pdf_url?: string | null
          student_id: string
          vat_rate_bps?: number
        }
        Update: {
          amount_cents_ht?: number
          amount_cents_ttc?: number
          id?: string
          issued_at?: string
          number?: string
          payment_id?: string
          pdf_url?: string | null
          student_id?: string
          vat_rate_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          cancelled_reason: string | null
          created_at: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string
          instructor_id: string
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rating: number | null
          reminder_sent_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["lesson_status"] | null
          student_comment: string | null
          student_id: string | null
          type: Database["public"]["Enums"]["lesson_type"] | null
          updated_at: string | null
        }
        Insert: {
          cancelled_reason?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          instructor_id: string
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rating?: number | null
          reminder_sent_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["lesson_status"] | null
          student_comment?: string | null
          student_id?: string | null
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string | null
        }
        Update: {
          cancelled_reason?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          instructor_id?: string
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rating?: number | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["lesson_status"] | null
          student_comment?: string | null
          student_id?: string | null
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          hours_purchased: number
          id: string
          paid_at: string | null
          plan: Database["public"]["Enums"]["payment_plan"] | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          student_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          hours_purchased: number
          id?: string
          paid_at?: string | null
          plan?: Database["public"]["Enums"]["payment_plan"] | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          student_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          hours_purchased?: number
          id?: string
          paid_at?: string | null
          plan?: Database["public"]["Enums"]["payment_plan"] | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_slots: {
        Row: {
          active: boolean
          created_at: string | null
          hour: number
          id: string
          instructor_id: string
          type: string
          valid_from: string | null
          valid_until: string | null
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          hour: number
          id?: string
          instructor_id: string
          type?: string
          valid_from?: string | null
          valid_until?: string | null
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          hour?: number
          id?: string
          instructor_id?: string
          type?: string
          valid_from?: string | null
          valid_until?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_slots_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean | null
          reward_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean | null
          reward_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean | null
          reward_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_competences: {
        Row: {
          competence_id: string
          status: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          competence_id: string
          status?: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          competence_id?: string
          status?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_competences_competence_id_fkey"
            columns: ["competence_id"]
            isOneToOne: false
            referencedRelation: "competences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_competences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          id: string
          instructor_id: string | null
          package_started_at: string | null
          package_total_hours: number | null
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instructor_id?: string | null
          package_started_at?: string | null
          package_total_hours?: number | null
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          package_started_at?: string | null
          package_total_hours?: number | null
          referral_code?: string
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "student_balance"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "students_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_balance: {
        Row: {
          balance_hours: number | null
          hours_booked: number | null
          hours_paid: number | null
          student_id: string | null
        }
        Insert: {
          balance_hours?: never
          hours_booked?: never
          hours_paid?: never
          student_id?: string | null
        }
        Update: {
          balance_hours?: never
          hours_booked?: never
          hours_paid?: never
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_config: { Args: { p_key: string }; Returns: string }
      call_edge_function: { Args: { fn_name: string }; Returns: number }
      call_send_push: {
        Args: { p_body: string; p_title: string; p_user_id: string }
        Returns: undefined
      }
      call_send_push_with_data: {
        Args: {
          p_body: string
          p_data: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      link_student_by_email: {
        Args: { p_student_email: string }
        Returns: Json
      }
      link_to_instructor: {
        Args: { p_instructor_email: string }
        Returns: Json
      }
      link_to_instructor_by_code: { Args: { p_code: string }; Returns: Json }
      mark_all_notifications_read: { Args: never; Returns: number }
      next_invoice_number: { Args: never; Returns: string }
      refund_student_hours: {
        Args: { p_hours: number; p_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      lesson_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "auto_cancelled"
      lesson_type:
        | "city"
        | "highway"
        | "parking"
        | "evaluation"
        | "mock_exam"
        | "other"
      payment_plan: "one_shot" | "three_x"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      user_role: "instructor" | "student" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      lesson_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "auto_cancelled",
      ],
      lesson_type: [
        "city",
        "highway",
        "parking",
        "evaluation",
        "mock_exam",
        "other",
      ],
      payment_plan: ["one_shot", "three_x"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      user_role: ["instructor", "student", "admin"],
    },
  },
} as const
