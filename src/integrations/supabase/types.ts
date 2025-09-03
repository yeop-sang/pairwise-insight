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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      comparisons: {
        Row: {
          agreement_snapshot: number | null
          comparison_time_ms: number | null
          created_at: string
          decision: string | null
          decision_id: string | null
          focus_interaction_at: string | null
          focus_to_click_ms: number | null
          focus_window_at: string | null
          id: string
          is_duplicate_reeval: boolean | null
          is_duplicate_submission: boolean | null
          is_mirror: boolean | null
          min_gap_comparisons: number | null
          mirror_cross_question: boolean | null
          mirror_group_id: string | null
          mirror_of_pair_id: string | null
          mirror_seq: number | null
          mirror_type: string | null
          popup_at_server: string | null
          popup_reason: string | null
          popup_shown: boolean | null
          project_id: string
          reeval_group_id: string | null
          reeval_type: string | null
          response_a_id: string
          response_b_id: string
          shown_at_client: string | null
          shown_at_server: string | null
          student_id: string
          submitted_at_client: string | null
          submitted_at_server: string | null
          ui_order_left_id: string | null
          ui_order_right_id: string | null
          weight_applied: number | null
        }
        Insert: {
          agreement_snapshot?: number | null
          comparison_time_ms?: number | null
          created_at?: string
          decision?: string | null
          decision_id?: string | null
          focus_interaction_at?: string | null
          focus_to_click_ms?: number | null
          focus_window_at?: string | null
          id?: string
          is_duplicate_reeval?: boolean | null
          is_duplicate_submission?: boolean | null
          is_mirror?: boolean | null
          min_gap_comparisons?: number | null
          mirror_cross_question?: boolean | null
          mirror_group_id?: string | null
          mirror_of_pair_id?: string | null
          mirror_seq?: number | null
          mirror_type?: string | null
          popup_at_server?: string | null
          popup_reason?: string | null
          popup_shown?: boolean | null
          project_id: string
          reeval_group_id?: string | null
          reeval_type?: string | null
          response_a_id: string
          response_b_id: string
          shown_at_client?: string | null
          shown_at_server?: string | null
          student_id: string
          submitted_at_client?: string | null
          submitted_at_server?: string | null
          ui_order_left_id?: string | null
          ui_order_right_id?: string | null
          weight_applied?: number | null
        }
        Update: {
          agreement_snapshot?: number | null
          comparison_time_ms?: number | null
          created_at?: string
          decision?: string | null
          decision_id?: string | null
          focus_interaction_at?: string | null
          focus_to_click_ms?: number | null
          focus_window_at?: string | null
          id?: string
          is_duplicate_reeval?: boolean | null
          is_duplicate_submission?: boolean | null
          is_mirror?: boolean | null
          min_gap_comparisons?: number | null
          mirror_cross_question?: boolean | null
          mirror_group_id?: string | null
          mirror_of_pair_id?: string | null
          mirror_seq?: number | null
          mirror_type?: string | null
          popup_at_server?: string | null
          popup_reason?: string | null
          popup_shown?: boolean | null
          project_id?: string
          reeval_group_id?: string | null
          reeval_type?: string | null
          response_a_id?: string
          response_b_id?: string
          shown_at_client?: string | null
          shown_at_server?: string | null
          student_id?: string
          submitted_at_client?: string | null
          submitted_at_server?: string | null
          ui_order_left_id?: string | null
          ui_order_right_id?: string | null
          weight_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_response_a_id_fkey"
            columns: ["response_a_id"]
            isOneToOne: false
            referencedRelation: "student_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_response_b_id_fkey"
            columns: ["response_b_id"]
            isOneToOne: false
            referencedRelation: "student_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assigned_at: string
          completed_at: string | null
          has_completed: boolean
          id: string
          project_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          has_completed?: boolean
          id?: string
          project_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          has_completed?: boolean
          id?: string
          project_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_assignments_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_project_assignments_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          question: string
          questions: Json | null
          rubric: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          question: string
          questions?: Json | null
          rubric?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          question?: string
          questions?: Json | null
          rubric?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviewer_stats: {
        Row: {
          agreement_rate: number | null
          consecutive_left_choices: number | null
          consecutive_right_choices: number | null
          created_at: string
          final_weight_applied: number | null
          id: string
          inconsistency_count: number | null
          inconsistency_rate: number | null
          last_popup_at: string | null
          low_agreement_flag: boolean | null
          max_consecutive_left: number | null
          max_consecutive_right: number | null
          popup_cooldown_remaining: number | null
          project_id: string
          question_number: number
          short_decision_count: number | null
          short_decision_streaks: number | null
          student_id: string
          total_comparisons: number | null
          updated_at: string
        }
        Insert: {
          agreement_rate?: number | null
          consecutive_left_choices?: number | null
          consecutive_right_choices?: number | null
          created_at?: string
          final_weight_applied?: number | null
          id?: string
          inconsistency_count?: number | null
          inconsistency_rate?: number | null
          last_popup_at?: string | null
          low_agreement_flag?: boolean | null
          max_consecutive_left?: number | null
          max_consecutive_right?: number | null
          popup_cooldown_remaining?: number | null
          project_id: string
          question_number?: number
          short_decision_count?: number | null
          short_decision_streaks?: number | null
          student_id: string
          total_comparisons?: number | null
          updated_at?: string
        }
        Update: {
          agreement_rate?: number | null
          consecutive_left_choices?: number | null
          consecutive_right_choices?: number | null
          created_at?: string
          final_weight_applied?: number | null
          id?: string
          inconsistency_count?: number | null
          inconsistency_rate?: number | null
          last_popup_at?: string | null
          low_agreement_flag?: boolean | null
          max_consecutive_left?: number | null
          max_consecutive_right?: number | null
          popup_cooldown_remaining?: number | null
          project_id?: string
          question_number?: number
          short_decision_count?: number | null
          short_decision_streaks?: number | null
          student_id?: string
          total_comparisons?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      session_metadata: {
        Row: {
          agreement_update_interval: number | null
          allow_tie: boolean | null
          app_version: string
          closed_at: string | null
          consecutive_bias_threshold: number | null
          created_at: string
          duplicate_reeval_gap: number | null
          global_score_refresh_interval: number | null
          id: string
          k_elo: number | null
          mirror_reshow_gap: number | null
          pairing_strategy: string | null
          project_id: string
          question_number: number
          random_seed: string
          reviewer_target_per_person: number | null
          session_id: string
          short_response_threshold_ms: number | null
          started_at: string
          target_per_response: number | null
          updated_at: string
        }
        Insert: {
          agreement_update_interval?: number | null
          allow_tie?: boolean | null
          app_version: string
          closed_at?: string | null
          consecutive_bias_threshold?: number | null
          created_at?: string
          duplicate_reeval_gap?: number | null
          global_score_refresh_interval?: number | null
          id?: string
          k_elo?: number | null
          mirror_reshow_gap?: number | null
          pairing_strategy?: string | null
          project_id: string
          question_number?: number
          random_seed: string
          reviewer_target_per_person?: number | null
          session_id: string
          short_response_threshold_ms?: number | null
          started_at?: string
          target_per_response?: number | null
          updated_at?: string
        }
        Update: {
          agreement_update_interval?: number | null
          allow_tie?: boolean | null
          app_version?: string
          closed_at?: string | null
          consecutive_bias_threshold?: number | null
          created_at?: string
          duplicate_reeval_gap?: number | null
          global_score_refresh_interval?: number | null
          id?: string
          k_elo?: number | null
          mirror_reshow_gap?: number | null
          pairing_strategy?: string | null
          project_id?: string
          question_number?: number
          random_seed?: string
          reviewer_target_per_person?: number | null
          session_id?: string
          short_response_threshold_ms?: number | null
          started_at?: string
          target_per_response?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      student_responses: {
        Row: {
          created_at: string
          id: string
          project_id: string
          question_number: number
          response_text: string
          student_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          question_number?: number
          response_text: string
          student_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          question_number?: number
          response_text?: string
          student_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_number: number
          created_at: string
          grade: number
          id: string
          name: string
          password: string
          student_id: string
          student_number: number
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_number: number
          created_at?: string
          grade: number
          id?: string
          name: string
          password: string
          student_id: string
          student_number: number
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_number?: number
          created_at?: string
          grade?: number
          id?: string
          name?: string
          password?: string
          student_id?: string
          student_number?: number
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_bradley_terry_by_question: {
        Args: { project_uuid: string; question_num: number }
        Returns: {
          loss_count: number
          rank: number
          response_id: string
          score: number
          student_code: string
          total_comparisons: number
          win_count: number
        }[]
      }
      calculate_bradley_terry_scores: {
        Args: { project_uuid: string }
        Returns: {
          loss_count: number
          rank: number
          response_id: string
          score: number
          student_code: string
          total_comparisons: number
          win_count: number
        }[]
      }
    }
    Enums: {
      user_role: "teacher" | "student"
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
      user_role: ["teacher", "student"],
    },
  },
} as const
