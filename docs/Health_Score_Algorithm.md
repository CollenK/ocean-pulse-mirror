# Health Score Algorithm

This document describes the composite health score calculation used in Ocean PULSE to assess Marine Protected Area (MPA) health.

## Overview

The health score is a composite metric (0-100) calculated from multiple real-time data sources. Each source is weighted by its importance to ecosystem health, and weights are dynamically redistributed when data sources are unavailable.

## Data Sources and Weights

| Data Source | Base Weight | Description |
|-------------|-------------|-------------|
| Population Trends | 40% | 10-year population trends of indicator species from OBIS |
| Habitat Quality | 35% | Environmental conditions (temperature, salinity, pH) from OBIS-ENV-DATA |
| Species Diversity | 25% | Presence and count of ecosystem indicator species |

## Individual Score Calculations

### 1. Population Score

Calculated in `calculatePopulationScore()`:

- **Primary method**: Uses the pre-calculated `healthScore` from the abundance summary if available
- **Fallback method**: Calculates from trend directions of indicator species:

| Trend Direction | Points |
|-----------------|--------|
| Increasing | 100 |
| Stable | 70 |
| Decreasing | 30 |

Final score = weighted average of all species with valid trend data.

### 2. Habitat Score

Calculated in `calculateHabitatScore()`:

- Uses the pre-calculated `habitatQualityScore` from environmental summary
- Based on environmental parameters being within optimal ranges for marine life
- Defaults to 50 if no data available

### 3. Diversity Score

Calculated in `calculateDiversityScore()`:

- **Base calculation**: `indicatorSpeciesCount × 5` (capped at 100)
  - 5 species = 25 points
  - 10 species = 50 points
  - 20+ species = 100 points
- **Tracking bonus**: +10 points if satellite tracking data exists (tagged individuals in the area)

## Weight Redistribution

When a data source is unavailable, its weight is proportionally redistributed to the remaining sources based on their relative weights.

**Example**: If only Habitat Quality (35%) and Species Diversity (25%) have data:
- Total available weight = 35 + 25 = 60
- Habitat Quality new weight = 35/60 = 58.3%
- Species Diversity new weight = 25/60 = 41.7%

## Composite Score Calculation

```
compositeScore = (populationScore × populationWeight) +
                 (habitatScore × habitatWeight) +
                 (diversityScore × diversityWeight)
```

The final score is clamped between 0 and 100.

## Confidence Levels

The confidence level indicates how reliable the health score is based on data availability:

| Confidence | Data Sources Available |
|------------|------------------------|
| High | 3 of 3 |
| Medium | 2 of 3 |
| Low | 1 of 3 |

## Implementation

The algorithm is implemented in `hooks/useCompositeHealthScore.ts` and returns:

```typescript
interface CompositeHealthScore {
  score: number;                    // 0-100 composite score
  loading: boolean;                 // True while data is being fetched
  breakdown: {
    populationTrends: { score: number; weight: number; available: boolean };
    habitatQuality: { score: number; weight: number; available: boolean };
    speciesDiversity: { score: number; weight: number; available: boolean };
  };
  confidence: 'high' | 'medium' | 'low';
  dataSourcesAvailable: number;     // 0-3
}
```

## Data Sources

- **OBIS (Ocean Biodiversity Information System)**: Provides species occurrence and abundance data
- **OBIS-ENV-DATA**: Provides environmental measurements linked to species observations
- **Movebank**: Provides satellite tracking data for tagged marine animals
