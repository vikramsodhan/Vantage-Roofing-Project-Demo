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
      divisions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          actual_disposal: number
          actual_gutters: number
          actual_labour: number
          actual_materials: number
          actual_other: number
          actual_warranty: number
          date_entered: string
          date_quoted: string
          date_sold: string | null
          days: number
          disposal: number
          division_id: string
          entered_by: string
          exclude_from_quote_metrics: boolean
          gutters: number
          id: string
          job_address: string
          labour: number
          markup_pct: number
          materials: number
          mgn: number
          notes: string | null
          other: number
          roof_type: Database["public"]["Enums"]["job_roof_type"] | null
          sales_price: number
          salesperson_id: string
          sold: boolean
          squares: number
          total_job_cost: number
          updated_at: string
          warranty: number
          work_type_id: string
        }
        Insert: {
          actual_disposal?: number
          actual_gutters?: number
          actual_labour?: number
          actual_materials?: number
          actual_other?: number
          actual_warranty?: number
          date_entered?: string
          date_quoted: string
          date_sold?: string | null
          days?: number
          disposal?: number
          division_id: string
          entered_by: string
          exclude_from_quote_metrics?: boolean
          gutters?: number
          id?: string
          job_address: string
          labour?: number
          markup_pct?: number
          materials?: number
          mgn?: number
          notes?: string | null
          other?: number
          roof_type?: Database["public"]["Enums"]["job_roof_type"] | null
          sales_price?: number
          salesperson_id: string
          sold?: boolean
          squares?: number
          total_job_cost?: number
          updated_at?: string
          warranty?: number
          work_type_id: string
        }
        Update: {
          actual_disposal?: number
          actual_gutters?: number
          actual_labour?: number
          actual_materials?: number
          actual_other?: number
          actual_warranty?: number
          date_entered?: string
          date_quoted?: string
          date_sold?: string | null
          days?: number
          disposal?: number
          division_id?: string
          entered_by?: string
          exclude_from_quote_metrics?: boolean
          gutters?: number
          id?: string
          job_address?: string
          labour?: number
          markup_pct?: number
          materials?: number
          mgn?: number
          notes?: string | null
          other?: number
          roof_type?: Database["public"]["Enums"]["job_roof_type"] | null
          sales_price?: number
          salesperson_id?: string
          sold?: boolean
          squares?: number
          total_job_cost?: number
          updated_at?: string
          warranty?: number
          work_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      work_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_roof_type_required: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_roof_type_required?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_roof_type_required?: boolean
          name?: string
        }
        Relationships: []
      }
      year_end_plans: {
        Row: {
          avg_job_value_override: number | null
          conversion_pct_override: number | null
          created_at: string
          jobs_sold_override: number | null
          months_remaining_override: number | null
          revenue_override: number | null
          target_revenue: number | null
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          avg_job_value_override?: number | null
          conversion_pct_override?: number | null
          created_at?: string
          jobs_sold_override?: number | null
          months_remaining_override?: number | null
          revenue_override?: number | null
          target_revenue?: number | null
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          avg_job_value_override?: number | null
          conversion_pct_override?: number | null
          created_at?: string
          jobs_sold_override?: number | null
          months_remaining_override?: number | null
          revenue_override?: number | null
          target_revenue?: number | null
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "year_end_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      jobs_with_calculations: {
        Row: {
          actual_disposal: number | null
          actual_gutters: number | null
          actual_labour: number | null
          actual_materials: number | null
          actual_other: number | null
          actual_total_job_cost: number | null
          actual_warranty: number | null
          date_entered: string | null
          date_quoted: string | null
          date_sold: string | null
          days: number | null
          disposal: number | null
          division_id: string | null
          division_name: string | null
          dollar_per_square: number | null
          ee_mgn_per_day: number | null
          entered_by: string | null
          entered_by_name: string | null
          exclude_from_quote_metrics: boolean | null
          gutters: number | null
          id: string | null
          is_roof_type_required: boolean | null
          job_address: string | null
          labour: number | null
          markup_pct: number | null
          materials: number | null
          mgn: number | null
          mgn_per_day: number | null
          notes: string | null
          other: number | null
          roof_type: Database["public"]["Enums"]["job_roof_type"] | null
          sales_price: number | null
          salesperson_id: string | null
          salesperson_name: string | null
          sold: boolean | null
          squares: number | null
          total_cost_percent: number | null
          total_job_cost: number | null
          updated_at: string | null
          warranty: number | null
          work_type_id: string | null
          work_type_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_active_user: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_manager_or_owner: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      job_roof_type: "reroof" | "newroof"
      user_role: "salesperson" | "manager" | "owner"
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
      job_roof_type: ["reroof", "newroof"],
      user_role: ["salesperson", "manager", "owner"],
    },
  },
} as const
