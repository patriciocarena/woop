/**
 * Database types — manually maintained until we wire up `supabase gen types`.
 * Mirrors supabase/migrations/0001_init.sql.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          birth_date: string | null;
          sex: "male" | "female" | "other" | null;
          weight_kg: number | null;
          height_cm: number | null;
          max_hr: number | null;
          resting_hr_baseline: number | null;
          hrv_baseline: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          sex?: "male" | "female" | "other" | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          max_hr?: number | null;
          resting_hr_baseline?: number | null;
          hrv_baseline?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      daily_metrics: {
        Row: {
          user_id: string;
          date: string;
          recovery_score: number | null;
          strain_score: number | null;
          sleep_performance: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          recovery_score?: number | null;
          strain_score?: number | null;
          sleep_performance?: number | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["daily_metrics"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { sex: "male" | "female" | "other" };
  };
};
