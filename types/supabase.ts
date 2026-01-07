/**
 * Supabase Database Types
 *
 * These types will be auto-generated once Supabase is set up.
 * Run: npx supabase gen types typescript --project-id <your-project-id> > types/supabase.ts
 *
 * For now, these are manually defined based on our schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      mpas: {
        Row: {
          id: string;
          external_id: string | null;
          name: string;
          country: string | null;
          region: string | null;
          geometry: Json | null;
          center: Json | null;
          area_km2: number | null;
          established_year: number | null;
          protection_level: string | null;
          description: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          name: string;
          country?: string | null;
          region?: string | null;
          geometry?: Json | null;
          center?: Json | null;
          area_km2?: number | null;
          established_year?: number | null;
          protection_level?: string | null;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string | null;
          name?: string;
          country?: string | null;
          region?: string | null;
          geometry?: Json | null;
          center?: Json | null;
          area_km2?: number | null;
          established_year?: number | null;
          protection_level?: string | null;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      environmental_data: {
        Row: {
          id: string;
          mpa_id: string;
          parameter: string;
          value: number | null;
          unit: string | null;
          min_value: number | null;
          max_value: number | null;
          depth_m: number | null;
          measured_at: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mpa_id: string;
          parameter: string;
          value?: number | null;
          unit?: string | null;
          min_value?: number | null;
          max_value?: number | null;
          depth_m?: number | null;
          measured_at?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mpa_id?: string;
          parameter?: string;
          value?: number | null;
          unit?: string | null;
          min_value?: number | null;
          max_value?: number | null;
          depth_m?: number | null;
          measured_at?: string | null;
          source?: string;
          created_at?: string;
        };
      };
      species_data: {
        Row: {
          id: string;
          mpa_id: string;
          scientific_name: string;
          common_name: string | null;
          aphia_id: number | null;
          observation_count: number | null;
          trend: string | null;
          trend_percentage: number | null;
          last_observed: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mpa_id: string;
          scientific_name: string;
          common_name?: string | null;
          aphia_id?: number | null;
          observation_count?: number | null;
          trend?: string | null;
          trend_percentage?: number | null;
          last_observed?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mpa_id?: string;
          scientific_name?: string;
          common_name?: string | null;
          aphia_id?: number | null;
          observation_count?: number | null;
          trend?: string | null;
          trend_percentage?: number | null;
          last_observed?: string | null;
          source?: string;
          created_at?: string;
        };
      };
      health_scores: {
        Row: {
          id: string;
          mpa_id: string;
          score: number;
          confidence: string | null;
          breakdown: Json | null;
          data_sources: Json | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          mpa_id: string;
          score: number;
          confidence?: string | null;
          breakdown?: Json | null;
          data_sources?: Json | null;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          mpa_id?: string;
          score?: number;
          confidence?: string | null;
          breakdown?: Json | null;
          data_sources?: Json | null;
          calculated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_mpas: {
        Row: {
          user_id: string;
          mpa_id: string;
          notes: string | null;
          saved_at: string;
        };
        Insert: {
          user_id: string;
          mpa_id: string;
          notes?: string | null;
          saved_at?: string;
        };
        Update: {
          user_id?: string;
          mpa_id?: string;
          notes?: string | null;
          saved_at?: string;
        };
      };
      observations: {
        Row: {
          id: string;
          user_id: string | null;
          mpa_id: string | null;
          report_type: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation';
          species_name: string | null;
          species_type: string | null;
          quantity: number | null;
          notes: string | null;
          latitude: number;
          longitude: number;
          location_accuracy_m: number | null;
          location_manually_entered: boolean;
          photo_url: string | null;
          photo_metadata: Json | null;
          health_score_assessment: number | null;
          is_draft: boolean;
          synced_at: string | null;
          observed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          mpa_id?: string | null;
          report_type: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation';
          species_name?: string | null;
          species_type?: string | null;
          quantity?: number | null;
          notes?: string | null;
          latitude: number;
          longitude: number;
          location_accuracy_m?: number | null;
          location_manually_entered?: boolean;
          photo_url?: string | null;
          photo_metadata?: Json | null;
          health_score_assessment?: number | null;
          is_draft?: boolean;
          synced_at?: string | null;
          observed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          mpa_id?: string | null;
          report_type?: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation';
          species_name?: string | null;
          species_type?: string | null;
          quantity?: number | null;
          notes?: string | null;
          latitude?: number;
          longitude?: number;
          location_accuracy_m?: number | null;
          location_manually_entered?: boolean;
          photo_url?: string | null;
          photo_metadata?: Json | null;
          health_score_assessment?: number | null;
          is_draft?: boolean;
          synced_at?: string | null;
          observed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_health_assessments: {
        Row: {
          id: string;
          user_id: string | null;
          mpa_id: string;
          observation_id: string | null;
          score: number;
          notes: string | null;
          assessed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          mpa_id: string;
          observation_id?: string | null;
          score: number;
          notes?: string | null;
          assessed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          mpa_id?: string;
          observation_id?: string | null;
          score?: number;
          notes?: string | null;
          assessed_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Commonly used types
export type MPA = Tables<'mpas'>;
export type EnvironmentalData = Tables<'environmental_data'>;
export type SpeciesData = Tables<'species_data'>;
export type HealthScore = Tables<'health_scores'>;
export type Profile = Tables<'profiles'>;
export type SavedMPA = Tables<'saved_mpas'>;
export type ObservationRow = Tables<'observations'>;
export type UserHealthAssessmentRow = Tables<'user_health_assessments'>;
