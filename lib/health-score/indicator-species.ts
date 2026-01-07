/**
 * Indicator Species Health Score Calculator
 * Calculates MPA health scores based on indicator species presence/absence
 */

import type {
  IndicatorSpecies,
  IndicatorHealthScore,
  CategoryHealthScore,
  SpeciesPresence,
  ConservationStatus,
  SensitivityRating,
} from '@/types/indicator-species';
import { CATEGORY_INFO, SpeciesCategory } from '@/types/indicator-species';
import {
  getIndicatorSpeciesForMPA,
  getIndicatorSpeciesByCategory,
  cacheIndicatorData,
  getCachedIndicatorData,
} from '../indicator-species';
import { INDICATOR_SPECIES } from '@/data/indicator-species';

/**
 * Weight multipliers for conservation status
 * More endangered species contribute more to the score when present
 */
const STATUS_WEIGHTS: Record<ConservationStatus, number> = {
  CR: 2.0,  // Critically Endangered - highest weight
  EN: 1.75, // Endangered
  VU: 1.5,  // Vulnerable
  NT: 1.25, // Near Threatened
  LC: 1.0,  // Least Concern - base weight
  DD: 0.75, // Data Deficient - reduced weight due to uncertainty
};

/**
 * Weight multipliers for sensitivity rating
 * High sensitivity species are better indicators
 */
const SENSITIVITY_WEIGHTS: Record<SensitivityRating, number> = {
  high: 1.25,
  medium: 1.0,
  low: 0.85,
};

/**
 * Calculate individual species score contribution
 */
function calculateSpeciesScore(
  species: IndicatorSpecies,
  presence: SpeciesPresence
): number {
  if (!presence.present) {
    return 0;
  }

  // Base score of 10 points per present species
  let score = 10;

  // Apply conservation status weight
  score *= STATUS_WEIGHTS[species.conservationStatus] || 1.0;

  // Apply sensitivity weight
  score *= SENSITIVITY_WEIGHTS[species.sensitivityRating] || 1.0;

  // Apply confidence modifier
  const confidenceModifiers = { high: 1.0, medium: 0.8, low: 0.6 };
  score *= confidenceModifiers[presence.confidence] || 0.8;

  // Bonus for high occurrence count (indicates healthy population)
  if (presence.occurrenceCount > 50) {
    score *= 1.2;
  } else if (presence.occurrenceCount > 20) {
    score *= 1.1;
  }

  return score;
}

/**
 * Calculate health score for a single category
 */
function calculateCategoryScore(
  category: SpeciesCategory,
  relevantSpecies: IndicatorSpecies[],
  presenceMap: Map<string, SpeciesPresence>
): CategoryHealthScore {
  const categorySpecies = relevantSpecies.filter(s => s.category === category);
  const categoryInfo = CATEGORY_INFO[category];

  if (categorySpecies.length === 0) {
    return {
      category,
      score: 0,
      maxScore: 0,
      speciesPresent: 0,
      speciesTotal: 0,
      weight: categoryInfo.healthScoreWeight,
    };
  }

  let totalScore = 0;
  let maxPossibleScore = 0;
  let speciesPresent = 0;

  for (const species of categorySpecies) {
    const presence = presenceMap.get(species.id);

    // Calculate max possible score for this species
    const maxSpeciesScore = 10 *
      (STATUS_WEIGHTS[species.conservationStatus] || 1.0) *
      (SENSITIVITY_WEIGHTS[species.sensitivityRating] || 1.0) *
      1.2; // Max confidence and occurrence bonuses

    maxPossibleScore += maxSpeciesScore;

    if (presence && presence.present) {
      totalScore += calculateSpeciesScore(species, presence);
      speciesPresent++;
    }
  }

  return {
    category,
    score: totalScore,
    maxScore: maxPossibleScore,
    speciesPresent,
    speciesTotal: categorySpecies.length,
    weight: categoryInfo.healthScoreWeight,
  };
}

/**
 * Calculate overall indicator species health score for an MPA
 */
export function calculateIndicatorHealthScore(
  relevantSpecies: IndicatorSpecies[],
  presenceData: SpeciesPresence[]
): IndicatorHealthScore {
  // Create presence lookup map
  const presenceMap = new Map<string, SpeciesPresence>(
    presenceData.map(p => [p.speciesId, p])
  );

  // Calculate scores for each category
  const categoryScores: CategoryHealthScore[] = [];
  let weightedTotal = 0;
  let weightedMax = 0;

  for (const category of Object.values(SpeciesCategory)) {
    const categoryScore = calculateCategoryScore(category, relevantSpecies, presenceMap);
    categoryScores.push(categoryScore);

    // Apply category weight
    const weight = categoryScore.weight;
    if (categoryScore.maxScore > 0) {
      const normalizedScore = categoryScore.score / categoryScore.maxScore;
      weightedTotal += normalizedScore * weight * 100;
      weightedMax += weight * 100;
    }
  }

  // Calculate final percentage
  const percentage = weightedMax > 0 ? (weightedTotal / weightedMax) * 100 : 0;

  // Determine data quality based on presence data
  const dataQuality = determineDataQuality(presenceData);

  return {
    totalScore: Math.round(weightedTotal),
    maxPossibleScore: Math.round(weightedMax),
    percentage: Math.round(percentage),
    categoryScores,
    dataQuality,
    lastCalculated: Date.now(),
  };
}

/**
 * Determine data quality based on presence records
 */
