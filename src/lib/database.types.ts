// Database types matching supabase/migrations/20260706010000_initial_schema.sql.
// Hand-written to mirror the schema exactly; regenerate with `npm run gen:types`
// once the Supabase CLI is linked (requires `npx supabase login`).

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
      incomes: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string
          salary_day: number
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          currency?: string
          salary_day: number
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string
          salary_day?: number
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string
          period: Database['public']['Enums']['expense_period']
          category: string | null
          source: Database['public']['Enums']['expense_source']
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          currency?: string
          period?: Database['public']['Enums']['expense_period']
          category?: string | null
          source?: Database['public']['Enums']['expense_source']
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string
          period?: Database['public']['Enums']['expense_period']
          category?: string | null
          source?: Database['public']['Enums']['expense_source']
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          name: string
          kind: Database['public']['Enums']['wishlist_kind']
          estimated_amount: number
          currency: string
          target_date: string | null
          status: Database['public']['Enums']['wishlist_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          kind: Database['public']['Enums']['wishlist_kind']
          estimated_amount: number
          currency?: string
          target_date?: string | null
          status?: Database['public']['Enums']['wishlist_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          kind?: Database['public']['Enums']['wishlist_kind']
          estimated_amount?: number
          currency?: string
          target_date?: string | null
          status?: Database['public']['Enums']['wishlist_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          wishlist_item_id: string
          target_amount: number
          currency: string
          monthly_amount: number
          start_date: string
          expense_item_id: string | null
          status: Database['public']['Enums']['savings_goal_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wishlist_item_id: string
          target_amount: number
          currency?: string
          monthly_amount: number
          start_date?: string
          expense_item_id?: string | null
          status?: Database['public']['Enums']['savings_goal_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wishlist_item_id?: string
          target_amount?: number
          currency?: string
          monthly_amount?: number
          start_date?: string
          expense_item_id?: string | null
          status?: Database['public']['Enums']['savings_goal_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'savings_goals_wishlist_item_id_fkey'
            columns: ['wishlist_item_id']
            isOneToOne: true
            referencedRelation: 'wishlist_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'savings_goals_expense_item_id_fkey'
            columns: ['expense_item_id']
            isOneToOne: false
            referencedRelation: 'expense_items'
            referencedColumns: ['id']
          },
        ]
      }
      savings_contributions: {
        Row: {
          id: string
          user_id: string
          savings_goal_id: string
          amount: number
          contributed_on: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          savings_goal_id: string
          amount: number
          contributed_on?: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          savings_goal_id?: string
          amount?: number
          contributed_on?: string
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'savings_contributions_savings_goal_id_fkey'
            columns: ['savings_goal_id']
            isOneToOne: false
            referencedRelation: 'savings_goals'
            referencedColumns: ['id']
          },
        ]
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          due_on: string
          source_type: Database['public']['Enums']['reminder_source']
          source_id: string | null
          status: Database['public']['Enums']['reminder_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          due_on: string
          source_type?: Database['public']['Enums']['reminder_source']
          source_id?: string | null
          status?: Database['public']['Enums']['reminder_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          due_on?: string
          source_type?: Database['public']['Enums']['reminder_source']
          source_id?: string | null
          status?: Database['public']['Enums']['reminder_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      convert_wishlist_item: {
        Args: {
          p_wishlist_item_id: string
          p_monthly_amount: number
          p_target_date?: string | null
          p_start_date?: string
        }
        Returns: string
      }
    }
    Enums: {
      expense_period: 'weekly' | 'monthly' | 'yearly'
      expense_source: 'manual' | 'savings_goal'
      wishlist_kind: 'purchase' | 'travel'
      wishlist_status: 'active' | 'converted' | 'completed' | 'archived'
      savings_goal_status: 'active' | 'paused' | 'completed' | 'cancelled'
      reminder_source: 'manual' | 'savings_goal' | 'wishlist_item'
      reminder_status: 'pending' | 'done' | 'dismissed'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

export const Constants = {
  public: {
    Enums: {
      expense_period: ['weekly', 'monthly', 'yearly'],
      expense_source: ['manual', 'savings_goal'],
      wishlist_kind: ['purchase', 'travel'],
      wishlist_status: ['active', 'converted', 'completed', 'archived'],
      savings_goal_status: ['active', 'paused', 'completed', 'cancelled'],
      reminder_source: ['manual', 'savings_goal', 'wishlist_item'],
      reminder_status: ['pending', 'done', 'dismissed'],
    },
  },
} as const
