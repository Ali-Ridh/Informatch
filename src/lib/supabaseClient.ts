
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string
          user_email: string
          user_phone: string | null
          user_created_at: string
          user_email_verified: boolean
          user_phone_verified: boolean
          user_priset_is_private: boolean
          user_priset_show_age: boolean
          user_priset_show_bio: boolean
          user_priset_last_updated: string
        }
        Insert: {
          user_id: string
          user_email: string
          user_phone?: string | null
          user_created_at?: string
          user_email_verified?: boolean
          user_phone_verified?: boolean
          user_priset_is_private?: boolean
          user_priset_show_age?: boolean
          user_priset_show_bio?: boolean
          user_priset_last_updated?: string
        }
        Update: {
          user_id?: string
          user_email?: string
          user_phone?: string | null
          user_created_at?: string
          user_email_verified?: boolean
          user_phone_verified?: boolean
          user_priset_is_private?: boolean
          user_priset_show_age?: boolean
          user_priset_show_bio?: boolean
          user_priset_last_updated?: string
        }
      }
      profiles: {
        Row: {
          profile_id: number
          user_id: string
          profile_username: string
          profile_bio: string | null
          profile_birthdate: string
          profile_academic_interests: string | null
          profile_non_academic_interests: string | null
          profile_looking_for: string | null
          profile_created_at: string
        }
        Insert: {
          profile_id?: number
          user_id: string
          profile_username: string
          profile_bio?: string | null
          profile_birthdate: string
          profile_academic_interests?: string | null
          profile_non_academic_interests?: string | null
          profile_looking_for?: string | null
          profile_created_at?: string
        }
        Update: {
          profile_id?: number
          user_id?: string
          profile_username?: string
          profile_bio?: string | null
          profile_birthdate?: string
          profile_academic_interests?: string | null
          profile_non_academic_interests?: string | null
          profile_looking_for?: string | null
          profile_created_at?: string
        }
      }
      matches: {
        Row: {
          match_id: number
          match_user1_id: string
          match_user2_id: string
          matched_at: string
        }
        Insert: {
          match_id?: number
          match_user1_id: string
          match_user2_id: string
          matched_at?: string
        }
        Update: {
          match_id?: number
          match_user1_id?: string
          match_user2_id?: string
          matched_at?: string
        }
      }
      blocked_users: {
        Row: {
          blocker_id: string
          blocked_id: string
          blocked_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          blocked_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          blocked_at?: string
        }
      }
      reports: {
        Row: {
          reports_id: number
          reporter_id: string
          reported_id: string
          reason: string | null
          details: string
          reported_at: string
        }
        Insert: {
          reports_id?: number
          reporter_id: string
          reported_id: string
          reason?: string | null
          details: string
          reported_at?: string
        }
        Update: {
          reports_id?: number
          reporter_id?: string
          reported_id?: string
          reason?: string | null
          details?: string
          reported_at?: string
        }
      }
    }
  }
}