function determineDataQuality(
  presenceData: SpeciesPresence[]
): 'high' | 'medium' | 'low' {
  if (presenceData.length === 0) {
    return 'low';
  }

  const totalOccurrences = presenceData.reduce(
    (sum, p) => sum + p.occurrenceCount,
    0
  );

  const highConfidenceCount = presenceData.filter(
    p => p.confidence === 'high'
  ).length;

  const confidenceRatio = highConfidenceCount / presenceData.length;

  if (totalOccurrences > 500 && confidenceRatio > 0.7) {
    return 'high';
  } else if (totalOccurrences > 100 && confidenceRatio > 0.4) {
    return 'medium';
  }

  return 'low';
}

/**
 * Process OBIS occurrence data into species presence records
 */
export function processOccurrenceData(
  occurrences: any[],
  relevantSpecies: IndicatorSpecies[]
): SpeciesPresence[] {
  // Create lookup maps
  const speciesByName = new Map(
    relevantSpecies.map(s => [s.scientificName.toLowerCase(), s])
  );
  const speciesByTaxonId = new Map(
    relevantSpecies.map(s => [s.obisTaxonId, s])
  );

  // Count occurrences per species
  const occurrenceCounts = new Map<string, {
    count: number;
    lastSeen: string | undefined;
  }>();

  for (const occ of occurrences) {
    const scientificName = occ.scientificName?.toLowerCase();
    const taxonId = occ.taxonID || occ.aphiaID;

    // Find matching indicator species
    let species = speciesByName.get(scientificName);
    if (!species && taxonId) {
      species = speciesByTaxonId.get(taxonId);
    }

    if (species) {
      const current = occurrenceCounts.get(species.id) || {
        count: 0,
        lastSeen: undefined,
      };

      current.count++;

      // Track most recent sighting
      const eventDate = occ.eventDate;
      if (eventDate && (!current.lastSeen || eventDate > current.lastSeen)) {
        current.lastSeen = eventDate;
      }

      occurrenceCounts.set(species.id, current);
    }
  }

  // Generate presence records for all relevant species
  return relevantSpecies.map(species => {
    const data = occurrenceCounts.get(species.id);

    return {
      speciesId: species.id,
      present: (data?.count || 0) > 0,
      occurrenceCount: data?.count || 0,
      lastSeen: data?.lastSeen,
      confidence: determinePresenceConfidence(data?.count || 0),
    };
  });
}

/**
 * Determine confidence level based on occurrence count
 */
function determinePresenceConfidence(
  occurrenceCount: number
): 'high' | 'medium' | 'low' {
  if (occurrenceCount >= 20) return 'high';
  if (occurrenceCount >= 5) return 'medium';
  return 'low';
}

/**
 * Get health score interpretation text
 */
export function getHealthScoreInterpretation(
  percentage: number
): { label: string; description: string; color: string } {
  if (percentage >= 80) {
    return {
      label: 'Excellent',
      description: 'High indicator species diversity with strong population presence',
      color: '#10B981',
    };
  } else if (percentage >= 60) {
    return {
      label: 'Good',
      description: 'Healthy indicator species populations with some gaps',
      color: '#84CC16',
    };
  } else if (percentage >= 40) {
    return {
      label: 'Moderate',
      description: 'Some indicator species present but populations may be stressed',
      color: '#F59E0B',
    };
  } else if (percentage >= 20) {
    return {
      label: 'Concerning',
      description: 'Low indicator species presence suggests ecosystem stress',
      color: '#F97316',
    };
  }

  return {
    label: 'Critical',
    description: 'Very few indicator species detected; immediate attention needed',
    color: '#EF4444',
  };
}

/**
 * Get category health score interpretation
 */
export function getCategoryInterpretation(
  categoryScore: CategoryHealthScore
): { status: string; color: string } {
  if (categoryScore.speciesTotal === 0) {
    return { status: 'No data', color: '#6B7280' };
  }

  const presenceRatio = categoryScore.speciesPresent / categoryScore.speciesTotal;

  if (presenceRatio >= 0.8) {
    return { status: 'Excellent', color: '#10B981' };
  } else if (presenceRatio >= 0.6) {
    return { status: 'Good', color: '#84CC16' };
  } else if (presenceRatio >= 0.4) {
    return { status: 'Moderate', color: '#F59E0B' };
  } else if (presenceRatio >= 0.2) {
    return { status: 'Low', color: '#F97316' };
  }

  return { status: 'Critical', color: '#EF4444' };
}

/**
 * Generate health score summary for display
 */
export function generateHealthScoreSummary(
  healthScore: IndicatorHealthScore
): {
  overallStatus: string;
  topCategories: { name: string; status: string }[];
  recommendations: string[];
} {
  const interpretation = getHealthScoreInterpretation(healthScore.percentage);

  // Sort categories by presence ratio
  const sortedCategories = [...healthScore.categoryScores]
    .filter(c => c.speciesTotal > 0)
    .sort((a, b) => {
      const ratioA = a.speciesPresent / a.speciesTotal;
      const ratioB = b.speciesPresent / b.speciesTotal;
      return ratioB - ratioA;
    });

  const topCategories = sortedCategories.slice(0, 3).map(c => ({
    name: CATEGORY_INFO[c.category].name,
    status: getCategoryInterpretation(c).status,
  }));

  // Generate recommendations based on low-scoring categories
  const recommendations: string[] = [];

  for (const category of healthScore.categoryScores) {
    if (category.speciesTotal === 0) continue;

    const presenceRatio = category.speciesPresent / category.speciesTotal;
    const categoryInfo = CATEGORY_INFO[category.category];

    if (presenceRatio < 0.4) {
      recommendations.push(
        `Monitor ${categoryInfo.name.toLowerCase()} populations - low detection rates may indicate ecosystem stress`
      );
    }
  }

  if (healthScore.dataQuality === 'low') {
    recommendations.push(
      'Increase monitoring frequency to improve data quality and confidence in assessments'
    );
  }

  return {
    overallStatus: interpretation.label,
    topCategories,
    recommendations: recommendations.slice(0, 3),
  };
}
