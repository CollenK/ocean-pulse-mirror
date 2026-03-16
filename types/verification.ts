/**
 * Verification & Community Validation Types
 */

export type QualityTier = 'casual' | 'needs_id' | 'community_verified' | 'research_grade';

export interface Verification {
  id: string;
  observation_id: string;
  user_id: string;
  species_name: string | null;
  is_agreement: boolean;
  confidence: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    is_expert: boolean;
  } | null;
}

export interface VerificationConsensus {
  observation_id: string;
  total_votes: number;
  agreement_ratio: number;
  consensus_species: string | null;
  quality_tier: QualityTier;
  expert_count: number;
  error?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface VerificationStats {
  user_id: string;
  total_verifications: number;
  agreements: number;
  suggestions: number;
  avg_confidence: number | null;
  observations_reviewed: number;
}

export interface SubmitVerificationInput {
  observationId: string;
  userId: string;
  speciesName: string | null;
  isAgreement: boolean;
  confidence: number;
  notes?: string;
}

export const QUALITY_TIER_CONFIG: Record<QualityTier, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  casual: {
    label: 'Casual',
    icon: 'fi-rr-eye',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    description: 'Basic observation without enough data for verification',
  },
  needs_id: {
    label: 'Unverified',
    icon: 'fi-rr-interrogation',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Species ID has not been confirmed by the community yet',
  },
  community_verified: {
    label: 'Verified',
    icon: 'fi-rr-check-circle',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Species ID confirmed by 2+ community members',
  },
  research_grade: {
    label: 'Research Grade',
    icon: 'fi-rr-diploma',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Verified by community including expert reviewers',
  },
};
