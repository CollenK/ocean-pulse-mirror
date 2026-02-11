"""Data models for health scores and environmental data."""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class EnvironmentalData(BaseModel):
    """Environmental data from Copernicus."""

    sst: Optional[float] = Field(None, description="Sea Surface Temperature (°C)")
    sst_anomaly: Optional[float] = Field(None, description="SST anomaly from baseline")
    chlorophyll: Optional[float] = Field(None, description="Chlorophyll-a concentration (mg/m³)")
    oxygen: Optional[float] = Field(None, description="Dissolved oxygen (ml/l)")
    ph: Optional[float] = Field(None, description="pH level")
    salinity: Optional[float] = Field(None, description="Salinity (PSU)")
    measured_at: Optional[datetime] = None


class SpeciesData(BaseModel):
    """Species data from OBIS."""

    total_species: int = Field(0, description="Total unique species count")
    total_observations: int = Field(0, description="Total observation records")
    endemic_species: int = Field(0, description="Number of endemic species")
    threatened_species: int = Field(0, description="Number of threatened species")
    recent_observations: int = Field(0, description="Observations in last year")
    biodiversity_index: Optional[float] = Field(None, description="Shannon diversity index")


class HealthBreakdown(BaseModel):
    """Breakdown of health score components."""

    biodiversity: int = Field(..., ge=0, le=100, description="Biodiversity score")
    water_quality: int = Field(..., ge=0, le=100, description="Water quality score")
    thermal_stress: int = Field(..., ge=0, le=100, description="Thermal stress score (inverse)")
    productivity: int = Field(..., ge=0, le=100, description="Primary productivity score")


class HealthScore(BaseModel):
    """Complete health score response."""

    mpa_id: str
    mpa_name: str
    score: int = Field(..., ge=0, le=100, description="Overall health score")
    confidence: str = Field(..., description="Confidence level: high, medium, low")
    breakdown: HealthBreakdown
    environmental: EnvironmentalData
    species: SpeciesData
    data_sources: list[str] = Field(default_factory=list)
    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class MPALocation(BaseModel):
    """MPA location for data queries."""

    id: str
    name: str
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    bbox: Optional[tuple[float, float, float, float]] = Field(
        None, description="Bounding box: (min_lon, min_lat, max_lon, max_lat)"
    )


class HeatwaveCategory(str, Enum):
    """
    Marine heatwave categories based on Hobday et al. 2018.

    Categories are defined by how many times the SST exceeds the
    climatological threshold (90th percentile).
    """
    NONE = "none"
    MODERATE = "moderate"      # Category I: 1-2x threshold
    STRONG = "strong"          # Category II: 2-3x threshold
    SEVERE = "severe"          # Category III: 3-4x threshold
    EXTREME = "extreme"        # Category IV: 4x+ threshold


class MarineHeatwaveAlert(BaseModel):
    """Marine heatwave alert for an MPA."""

    mpa_id: str
    active: bool = Field(..., description="Whether a heatwave is currently active")
    category: HeatwaveCategory = Field(..., description="Heatwave intensity category")
    current_sst: Optional[float] = Field(None, description="Current SST in Celsius")
    climatological_mean: Optional[float] = Field(None, description="Expected SST for this time of year")
    threshold_90th: Optional[float] = Field(None, description="90th percentile threshold")
    anomaly: Optional[float] = Field(None, description="Degrees above climatological mean")
    intensity_ratio: Optional[float] = Field(None, description="Ratio of anomaly to threshold difference")
    duration_days: Optional[int] = Field(None, description="Estimated duration if active")
    ecological_impact: str = Field(..., description="Expected ecological impact description")
    recommendations: list[str] = Field(default_factory=list, description="Monitoring recommendations")
    detected_at: datetime = Field(default_factory=datetime.utcnow)
