import { describe, it, expect } from 'vitest';
import {
  calculateIndicatorHealthScore,
  processOccurrenceData,
  getHealthScoreInterpretation,
  getCategoryInterpretation,
} from '@/lib/health-score/indicator-species';
import type { IndicatorSpecies, SpeciesPresence, CategoryHealthScore } from '@/types/indicator-species';
import {
  SpeciesCategory,
  EcosystemType,
  ConservationStatus,
  SensitivityRating,
} from '@/types/indicator-species';

function makeSpecies(overrides: Partial<IndicatorSpecies> = {}): IndicatorSpecies {
  return {
    id: 'test-species-1',
    scientificName: 'Tursiops truncatus',
    commonName: 'Bottlenose Dolphin',
    category: SpeciesCategory.APEX_PREDATOR,
    ecosystems: [EcosystemType.TEMPERATE],
    obisTaxonId: 137111,
    conservationStatus: ConservationStatus.LEAST_CONCERN,
    sensitivityRating: SensitivityRating.MEDIUM,
    ecologicalSignificance: 'Apex predator indicator',
    geographicBounds: { north: 60, south: -60, east: 180, west: -180 },
    lastUpdated: Date.now(),
    ...overrides,
  };
}

function makePresence(overrides: Partial<SpeciesPresence> = {}): SpeciesPresence {
  return {
    speciesId: 'test-species-1',
    present: true,
    occurrenceCount: 30,
    confidence: 'high',
    ...overrides,
  };
}

describe('getHealthScoreInterpretation', () => {
  it('returns Excellent for scores >= 80', () => {
    const result = getHealthScoreInterpretation(85);
    expect(result.label).toBe('Excellent');
    expect(result.color).toBe('#10B981');
  });

  it('returns Good for scores 60-79', () => {
    const result = getHealthScoreInterpretation(65);
    expect(result.label).toBe('Good');
    expect(result.color).toBe('#84CC16');
  });

  it('returns Moderate for scores 40-59', () => {
    const result = getHealthScoreInterpretation(45);
    expect(result.label).toBe('Moderate');
    expect(result.color).toBe('#F59E0B');
  });

  it('returns Concerning for scores 20-39', () => {
    const result = getHealthScoreInterpretation(25);
    expect(result.label).toBe('Concerning');
    expect(result.color).toBe('#F97316');
  });

  it('returns Critical for scores < 20', () => {
    const result = getHealthScoreInterpretation(10);
    expect(result.label).toBe('Critical');
    expect(result.color).toBe('#EF4444');
  });

  it('returns Critical for score 0', () => {
    const result = getHealthScoreInterpretation(0);
    expect(result.label).toBe('Critical');
  });
});

describe('getCategoryInterpretation', () => {
  it('returns "No data" when speciesTotal is 0', () => {
    const score: CategoryHealthScore = {
      category: SpeciesCategory.CORAL,
      score: 0,
      maxScore: 0,
      speciesPresent: 0,
      speciesTotal: 0,
      weight: 0.2,
    };
    const result = getCategoryInterpretation(score);
    expect(result.status).toBe('No data');
    expect(result.color).toBe('#6B7280');
  });

  it('returns Excellent when >= 80% species present', () => {
    const score: CategoryHealthScore = {
      category: SpeciesCategory.APEX_PREDATOR,
      score: 40,
      maxScore: 50,
      speciesPresent: 4,
      speciesTotal: 5,
      weight: 0.25,
    };
    expect(getCategoryInterpretation(score).status).toBe('Excellent');
  });

  it('returns Good when 60-79% species present', () => {
    const score: CategoryHealthScore = {
      category: SpeciesCategory.APEX_PREDATOR,
      score: 30,
      maxScore: 50,
      speciesPresent: 3,
      speciesTotal: 5,
      weight: 0.25,
    };
    expect(getCategoryInterpretation(score).status).toBe('Good');
  });

  it('returns Critical when < 20% species present', () => {
    const score: CategoryHealthScore = {
      category: SpeciesCategory.APEX_PREDATOR,
      score: 5,
      maxScore: 50,
      speciesPresent: 0,
      speciesTotal: 5,
      weight: 0.25,
    };
    expect(getCategoryInterpretation(score).status).toBe('Critical');
  });
});

