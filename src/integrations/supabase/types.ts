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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aggregated_scores: {
        Row: {
          id: string
          method: string
          project_id: string
          response_id: string
          run_id: string | null
          score: number
          updated_at: string | null
          weights: Json | null
        }
        Insert: {
          id?: string
          method: string
          project_id: string
          response_id: string
          run_id?: string | null
          score: number
          updated_at?: string | null
          weights?: Json | null
        }
        Update: {
          id?: string
          method?: string
          project_id?: string
          response_id?: string
          run_id?: string | null
          score?: number
          updated_at?: string | null
          weights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregated_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aggregated_scores_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "student_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aggregated_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "bt_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      autoscore_predictions: {
        Row: {
          created_at: string | null
          embedding_vector: number[]
          id: string
          predicted_score: number
          project_id: string
          question_number: number
          response_text: string
          scaled_score: number
        }
        Insert: {
          created_at?: string | null
          embedding_vector: number[]
          id?: string
          predicted_score: number
          project_id: string
          question_number: number
          response_text: string
          scaled_score: number
        }
        Update: {
          created_at?: string | null
          embedding_vector?: number[]
          id?: string
          predicted_score?: number
          project_id?: string
          question_number?: number
          response_text?: string
          scaled_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "autoscore_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      autoscore_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          metrics: Json | null
          model_type: string
          params: Json | null
          project_id: string
          question_number: number
          started_at: string | null
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          metrics?: Json | null
          model_type: string
          params?: Json | null
          project_id: string
          question_number: number
          started_at?: string | null
          status: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          metrics?: Json | null
          model_type?: string
          params?: Json | null
          project_id?: string
          question_number?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoscore_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bt_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          hyperparams: Json | null
          id: string
          metrics: Json | null
          project_id: string
          question_numbers: number[] | null
          started_at: string | null
          status: string
          trainer_user_id: string | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          hyperparams?: Json | null
          id?: string
          metrics?: Json | null
          project_id: string
          question_numbers?: number[] | null
          started_at?: string | null
          status: string
          trainer_user_id?: string | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          hyperparams?: Json | null
          id?: string
          metrics?: Json | null
          project_id?: string
          question_numbers?: number[] | null
          started_at?: string | null
          status?: string
          trainer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bt_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bt_scores: {
        Row: {
          ci_high: number | null
          ci_low: number | null
          id: string
          project_id: string
          question_number: number
          rank: number | null
          response_id: string
          run_id: string
          score: number
          se: number | null
          updated_at: string | null
        }
        Insert: {
          ci_high?: number | null
          ci_low?: number | null
          id?: string
          project_id: string
          question_number: number
          rank?: number | null
          response_id: string
          run_id: string
          score: number
          se?: number | null
          updated_at?: string | null
        }
        Update: {
          ci_high?: number | null
          ci_low?: number | null
          id?: string
          project_id?: string
          question_number?: number
          rank?: number | null
          response_id?: string
          run_id?: string
          score?: number
          se?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bt_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bt_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "bt_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          agreement_snapshot: number | null
          comparison_time_ms: number
          created_at: string
          decision: string
          decision_id: string
          id: string
          is_duplicate_reeval: boolean
          is_mirror: boolean
          mirror_group_id: string | null
          popup_reason: string | null
          popup_shown: boolean | null
          project_id: string
          question_number: number
          reeval_group_id: string | null
          response_a_id: string
          response_b_id: string
          session_id: string | null
          shown_at_client: string
          shown_at_server: string
          student_id: string
          submitted_at_client: string
          submitted_at_server: string
          ui_order_left_id: string
          ui_order_right_id: string
          weight_applied: number | null
        }
        Insert: {
          agreement_snapshot?: number | null
          comparison_time_ms: number
          created_at?: string
          decision: string
          decision_id: string
          id?: string
          is_duplicate_reeval?: boolean
          is_mirror?: boolean
          mirror_group_id?: string | null
          popup_reason?: string | null
          popup_shown?: boolean | null
          project_id: string
          question_number: number
          reeval_group_id?: string | null
          response_a_id: string
          response_b_id: string
          session_id?: string | null
          shown_at_client: string
          shown_at_server?: string
          student_id: string
          submitted_at_client: string
          submitted_at_server?: string
          ui_order_left_id: string
          ui_order_right_id: string
          weight_applied?: number | null
        }
        Update: {
          agreement_snapshot?: number | null
          comparison_time_ms?: number
          created_at?: string
          decision?: string
          decision_id?: string
          id?: string
          is_duplicate_reeval?: boolean
          is_mirror?: boolean
          mirror_group_id?: string | null
          popup_reason?: string | null
          popup_shown?: boolean | null
          project_id?: string
          question_number?: number
          reeval_group_id?: string | null
          response_a_id?: string
          response_b_id?: string
          session_id?: string | null
          shown_at_client?: string
          shown_at_server?: string
          student_id?: string
          submitted_at_client?: string
          submitted_at_server?: string
          ui_order_left_id?: string
          ui_order_right_id?: string
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
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assigned_at: string | null
          completed_at: string | null
          created_at: string
          has_completed: boolean
          id: string
          project_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          has_completed?: boolean
          id?: string
          project_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          has_completed?: boolean
          id?: string
          project_id?: string
          student_id?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "project_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
          num_questions: number
          question: string | null
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
          num_questions?: number
          question?: string | null
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
          num_questions?: number
          question?: string | null
          rubric?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      response_embeddings: {
        Row: {
          created_at: string | null
          dimension: number
          embedding: number[]
          id: string
          model_id: string
          project_id: string
          question_number: number
          response_id: string
        }
        Insert: {
          created_at?: string | null
          dimension: number
          embedding: number[]
          id?: string
          model_id: string
          project_id: string
          question_number: number
          response_id: string
        }
        Update: {
          created_at?: string | null
          dimension?: number
          embedding?: number[]
          id?: string
          model_id?: string
          project_id?: string
          question_number?: number
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_embeddings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewer_stats: {
        Row: {
          agreement_score: number | null
          consecutive_bias_count: number
          consecutive_left_choices: number | null
          consecutive_right_choices: number | null
          created_at: string
          final_weight_applied: number | null
          id: string
          inconsistency_count: number | null
          inconsistency_rate: number | null
          last_decision: string | null
          last_popup_at: string | null
          low_agreement_flag: boolean | null
          max_consecutive_left: number | null
          max_consecutive_right: number | null
          popup_cooldown_remaining: number | null
          project_id: string
          question_number: number
          recent_decision_history: string[] | null
          short_decision_streaks: number | null
          short_response_count: number
          student_id: string
          total_comparisons: number
          updated_at: string
        }
        Insert: {
          agreement_score?: number | null
          consecutive_bias_count?: number
          consecutive_left_choices?: number | null
          consecutive_right_choices?: number | null
          created_at?: string
          final_weight_applied?: number | null
          id?: string
          inconsistency_count?: number | null
          inconsistency_rate?: number | null
          last_decision?: string | null
          last_popup_at?: string | null
          low_agreement_flag?: boolean | null
          max_consecutive_left?: number | null
          max_consecutive_right?: number | null
          popup_cooldown_remaining?: number | null
          project_id: string
          question_number: number
          recent_decision_history?: string[] | null
          short_decision_streaks?: number | null
          short_response_count?: number
          student_id: string
          total_comparisons?: number
          updated_at?: string
        }
        Update: {
          agreement_score?: number | null
          consecutive_bias_count?: number
          consecutive_left_choices?: number | null
          consecutive_right_choices?: number | null
          created_at?: string
          final_weight_applied?: number | null
          id?: string
          inconsistency_count?: number | null
          inconsistency_rate?: number | null
          last_decision?: string | null
          last_popup_at?: string | null
          low_agreement_flag?: boolean | null
          max_consecutive_left?: number | null
          max_consecutive_right?: number | null
          popup_cooldown_remaining?: number | null
          project_id?: string
          question_number?: number
          recent_decision_history?: string[] | null
          short_decision_streaks?: number | null
          short_response_count?: number
          student_id?: string
          total_comparisons?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_stats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_stats_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      session_metadata: {
        Row: {
          agreement_update_interval: number
          allow_tie: boolean
          app_version: string
          closed_at: string | null
          consecutive_bias_threshold: number
          created_at: string
          duplicate_reeval_gap: number
          global_score_refresh_interval: number
          id: string
          k_elo: number
          mirror_reshow_gap: number
          pairing_strategy: string
          project_id: string
          question_number: number
          random_seed: string
          reviewer_target_per_person: number
          session_id: string
          short_response_threshold_ms: number
          started_at: string
          target_per_response: number
        }
        Insert: {
          agreement_update_interval?: number
          allow_tie?: boolean
          app_version: string
          closed_at?: string | null
          consecutive_bias_threshold?: number
          created_at?: string
          duplicate_reeval_gap?: number
          global_score_refresh_interval?: number
          id?: string
          k_elo?: number
          mirror_reshow_gap?: number
          pairing_strategy?: string
          project_id: string
          question_number: number
          random_seed: string
          reviewer_target_per_person?: number
          session_id: string
          short_response_threshold_ms?: number
          started_at?: string
          target_per_response?: number
        }
        Update: {
          agreement_update_interval?: number
          allow_tie?: boolean
          app_version?: string
          closed_at?: string | null
          consecutive_bias_threshold?: number
          created_at?: string
          duplicate_reeval_gap?: number
          global_score_refresh_interval?: number
          id?: string
          k_elo?: number
          mirror_reshow_gap?: number
          pairing_strategy?: string
          project_id?: string
          question_number?: number
          random_seed?: string
          reviewer_target_per_person?: number
          session_id?: string
          short_response_threshold_ms?: number
          started_at?: string
          target_per_response?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_responses: {
        Row: {
          created_at: string
          elo_score: number | null
          id: string
          num_comparisons: number | null
          num_losses: number | null
          num_ties: number | null
          num_wins: number | null
          project_id: string
          question_number: number
          response_text: string
          student_code: string | null
          student_id: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          elo_score?: number | null
          id?: string
          num_comparisons?: number | null
          num_losses?: number | null
          num_ties?: number | null
          num_wins?: number | null
          project_id: string
          question_number: number
          response_text: string
          student_code?: string | null
          student_id?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          elo_score?: number | null
          id?: string
          num_comparisons?: number | null
          num_losses?: number | null
          num_ties?: number | null
          num_wins?: number | null
          project_id?: string
          question_number?: number
          response_text?: string
          student_code?: string | null
          student_id?: string | null
          submitted_at?: string
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
          {
            foreignKeyName: "student_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_overall_student_rankings: {
        Args: { project_uuid: string }
        Returns: {
          overall_win_rate: number
          questions_participated: number
          rank: number
          student_code: string
          total_comparisons: number
          total_loss_count: number
          total_tie_count: number
          total_win_count: number
        }[]
      }
      calculate_response_rankings: {
        Args: { project_uuid: string; question_num: number }
        Returns: {
          loss_count: number
          rank: number
          response_id: string
          student_code: string
          tie_count: number
          total_comparisons: number
          win_count: number
          win_rate: number
        }[]
      }
      get_headtohead_comparisons: {
        Args: { project_uuid: string; question_num: number }
        Returns: {
          a_wins: number
          b_wins: number
          response_a_code: string
          response_b_code: string
          ties: number
          total_comparisons: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
