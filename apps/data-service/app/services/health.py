"""Health score calculation service."""

from datetime import datetime

from app.models.health import (
    HealthScore,
    HealthBreakdown,
    EnvironmentalData,
    SpeciesData,
    MPALocation,
)
from app.services.copernicus import get_copernicus_service
from app.services.obis import get_obis_service


class HealthCalculator:
    """Calculate MPA health scores from environmental and species data."""

    # Optimal ranges for environmental parameters
    OPTIMAL_RANGES = {
        "sst": (18, 28),  # °C - varies by region
        "sst_anomaly": (-0.5, 0.5),  # °C from baseline
        "chlorophyll": (0.1, 3.0),  # mg/m³
        "oxygen": (5.0, 8.0),  # ml/l
        "ph": (8.0, 8.3),
        "salinity": (33, 37),  # PSU
    }

    # Weights for score components
    WEIGHTS = {
        "biodiversity": 0.30,
        "water_quality": 0.25,
        "thermal_stress": 0.25,
        "productivity": 0.20,
    }

    async def calculate_health_score(self, mpa: MPALocation) -> HealthScore:
        """
        Calculate comprehensive health score for an MPA.

        Args:
            mpa: MPA location information

        Returns:
            Complete health score with breakdown
        """
        # Fetch data from services
        copernicus = get_copernicus_service()
        obis = get_obis_service()

        env_data = await copernicus.get_environmental_data(
            lat=mpa.lat,
            lon=mpa.lon,
            mpa_id=mpa.id,
        )

        species_data = await obis.get_species_data(
            lat=mpa.lat,
            lon=mpa.lon,
            mpa_id=mpa.id,
        )

        # Calculate component scores
        biodiversity_score = self._calculate_biodiversity_score(species_data)
        water_quality_score = self._calculate_water_quality_score(env_data)
        thermal_stress_score = self._calculate_thermal_stress_score(env_data)
        productivity_score = self._calculate_productivity_score(env_data, species_data)

        breakdown = HealthBreakdown(
            biodiversity=biodiversity_score,
            water_quality=water_quality_score,
            thermal_stress=thermal_stress_score,
            productivity=productivity_score,
        )

        # Calculate overall score (weighted average)
        overall_score = int(
            biodiversity_score * self.WEIGHTS["biodiversity"]
            + water_quality_score * self.WEIGHTS["water_quality"]
            + thermal_stress_score * self.WEIGHTS["thermal_stress"]
            + productivity_score * self.WEIGHTS["productivity"]
        )

        # Determine confidence based on data quality
        confidence = self._calculate_confidence(env_data, species_data)

        # Track data sources
        data_sources = ["obis"]
        if env_data.sst is not None:
            data_sources.append("copernicus")

        return HealthScore(
            mpa_id=mpa.id,
            mpa_name=mpa.name,
            score=overall_score,
            confidence=confidence,
            breakdown=breakdown,
            environmental=env_data,
            species=species_data,
            data_sources=data_sources,
            calculated_at=datetime.utcnow(),
        )

    def _calculate_biodiversity_score(self, species: SpeciesData) -> int:
        """
        Calculate biodiversity score (0-100).

        Based on:
        - Species richness
        - Shannon diversity index
        - Recent observation activity
        """
        score = 50  # Base score

        # Species richness contribution (0-30 points)
        if species.total_species > 0:
            # Log scale - more species = higher score
            import math

            richness_score = min(30, int(math.log10(species.total_species + 1) * 15))
            score += richness_score - 15

        # Diversity index contribution (0-20 points)
        if species.biodiversity_index is not None:
            # Shannon index typically 0-5, optimal around 3-4
            if species.biodiversity_index >= 3.5:
                score += 20
            elif species.biodiversity_index >= 2.5:
                score += 15
            elif species.biodiversity_index >= 1.5:
                score += 10
            else:
                score += 5

        # Recent activity contribution (0-15 points)
        if species.total_observations > 0:
            recent_ratio = species.recent_observations / species.total_observations
            score += int(recent_ratio * 15)

        # Penalize for threatened species ratio
        if species.total_species > 0:
            threatened_ratio = species.threatened_species / species.total_species
            if threatened_ratio > 0.15:
                score -= 10
            elif threatened_ratio > 0.10:
                score -= 5

        return max(0, min(100, score))

    def _calculate_water_quality_score(self, env: EnvironmentalData) -> int:
        """
        Calculate water quality score (0-100).

        Based on:
        - Dissolved oxygen levels
        - pH levels
        - Salinity
        """
        scores = []

        # Oxygen score
        if env.oxygen is not None:
            opt_min, opt_max = self.OPTIMAL_RANGES["oxygen"]
            if opt_min <= env.oxygen <= opt_max:
                scores.append(100)
            elif env.oxygen < opt_min:
                scores.append(max(0, int((env.oxygen / opt_min) * 100)))
            else:
                scores.append(max(0, 100 - int((env.oxygen - opt_max) * 20)))

        # pH score
        if env.ph is not None:
            opt_min, opt_max = self.OPTIMAL_RANGES["ph"]
            if opt_min <= env.ph <= opt_max:
                scores.append(100)
            else:
                deviation = min(abs(env.ph - opt_min), abs(env.ph - opt_max))
                scores.append(max(0, 100 - int(deviation * 100)))

        # Salinity score
        if env.salinity is not None:
            opt_min, opt_max = self.OPTIMAL_RANGES["salinity"]
            if opt_min <= env.salinity <= opt_max:
                scores.append(100)
            else:
                deviation = min(abs(env.salinity - opt_min), abs(env.salinity - opt_max))
                scores.append(max(0, 100 - int(deviation * 10)))

        if scores:
            return int(sum(scores) / len(scores))
        return 70  # Default if no data

    def _calculate_thermal_stress_score(self, env: EnvironmentalData) -> int:
        """
        Calculate thermal stress score (0-100).

        Higher score = LESS stress (inverse scoring).
        Based on SST anomaly from baseline.
        """
        if env.sst_anomaly is None:
            return 70  # Default

        # Anomaly scoring: 0 anomaly = 100, |±2°C| = 0
        anomaly = abs(env.sst_anomaly)

        if anomaly <= 0.5:
            return 100
        elif anomaly <= 1.0:
            return 85
        elif anomaly <= 1.5:
            return 65
        elif anomaly <= 2.0:
            return 40
        else:
            return max(0, int(100 - anomaly * 40))

    def _calculate_productivity_score(
        self, env: EnvironmentalData, species: SpeciesData
    ) -> int:
        """
        Calculate primary productivity score (0-100).

        Based on:
        - Chlorophyll-a concentration
        - Observation density
        """
        scores = []

        # Chlorophyll score
        if env.chlorophyll is not None:
            opt_min, opt_max = self.OPTIMAL_RANGES["chlorophyll"]
            if opt_min <= env.chlorophyll <= opt_max:
                scores.append(100)
            elif env.chlorophyll < opt_min:
                # Too low - oligotrophic
                scores.append(max(40, int((env.chlorophyll / opt_min) * 100)))
            else:
                # Too high - possible eutrophication
                excess = env.chlorophyll - opt_max
                scores.append(max(30, 100 - int(excess * 10)))

        # Observation density as proxy for ecosystem activity
        if species.total_observations > 0:
            # Normalize to 0-100 based on typical ranges
            obs_score = min(100, int(species.total_observations / 50))
            scores.append(obs_score)

        if scores:
            return int(sum(scores) / len(scores))
        return 70  # Default

    def _calculate_confidence(
        self, env: EnvironmentalData, species: SpeciesData
    ) -> str:
        """
        Determine confidence level based on data availability.

        Returns: "high", "medium", or "low"
        """
        data_points = 0
        total_points = 6

        if env.sst is not None:
            data_points += 1
        if env.chlorophyll is not None:
            data_points += 1
        if env.oxygen is not None:
            data_points += 1
        if env.ph is not None:
            data_points += 1
        if species.total_species > 0:
            data_points += 1
        if species.total_observations > 0:
            data_points += 1

        ratio = data_points / total_points

        if ratio >= 0.8:
            return "high"
        elif ratio >= 0.5:
            return "medium"
        else:
            return "low"


# Singleton instance
_calculator: HealthCalculator | None = None


def get_health_calculator() -> HealthCalculator:
    """Get or create health calculator instance."""
    global _calculator
    if _calculator is None:
        _calculator = HealthCalculator()
    return _calculator