describe('calculateIndicatorHealthScore', () => {
  it('returns zero percentage with no species present', () => {
    const species = [makeSpecies()];
    const presence = [makePresence({ present: false, occurrenceCount: 0 })];
    const result = calculateIndicatorHealthScore(species, presence);
    expect(result.percentage).toBe(0);
  });

  it('returns positive score when species are present', () => {
    const species = [makeSpecies()];
    const presence = [makePresence({ present: true, occurrenceCount: 30, confidence: 'high' })];
    const result = calculateIndicatorHealthScore(species, presence);
    expect(result.percentage).toBeGreaterThan(0);
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it('assigns higher raw category scores for endangered species', () => {
    const lcSpecies = makeSpecies({
      id: 'lc-1',
      conservationStatus: ConservationStatus.LEAST_CONCERN,
    });
    const enSpecies = makeSpecies({
      id: 'en-1',
      conservationStatus: ConservationStatus.ENDANGERED,
    });

    const lcPresence = [makePresence({ speciesId: 'lc-1', present: true, occurrenceCount: 30 })];
    const enPresence = [makePresence({ speciesId: 'en-1', present: true, occurrenceCount: 30 })];

    const lcResult = calculateIndicatorHealthScore([lcSpecies], lcPresence);
    const enResult = calculateIndicatorHealthScore([enSpecies], enPresence);

    // The raw category score should be higher for endangered species
    // because STATUS_WEIGHTS[EN] (1.75) > STATUS_WEIGHTS[LC] (1.0)
    const lcCategoryScore = lcResult.categoryScores.find(
      c => c.category === SpeciesCategory.APEX_PREDATOR
    );
    const enCategoryScore = enResult.categoryScores.find(
      c => c.category === SpeciesCategory.APEX_PREDATOR
    );

    expect(enCategoryScore!.score).toBeGreaterThan(lcCategoryScore!.score);
  });

  it('assigns low data quality when no presence data provided', () => {
    const result = calculateIndicatorHealthScore([], []);
    expect(result.dataQuality).toBe('low');
  });

  it('populates category scores', () => {
    const species = [makeSpecies()];
    const presence = [makePresence()];
    const result = calculateIndicatorHealthScore(species, presence);
    expect(result.categoryScores.length).toBeGreaterThan(0);
  });
});

describe('processOccurrenceData', () => {
  it('creates presence records for all relevant species', () => {
    const species = [
      makeSpecies({ id: 'sp1', scientificName: 'Tursiops truncatus' }),
      makeSpecies({ id: 'sp2', scientificName: 'Carcharodon carcharias' }),
    ];
    const occurrences = [
      { scientificName: 'Tursiops truncatus', eventDate: '2024-01-15' },
      { scientificName: 'Tursiops truncatus', eventDate: '2024-02-10' },
    ];

    const result = processOccurrenceData(occurrences, species);
    expect(result).toHaveLength(2);

    const dolphin = result.find(r => r.speciesId === 'sp1');
    expect(dolphin?.present).toBe(true);
    expect(dolphin?.occurrenceCount).toBe(2);

    const shark = result.find(r => r.speciesId === 'sp2');
    expect(shark?.present).toBe(false);
    expect(shark?.occurrenceCount).toBe(0);
  });

  it('matches species case-insensitively', () => {
    const species = [makeSpecies({ id: 'sp1', scientificName: 'Tursiops truncatus' })];
    const occurrences = [{ scientificName: 'tursiops truncatus' }];

    const result = processOccurrenceData(occurrences, species);
    expect(result[0].present).toBe(true);
    expect(result[0].occurrenceCount).toBe(1);
  });

  it('returns empty array for empty inputs', () => {
    expect(processOccurrenceData([], [])).toEqual([]);
  });

  it('tracks last seen date', () => {
    const species = [makeSpecies({ id: 'sp1', scientificName: 'Tursiops truncatus' })];
    const occurrences = [
      { scientificName: 'Tursiops truncatus', eventDate: '2024-01-15' },
      { scientificName: 'Tursiops truncatus', eventDate: '2024-06-20' },
      { scientificName: 'Tursiops truncatus', eventDate: '2024-03-10' },
    ];

    const result = processOccurrenceData(occurrences, species);
    expect(result[0].lastSeen).toBe('2024-06-20');
  });

  it('assigns confidence based on occurrence count', () => {
    const species = [makeSpecies({ id: 'sp1', scientificName: 'Tursiops truncatus' })];

    // Low confidence: < 5 occurrences
    const lowOccurrences = Array.from({ length: 3 }, () => ({
      scientificName: 'Tursiops truncatus',
    }));
    const lowResult = processOccurrenceData(lowOccurrences, species);
    expect(lowResult[0].confidence).toBe('low');

    // Medium confidence: 5-19 occurrences
    const medOccurrences = Array.from({ length: 10 }, () => ({
      scientificName: 'Tursiops truncatus',
    }));
    const medResult = processOccurrenceData(medOccurrences, species);
    expect(medResult[0].confidence).toBe('medium');

    // High confidence: >= 20 occurrences
    const highOccurrences = Array.from({ length: 25 }, () => ({
      scientificName: 'Tursiops truncatus',
    }));
    const highResult = processOccurrenceData(highOccurrences, species);
    expect(highResult[0].confidence).toBe('high');
  });
});
