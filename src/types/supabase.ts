export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          plan: 'free' | 'premium'
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          plan?: 'free' | 'premium'
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          plan?: 'free' | 'premium'
        }
      }
      // Add other tables as needed
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
  }
} 