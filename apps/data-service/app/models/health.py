"""Data models for health scores and environmental data."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


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
