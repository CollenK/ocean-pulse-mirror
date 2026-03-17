/**
 * Gamification Types
 * Achievement badges, streaks, species collection, and leaderboard types
 */

// Badge definitions

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'observation' | 'verification' | 'streak' | 'collection';
  threshold: number;
}

export interface UserBadge {
  badge_id: string;
  user_id: string;
  earned_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_observation_date: string; // YYYY-MM-DD
}

export interface SpeciesCollectionEntry {
  species_name: string;
  first_seen_at: string;
  observation_count: number;
  mpa_id: string;
  mpa_name?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  rank: number;
}

export type LeaderboardType = 'observations' | 'species' | 'verifications';
export type LeaderboardPeriod = 'monthly' | 'all_time';

export interface GamificationStats {
  badges: UserBadge[];
  streak: UserStreak;
  speciesCount: number;
  totalObservations: number;
  rank?: number;
}

/**
 * All available badges in the system
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_splash',
    name: 'First Splash',
    description: 'Submit your first observation',
    icon: 'water',
    category: 'observation',
    threshold: 1,
  },
  {
    id: 'sharp_eye',
    name: 'Sharp Eye',
    description: 'Submit 10 observations',
    icon: 'eye',
    category: 'observation',
    threshold: 10,
  },
  {
    id: 'reef_guardian',
    name: 'Reef Guardian',
    description: 'Submit 50 observations',
    icon: 'shield-check',
    category: 'observation',
    threshold: 50,
  },
  {
    id: 'species_spotter',
    name: 'Species Spotter',
    description: 'Record 10 different species',
    icon: 'fish',
    category: 'collection',
    threshold: 10,
  },
  {
    id: 'deep_diver',
    name: 'Deep Diver',
    description: 'Record 50 different species',
    icon: 'fish',
    category: 'collection',
    threshold: 50,
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a 7-day observation streak',
    icon: 'flame',
    category: 'streak',
    threshold: 7,
  },
  {
    id: 'data_champion',
    name: 'Data Champion',
    description: 'Verify 25 observations',
    icon: 'check-circle',
    category: 'verification',
    threshold: 25,
  },
  {
    id: 'night_watch',
    name: 'Night Watch',
    description: 'Submit 5 observations between 8pm and 6am',
    icon: 'moon',
    category: 'observation',
    threshold: 5,
  },
  {
    id: 'citizen_scientist',
    name: 'Citizen Scientist',
    description: 'Submit 100 observations',
    icon: 'graduation-cap',
    category: 'observation',
    threshold: 100,
  },
];

/**
 * Lookup a badge definition by ID
 */
export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}
