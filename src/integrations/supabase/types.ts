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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          biggest_opportunity: string | null
          business_summary: string | null
          created_at: string
          final_score: number
          id: string
          industry: string | null
          industry_confidence: number | null
          overall_summary: string | null
          scan_id: string
          strengths_json: Json
          weaknesses_json: Json
        }
        Insert: {
          biggest_opportunity?: string | null
          business_summary?: string | null
          created_at?: string
          final_score: number
          id?: string
          industry?: string | null
          industry_confidence?: number | null
          overall_summary?: string | null
          scan_id: string
          strengths_json?: Json
          weaknesses_json?: Json
        }
        Update: {
          biggest_opportunity?: string | null
          business_summary?: string | null
          created_at?: string
          final_score?: number
          id?: string
          industry?: string | null
          industry_confidence?: number | null
          overall_summary?: string | null
          scan_id?: string
          strengths_json?: Json
          weaknesses_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          accessibility_score: number | null
          best_practices_score: number | null
          created_at: string
          id: string
          performance_score: number | null
          raw_json: Json | null
          scan_id: string
          seo_score: number | null
        }
        Insert: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          created_at?: string
          id?: string
          performance_score?: number | null
          raw_json?: Json | null
          scan_id: string
          seo_score?: number | null
        }
        Update: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          created_at?: string
          id?: string
          performance_score?: number | null
          raw_json?: Json | null
          scan_id?: string
          seo_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          analysis_summary: string | null
          biggest_problem: string | null
          booking_clicked_at: string | null
          booking_url: string | null
          company: string | null
          created_at: string
          domain: string | null
          email: string
          estimated_loss: string | null
          follow_up_at: string | null
          follow_up_count: number
          id: string
          industry: string | null
          lead_status: string
          name: string
          notes: string | null
          scan_id: string | null
          status: string
          total_score: number | null
          updated_at: string
          visibility_gap: number | null
        }
        Insert: {
          analysis_summary?: string | null
          biggest_problem?: string | null
          booking_clicked_at?: string | null
          booking_url?: string | null
          company?: string | null
          created_at?: string
          domain?: string | null
          email: string
          estimated_loss?: string | null
          follow_up_at?: string | null
          follow_up_count?: number
          id?: string
          industry?: string | null
          lead_status?: string
          name: string
          notes?: string | null
          scan_id?: string | null
          status?: string
          total_score?: number | null
          updated_at?: string
          visibility_gap?: number | null
        }
        Update: {
          analysis_summary?: string | null
          biggest_problem?: string | null
          booking_clicked_at?: string | null
          booking_url?: string | null
          company?: string | null
          created_at?: string
          domain?: string | null
          email?: string
          estimated_loss?: string | null
          follow_up_at?: string | null
          follow_up_count?: number
          id?: string
          industry?: string | null
          lead_status?: string
          name?: string
          notes?: string | null
          scan_id?: string | null
          status?: string
          total_score?: number | null
          updated_at?: string
          visibility_gap?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          desktop_screenshot_url: string | null
          h1: string | null
          html_snapshot: string | null
          id: string
          meta_description: string | null
          mobile_screenshot_url: string | null
          scan_id: string
          text_content: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          desktop_screenshot_url?: string | null
          h1?: string | null
          html_snapshot?: string | null
          id?: string
          meta_description?: string | null
          mobile_screenshot_url?: string | null
          scan_id: string
          text_content?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          desktop_screenshot_url?: string | null
          h1?: string | null
          html_snapshot?: string | null
          id?: string
          meta_description?: string | null
          mobile_screenshot_url?: string | null
          scan_id?: string
          text_content?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          created_at: string
          domain: string
          id: string
          normalized_domain: string
          status: Database["public"]["Enums"]["scan_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          normalized_domain: string
          status?: Database["public"]["Enums"]["scan_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          normalized_domain?: string
          status?: Database["public"]["Enums"]["scan_status"]
          updated_at?: string
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
      scan_status:
        | "queued"
        | "crawling"
        | "auditing"
        | "ai_analysis"
        | "complete"
        | "failed"
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
      scan_status: [
        "queued",
        "crawling",
        "auditing",
        "ai_analysis",
        "complete",
        "failed",
      ],
    },
  },
} as const
