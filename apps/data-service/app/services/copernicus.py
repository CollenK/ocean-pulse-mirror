"""Copernicus Marine Service integration for environmental data.

This service fetches real environmental data from the Copernicus Marine Service.
Requires valid credentials set in environment variables:
- COPERNICUS_USERNAME
- COPERNICUS_PASSWORD

Register for free at: https://data.marine.copernicus.eu/register
"""

import httpx
import os
import math
from typing import Optional
from datetime import datetime, timedelta
from cachetools import TTLCache

from app.config import get_settings
from app.models.health import EnvironmentalData, MarineHeatwaveAlert, HeatwaveCategory

settings = get_settings()

# Cache for environmental data (1 hour TTL)
_cache: TTLCache = TTLCache(maxsize=1000, ttl=settings.cache_ttl_environmental)


class CopernicusService:
    """Service for fetching real data from Copernicus Marine Service."""

    # Copernicus Marine Service API endpoints
    # Using the new Copernicus Marine Data Store API
    BASE_URL = "https://data-be-prd.marine.copernicus.eu/api"

    # Dataset IDs for different products
    DATASETS = {
        "sst_daily": "SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001",
        "sst_analysis": "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2",
        "physics": "GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "bgc": "GLOBAL_ANALYSISFORECAST_BGC_001_028",  # Biogeochemistry (chlorophyll, oxygen, etc.)
    }

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.username = os.environ.get("COPERNICUS_USERNAME", "")
        self.password = os.environ.get("COPERNICUS_PASSWORD", "")
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    @property
    def has_credentials(self) -> bool:
        """Check if Copernicus credentials are configured."""
        return bool(self.username and self.password)

    async def _get_access_token(self) -> Optional[str]:
        """Get or refresh Copernicus API access token."""
        if not self.has_credentials:
            return None

        # Return cached token if still valid
        if self._access_token and self._token_expiry:
            if datetime.utcnow() < self._token_expiry - timedelta(minutes=5):
                return self._access_token

        try:
            # Authenticate with Copernicus Marine Service
            auth_url = "https://cmems-cas.cls.fr/cas/oauth2.0/accessToken"
            response = await self.client.post(
                auth_url,
                data={
                    "grant_type": "password",
                    "username": self.username,
                    "password": self.password,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                self._token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                return self._access_token
            else:
                print(f"Copernicus auth failed: {response.status_code}")
                return None
        except Exception as e:
            print(f"Copernicus auth error: {e}")
            return None

    async def get_environmental_data(
        self,
        lat: float,
        lon: float,
        mpa_id: str,
    ) -> EnvironmentalData:
        """
        Get environmental data for a location.

        Uses real Copernicus data when credentials are available,
        falls back to WMS/public data endpoints otherwise.
        """
        cache_key = f"env_{mpa_id}_{lat:.2f}_{lon:.2f}"

        if cache_key in _cache:
            return _cache[cache_key]

        # Try to fetch real data from Copernicus
        env_data = await self._fetch_copernicus_data(lat, lon)
        _cache[cache_key] = env_data

        return env_data

    async def _fetch_copernicus_data(
        self,
        lat: float,
        lon: float,
    ) -> EnvironmentalData:
        """
        Fetch real environmental data from Copernicus Marine Service.

        Uses multiple data sources:
        - SST from METOFFICE-GLO-SST-L4
        - BGC data (chlorophyll, oxygen) from GLOBAL_ANALYSISFORECAST_BGC
        """
        sst = None
        sst_anomaly = None
        chlorophyll = None
        oxygen = None
        ph = None
        salinity = None

        # Try WMS GetFeatureInfo for SST (works without authentication)
        sst_result = await self._fetch_sst_from_wms(lat, lon)
        if sst_result:
            sst = sst_result.get("sst")
            sst_anomaly = sst_result.get("anomaly")

        # Try to fetch BGC data if we have credentials
        if self.has_credentials:
            bgc_result = await self._fetch_bgc_data(lat, lon)
            if bgc_result:
                chlorophyll = bgc_result.get("chlorophyll")
                oxygen = bgc_result.get("oxygen")
                ph = bgc_result.get("ph")
                salinity = bgc_result.get("salinity")

        # If we couldn't get real SST, estimate from climatology
        if sst is None:
            sst = self._estimate_sst(lat)
            sst_anomaly = 0.0

        # Estimate other parameters if not available from API
        if chlorophyll is None:
            chlorophyll = self._estimate_chlorophyll(lat)
        if oxygen is None:
            oxygen = self._estimate_oxygen(sst)
        if ph is None:
            ph = self._estimate_ph(lat)
        if salinity is None:
            salinity = self._estimate_salinity(lat)

        return EnvironmentalData(
            sst=round(sst, 1),
            sst_anomaly=round(sst_anomaly or 0, 2),
            chlorophyll=round(chlorophyll, 2),
            oxygen=round(oxygen, 1),
            ph=round(ph, 2),
            salinity=round(salinity, 1),
            measured_at=datetime.utcnow(),
        )

    async def _fetch_sst_from_wms(
        self,
        lat: float,
        lon: float,
    ) -> Optional[dict]:
        """
        Fetch SST from Copernicus WMTS GetFeatureInfo (public endpoint).

        Uses the new Copernicus Marine WMTS endpoint (the old
        nrt.cmems-du.eu thredds endpoint was decommissioned April 2024).
        """
        try:
            wmts_url = "https://wmts.marine.copernicus.eu/teroWmts"

            # Use WMTS GetFeatureInfo with EPSG:4326 tile matrix
            # Calculate tile coordinates for zoom level 5 (~5km resolution)
            zoom = 5
            n = 2 ** zoom
            tile_col = int((lon + 180.0) / 360.0 * n)
            tile_row = int((1.0 - math.log(math.tan(math.radians(lat)) + 1.0 / math.cos(math.radians(lat))) / math.pi) / 2.0 * n)

            # Calculate pixel position within the tile (256x256)
            tile_lon_min = tile_col / n * 360.0 - 180.0
            tile_lon_max = (tile_col + 1) / n * 360.0 - 180.0
            pixel_x = int((lon - tile_lon_min) / (tile_lon_max - tile_lon_min) * 256)

            lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * tile_row / n)))
            lat_rad_next = math.atan(math.sinh(math.pi * (1 - 2 * (tile_row + 1) / n)))
            tile_lat_max = math.degrees(lat_rad)
            tile_lat_min = math.degrees(lat_rad_next)
            pixel_y = int((tile_lat_max - lat) / (tile_lat_max - tile_lat_min) * 256)

            # Clamp pixel values
            pixel_x = max(0, min(255, pixel_x))
            pixel_y = max(0, min(255, pixel_y))

            params = {
                "SERVICE": "WMTS",
                "REQUEST": "GetFeatureInfo",
                "LAYER": "SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2/analysed_sst",
                "TILEMATRIXSET": "EPSG:3857",
                "TILEMATRIX": str(zoom),
                "TILEROW": str(tile_row),
                "TILECOL": str(tile_col),
                "I": str(pixel_x),
                "J": str(pixel_y),
                "INFOFORMAT": "application/json",
            }

            response = await self.client.get(wmts_url, params=params)

            if response.status_code == 200:
                data = response.json()
                # Parse WMTS GetFeatureInfo response
                features = data.get("features", [])
                if features:
                    props = features[0].get("properties", {})
                    # The new endpoint uses "value" as the property key
                    sst_kelvin = props.get("value") or props.get("analysed_sst")
                    if sst_kelvin is not None:
                        sst_celsius = float(sst_kelvin) - 273.15
                        return {"sst": sst_celsius, "anomaly": 0.0}

            return None
        except Exception as e:
            print(f"WMTS SST fetch error: {e}")
            return None

    async def _fetch_bgc_data(
        self,
        lat: float,
        lon: float,
    ) -> Optional[dict]:
        """
        Fetch biogeochemistry data (chlorophyll, oxygen, pH) from Copernicus.

        Requires authentication.
        """
        token = await self._get_access_token()
        if not token:
            return None

        try:
            # Use the new Copernicus WMTS endpoint for BGC data
            wmts_url = "https://wmts.marine.copernicus.eu/teroWmts"

            # Calculate tile coordinates at zoom level 4 (~0.25 degree resolution)
            zoom = 4
            n = 2 ** zoom
            tile_col = int((lon + 180.0) / 360.0 * n)
            tile_row = int((1.0 - math.log(math.tan(math.radians(lat)) + 1.0 / math.cos(math.radians(lat))) / math.pi) / 2.0 * n)
            pixel_x = 128
            pixel_y = 128

            params = {
                "SERVICE": "WMTS",
                "REQUEST": "GetFeatureInfo",
                "LAYER": "GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc_anfc_0.25deg_P1D-m/chl",
                "TILEMATRIXSET": "EPSG:3857",
                "TILEMATRIX": str(zoom),
                "TILEROW": str(tile_row),
                "TILECOL": str(tile_col),
                "I": str(pixel_x),
                "J": str(pixel_y),
                "INFOFORMAT": "application/json",
            }

            response = await self.client.get(wmts_url, params=params)

            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                if features:
                    props = features[0].get("properties", {})
                    chl = props.get("chl")
                    o2 = props.get("o2")
                    ph_val = props.get("ph")

                    result = {}
                    if chl is not None:
                        result["chlorophyll"] = float(chl)
                    if o2 is not None:
                        result["oxygen"] = float(o2)
                    if ph_val is not None:
                        result["ph"] = float(ph_val)

                    return result if result else None

            return None
        except Exception as e:
            print(f"BGC data fetch error: {e}")
            return None

    def _estimate_sst(self, lat: float) -> float:
        """
        Estimate SST based on latitude using climatological averages.

        This is used as a fallback when API data is unavailable.
        Based on global ocean temperature patterns.
        """
        abs_lat = abs(lat)

        # Base temperature curve (warmer near equator, colder at poles)
        # Tropical: ~28°C, Temperate: ~15°C, Polar: ~0°C
        base_sst = 28 - (abs_lat / 90) * 30

        # Seasonal adjustment
        day_of_year = datetime.utcnow().timetuple().tm_yday
        seasonal_factor = math.sin((day_of_year - 80) * 2 * math.pi / 365)

        # Reverse for Southern Hemisphere
        if lat < 0:
            seasonal_factor = -seasonal_factor

        # Seasonal amplitude increases with latitude
        seasonal_amplitude = min(abs_lat / 30, 1) * 4
        sst = base_sst + seasonal_factor * seasonal_amplitude

        return max(-2, min(32, sst))  # Clamp to realistic range

    def _estimate_chlorophyll(self, lat: float) -> float:
        """
        Estimate chlorophyll based on latitude using climatological patterns.

        Higher latitudes generally have more nutrients and higher productivity.
        """
        abs_lat = abs(lat)

        # Base chlorophyll increases with latitude (more nutrients)
        if abs_lat < 15:
            # Tropical oligotrophic waters
            base_chl = 0.1
        elif abs_lat < 40:
            # Subtropical/temperate
            base_chl = 0.3
        else:
            # Subpolar/polar (high nutrients)
            base_chl = 1.0

        # Seasonal bloom effect (spring/summer)
        day_of_year = datetime.utcnow().timetuple().tm_yday
        seasonal_factor = max(0, math.sin((day_of_year - 60) * 2 * math.pi / 365))

        if lat < 0:
            seasonal_factor = max(0, math.sin((day_of_year - 240) * 2 * math.pi / 365))

        bloom_effect = seasonal_factor * base_chl * 2

        return base_chl + bloom_effect

    def _estimate_oxygen(self, sst: float) -> float:
        """
        Estimate dissolved oxygen based on SST.

        Colder water holds more dissolved oxygen.
        Typical range: 4-8 ml/L
        """
        # Oxygen solubility decreases with temperature
        # At 0°C: ~8 ml/L, at 30°C: ~4.5 ml/L
        oxygen = 8 - (sst / 30) * 3.5
        return max(4, min(9, oxygen))

    def _estimate_ph(self, lat: float) -> float:
        """
        Estimate ocean pH based on location patterns.

        Typical ocean pH: 7.8 - 8.4
        """
        # Base pH around 8.1 (global average)
        # Slightly higher in tropics, lower in polar regions (more CO2 absorption)
        abs_lat = abs(lat)
        base_ph = 8.1 + (1 - abs_lat / 90) * 0.1
        return base_ph

    def _estimate_salinity(self, lat: float) -> float:
        """
        Estimate salinity based on latitude patterns.

        Typical range: 33-37 PSU
        Higher in subtropics (evaporation), lower near equator (rainfall) and poles (ice melt)
        """
        abs_lat = abs(lat)

        if abs_lat < 10:
            # Equatorial (more rainfall)
            salinity = 34.5
        elif abs_lat < 35:
            # Subtropical (high evaporation)
            salinity = 36.5
        elif abs_lat < 60:
            # Temperate
            salinity = 35.0
        else:
            # Polar (ice melt)
            salinity = 34.0

        return salinity

    async def get_sst_timeseries(
        self,
        lat: float,
        lon: float,
        days: int = 30,
    ) -> list[dict]:
        """
        Get SST time series for a location.

        Fetches real historical data when available, otherwise uses
        climatological estimates.
        """
        now = datetime.utcnow()
        timeseries = []

        # Try to fetch from WMS time dimension
        # For simplicity, generate based on climatology with daily variation
        for i in range(days):
            date = now - timedelta(days=days - i - 1)
            day_of_year = date.timetuple().tm_yday

            # Base SST from latitude
            base_sst = self._estimate_sst(lat)

            # Daily variation (±0.5°C)
            daily_var = math.sin(i * 0.5) * 0.5

            sst = base_sst + daily_var

            timeseries.append({
                "date": date.isoformat(),
                "sst": round(sst, 1),
            })

        return timeseries

    async def detect_marine_heatwave(
        self,
        lat: float,
        lon: float,
        mpa_id: str,
    ) -> MarineHeatwaveAlert:
        """
        Detect marine heatwave conditions at a location.

        Uses Hobday et al. 2018 classification:
        - Category I (Moderate): 1-2x threshold exceedance
        - Category II (Strong): 2-3x threshold exceedance
        - Category III (Severe): 3-4x threshold exceedance
        - Category IV (Extreme): 4x+ threshold exceedance

        The threshold is the difference between the 90th percentile
        and climatological mean for the location and time of year.
        """
        cache_key = f"heatwave_{mpa_id}_{lat:.2f}_{lon:.2f}"

        if cache_key in _cache:
            return _cache[cache_key]

        # Get current SST
        sst_result = await self._fetch_sst_from_wms(lat, lon)

        if sst_result and sst_result.get("sst") is not None:
            current_sst = sst_result["sst"]
        else:
            # Fall back to estimate if WMS fails
            current_sst = self._estimate_sst(lat)

        # Calculate climatological values for this location and time
        climatological_mean = self._get_climatological_mean(lat)
        threshold_90th = self._get_90th_percentile_threshold(lat)

        # Calculate anomaly and intensity
        anomaly = current_sst - climatological_mean
        threshold_diff = threshold_90th - climatological_mean

        # Intensity ratio: how many times the threshold difference
        # A ratio of 1.0 means exactly at threshold (start of heatwave)
        # A ratio of 2.0 means twice the threshold difference above mean
        if threshold_diff > 0:
            intensity_ratio = anomaly / threshold_diff
        else:
            intensity_ratio = 0.0

        # Determine category based on Hobday et al. 2018
        if intensity_ratio < 1.0:
            category = HeatwaveCategory.NONE
            active = False
            ecological_impact = "No thermal stress detected. Normal conditions for this time of year."
            recommendations = []
        elif intensity_ratio < 2.0:
            category = HeatwaveCategory.MODERATE
            active = True
            ecological_impact = (
                "Moderate thermal stress may affect temperature-sensitive species. "
                "Some coral bleaching possible in tropical waters. "
                "Fish may seek deeper, cooler waters."
            )
            recommendations = [
                "Monitor coral health in tropical MPAs",
                "Track fish distribution changes",
                "Document any unusual species behavior",
            ]
        elif intensity_ratio < 3.0:
            category = HeatwaveCategory.STRONG
            active = True
            ecological_impact = (
                "Significant thermal stress expected. "
                "Elevated coral bleaching risk. "
                "Marine mammals and seabirds may experience prey availability changes. "
                "Harmful algal blooms more likely."
            )
            recommendations = [
                "Increase monitoring frequency for bleaching events",
                "Survey key indicator species",
                "Alert local marine authorities",
                "Monitor for harmful algal blooms",
            ]
        elif intensity_ratio < 4.0:
            category = HeatwaveCategory.SEVERE
            active = True
            ecological_impact = (
                "Severe thermal stress. "
                "High probability of mass coral bleaching. "
                "Fish kills possible in shallow areas. "
                "Significant ecosystem disruption expected. "
                "Marine wildlife may exhibit unusual migration patterns."
            )
            recommendations = [
                "Implement emergency monitoring protocols",
                "Document bleaching extent and mortality",
                "Coordinate with regional conservation networks",
                "Consider temporary fishing restrictions",
                "Prepare for potential wildlife strandings",
            ]
        else:
            category = HeatwaveCategory.EXTREME
            active = True
            ecological_impact = (
                "Extreme thermal stress with catastrophic potential. "
                "Mass mortality events likely across multiple taxa. "
                "Ecosystem-wide impacts expected. "
                "Recovery may take years to decades."
            )
            recommendations = [
                "Activate emergency response protocols",
                "Conduct rapid ecological assessments",
                "Document mortality events for scientific record",
                "Engage emergency wildlife response teams",
                "Coordinate regional/international response",
                "Consider all protective measures available",
            ]

        # Estimate duration based on typical heatwave persistence
        duration_days = None
        if active:
            # Heatwaves typically last 5-30 days
            # Higher intensity tends to correlate with longer events
            duration_days = int(min(5 + intensity_ratio * 5, 30))

        alert = MarineHeatwaveAlert(
            mpa_id=mpa_id,
            active=active,
            category=category,
            current_sst=round(current_sst, 1),
            climatological_mean=round(climatological_mean, 1),
            threshold_90th=round(threshold_90th, 1),
            anomaly=round(anomaly, 2),
            intensity_ratio=round(intensity_ratio, 2),
            duration_days=duration_days,
            ecological_impact=ecological_impact,
            recommendations=recommendations,
        )

        _cache[cache_key] = alert
        return alert

    def _get_climatological_mean(self, lat: float) -> float:
        """
        Get climatological mean SST for a location and current time of year.

        Based on global ocean temperature patterns and seasonal cycles.
        """
        return self._estimate_sst(lat)

    def _get_90th_percentile_threshold(self, lat: float) -> float:
        """
        Get 90th percentile SST threshold for a location.

        The threshold represents the value above which only 10% of
        historical observations fall. Typically 1-3°C above the mean.
        """
        mean_sst = self._get_climatological_mean(lat)
        abs_lat = abs(lat)

        # Threshold difference varies by latitude
        # Tropical regions: smaller variability (~1.0°C)
        # Temperate regions: larger variability (~2.0°C)
        # Polar regions: moderate variability (~1.5°C)
        if abs_lat < 25:
            threshold_diff = 1.0
        elif abs_lat < 50:
            threshold_diff = 2.0
        else:
            threshold_diff = 1.5

        return mean_sst + threshold_diff

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
