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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          is_expert: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          is_expert?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          is_expert?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'saved_mpas_mpa_id_fkey';
            columns: ['mpa_id'];
            isOneToOne: false;
            referencedRelation: 'mpas';
            referencedColumns: ['id'];
          },
        ];
      };
      observations: {
        Row: {
          id: string;
          user_id: string | null;
          mpa_id: string | null;
          report_type: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation' | 'marine_litter';
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
          quality_tier: 'casual' | 'needs_id' | 'community_verified' | 'research_grade';
          community_species_name: string | null;
          litter_items: Json | null;
          litter_weight_kg: number | null;
          survey_length_m: number | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          mpa_id?: string | null;
          report_type: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation' | 'marine_litter';
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
          quality_tier?: 'casual' | 'needs_id' | 'community_verified' | 'research_grade';
          community_species_name?: string | null;
          litter_items?: Json | null;
          litter_weight_kg?: number | null;
          survey_length_m?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          mpa_id?: string | null;
          report_type?: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation' | 'marine_litter';
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
          quality_tier?: 'casual' | 'needs_id' | 'community_verified' | 'research_grade';
          community_species_name?: string | null;
          litter_items?: Json | null;
          litter_weight_kg?: number | null;
          survey_length_m?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'observations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'observations_mpa_id_fkey';
            columns: ['mpa_id'];
            isOneToOne: false;
            referencedRelation: 'mpas';
            referencedColumns: ['id'];
          },
        ];
      };
      observation_verifications: {
        Row: {
          id: string;
          observation_id: string;
          user_id: string;
          species_name: string | null;
          is_agreement: boolean;
          confidence: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          observation_id: string;
          user_id: string;
          species_name?: string | null;
          is_agreement: boolean;
          confidence: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          observation_id?: string;
          user_id?: string;
          species_name?: string | null;
          is_agreement?: boolean;
          confidence?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'observation_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'observation_verifications_observation_id_fkey';
            columns: ['observation_id'];
            isOneToOne: false;
            referencedRelation: 'observations';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          data?: Json;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [];
      };
      user_streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_observation_date: string | null;
        };
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_observation_date?: string | null;
        };
        Update: {
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_observation_date?: string | null;
        };
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: {
      mpa_abundance_summaries: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
      population_trends: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
      environmental_summaries: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
      user_species_collection: {
        Row: {
          user_id: string;
          species_name: string;
          first_seen_at: string;
          observation_count: number;
          mpa_id: string;
          mpa_name: string | null;
        };
        Relationships: [];
      };
      user_verification_stats: {
        Row: {
          user_id: string;
          total_verifications: number;
          agreements: number;
          suggestions: number;
          avg_confidence: number | null;
          observations_reviewed: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      submit_verification: {
        Args: {
          p_observation_id: string;
          p_user_id: string;
          p_species_name: string | null;
          p_is_agreement: boolean;
          p_confidence: number;
          p_notes: string | null;
        };
        Returns: Json;
      };
      compute_observation_consensus: {
        Args: {
          p_observation_id: string;
        };
        Returns: void;
      };
      create_observation_with_health: {
        Args: {
          p_mpa_id: string;
          p_user_id: string | null;
          p_report_type: string;
          p_species_name: string | null;
          p_species_type: string | null;
          p_quantity: number | null;
          p_notes: string | null;
          p_latitude: number;
          p_longitude: number;
          p_location_accuracy_m: number | null;
          p_photo_url: string | null;
          p_photo_metadata: Json | null;
          p_health_score: number | null;
          p_litter_items: Json | null;
          p_litter_weight_kg: number | null;
          p_survey_length_m: number | null;
        };
        Returns: string;
      };
      get_leaderboard: {
        Args: {
          p_type: string;
          p_period: string;
          p_mpa_id: string | null;
          p_limit: number;
        };
        Returns: Json;
      };
      check_and_award_badges: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
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
