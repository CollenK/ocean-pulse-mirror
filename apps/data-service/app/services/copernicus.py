"""Copernicus Marine Service integration for environmental data."""

import httpx
from typing import Optional
from datetime import datetime, timedelta
from cachetools import TTLCache

from app.config import get_settings
from app.models.health import EnvironmentalData

settings = get_settings()

# Cache for environmental data (1 hour TTL)
_cache: TTLCache = TTLCache(maxsize=1000, ttl=settings.cache_ttl_environmental)


class CopernicusService:
    """Service for fetching data from Copernicus Marine Service."""

    # CMEMS WMS/WCS endpoints for visualization and data
    BASE_URL = "https://nrt.cmems-du.eu/thredds"

    # Dataset IDs for different products
    DATASETS = {
        "sst": "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2",
        "chlorophyll": "dataset-oc-glo-bio-multi-l4-chl_4km_monthly-rep",
        "physics": "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m",
    }

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_environmental_data(
        self,
        lat: float,
        lon: float,
        mpa_id: str,
    ) -> EnvironmentalData:
        """
        Get environmental data for a location.

        For MVP, we use simulated data based on location and season.
        In production, this would query actual Copernicus APIs.
        """
        cache_key = f"env_{mpa_id}_{lat:.2f}_{lon:.2f}"

        if cache_key in _cache:
            return _cache[cache_key]

        # Generate realistic environmental data based on location
        env_data = await self._fetch_environmental_data(lat, lon)
        _cache[cache_key] = env_data

        return env_data

    async def _fetch_environmental_data(
        self,
        lat: float,
        lon: float,
    ) -> EnvironmentalData:
        """
        Fetch environmental data from Copernicus or generate realistic estimates.

        For the MVP, we generate location-based estimates since Copernicus
        requires authentication and complex data processing.
        """
        import math

        # Calculate base SST based on latitude (warmer near equator)
        # SST ranges roughly from -2°C (polar) to 30°C (tropical)
        abs_lat = abs(lat)
        base_sst = 30 - (abs_lat / 90) * 32

        # Seasonal adjustment (Northern hemisphere summer = warmer)
        day_of_year = datetime.utcnow().timetuple().tm_yday
        seasonal_factor = math.sin((day_of_year - 80) * 2 * math.pi / 365)
        if lat < 0:
            seasonal_factor = -seasonal_factor
        sst = base_sst + seasonal_factor * 3

        # SST anomaly (small random variation around 0)
        sst_anomaly = (hash(f"{lat}{lon}") % 200 - 100) / 100  # -1 to +1

        # Chlorophyll - higher in upwelling zones and coastal areas
        # Typical range: 0.01 - 10 mg/m³
        base_chl = 0.3
        if abs_lat > 40:  # Higher latitudes have more nutrients
            base_chl = 0.8
        chlorophyll = base_chl * (1 + (hash(f"chl{lat}{lon}") % 100) / 100)

        # Dissolved oxygen - higher in cold water
        # Typical range: 4-8 ml/l
        oxygen = 8 - (sst / 30) * 3 + (hash(f"o2{lat}{lon}") % 100) / 100

        # pH - typical ocean range 7.8-8.4
        ph = 8.1 + (hash(f"ph{lat}{lon}") % 40 - 20) / 100

        # Salinity - typical range 33-37 PSU
        salinity = 35 + (hash(f"sal{lat}{lon}") % 200 - 100) / 100

        return EnvironmentalData(
            sst=round(sst, 1),
            sst_anomaly=round(sst_anomaly, 2),
            chlorophyll=round(chlorophyll, 2),
            oxygen=round(oxygen, 1),
            ph=round(ph, 2),
            salinity=round(salinity, 1),
            measured_at=datetime.utcnow(),
        )

    async def get_sst_timeseries(
        self,
        lat: float,
        lon: float,
        days: int = 30,
    ) -> list[dict]:
        """Get SST time series for a location."""
        # Generate simulated time series
        import math

        base_sst = 30 - (abs(lat) / 90) * 32
        now = datetime.utcnow()

        timeseries = []
        for i in range(days):
            date = now - timedelta(days=days - i - 1)
            day_of_year = date.timetuple().tm_yday
            seasonal = math.sin((day_of_year - 80) * 2 * math.pi / 365)
            if lat < 0:
                seasonal = -seasonal
            daily_var = (hash(f"{lat}{lon}{i}") % 100 - 50) / 100
            sst = base_sst + seasonal * 3 + daily_var

            timeseries.append({
                "date": date.isoformat(),
                "sst": round(sst, 1),
            })

        return timeseries

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


# Singleton instance
_service: Optional[CopernicusService] = None


def get_copernicus_service() -> CopernicusService:
    """Get or create Copernicus service instance."""
    global _service
    if _service is None:
        _service = CopernicusService()
    return _service
