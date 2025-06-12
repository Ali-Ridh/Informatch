export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_id: string
          blocker_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_id: string
          blocker_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_id?: string
          blocker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      matches: {
        Row: {
          match_id: number
          match_user1_id: string
          match_user2_id: string
          matched_at: string | null
        }
        Insert: {
          match_id?: number
          match_user1_id: string
          match_user2_id: string
          matched_at?: string | null
        }
        Update: {
          match_id?: number
          match_user1_id?: string
          match_user2_id?: string
          matched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_match_user1_id_fkey"
            columns: ["match_user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matches_match_user2_id_fkey"
            columns: ["match_user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          profile_academic_interests: string | null
          profile_bio: string | null
          profile_birthdate: string
          profile_created_at: string | null
          profile_id: number
          profile_looking_for: string | null
          profile_non_academic_interests: string | null
          profile_username: string
          user_id: string
        }
        Insert: {
          profile_academic_interests?: string | null
          profile_bio?: string | null
          profile_birthdate: string
          profile_created_at?: string | null
          profile_id?: number
          profile_looking_for?: string | null
          profile_non_academic_interests?: string | null
          profile_username: string
          user_id: string
        }
        Update: {
          profile_academic_interests?: string | null
          profile_bio?: string | null
          profile_birthdate?: string
          profile_created_at?: string | null
          profile_id?: number
          profile_looking_for?: string | null
          profile_non_academic_interests?: string | null
          profile_username?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reports: {
        Row: {
          details: string
          reason: string | null
          reported_at: string | null
          reported_id: string
          reporter_id: string
          reports_id: number
        }
        Insert: {
          details: string
          reason?: string | null
          reported_at?: string | null
          reported_id: string
          reporter_id: string
          reports_id?: number
        }
        Update: {
          details?: string
          reason?: string | null
          reported_at?: string | null
          reported_id?: string
          reporter_id?: string
          reports_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          user_created_at: string | null
          user_email: string
          user_email_verified: boolean | null
          user_id: string
          user_phone: string | null
          user_phone_verified: boolean | null
          user_priset_is_private: boolean | null
          user_priset_last_updated: string | null
          user_priset_show_age: boolean | null
          user_priset_show_bio: boolean | null
        }
        Insert: {
          user_created_at?: string | null
          user_email: string
          user_email_verified?: boolean | null
          user_id: string
          user_phone?: string | null
          user_phone_verified?: boolean | null
          user_priset_is_private?: boolean | null
          user_priset_last_updated?: string | null
          user_priset_show_age?: boolean | null
          user_priset_show_bio?: boolean | null
        }
        Update: {
          user_created_at?: string | null
          user_email?: string
          user_email_verified?: boolean | null
          user_id?: string
          user_phone?: string | null
          user_phone_verified?: boolean | null
          user_priset_is_private?: boolean | null
          user_priset_last_updated?: string | null
          user_priset_show_age?: boolean | null
          user_priset_show_bio?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
