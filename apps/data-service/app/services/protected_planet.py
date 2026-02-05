"""Protected Planet API service for fetching MPA polygon boundaries."""

import json
import logging
from typing import Optional

import httpx
from shapely import wkt
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.validation import make_valid
from shapely import get_parts

from app.config import get_settings

logger = logging.getLogger(__name__)

# Protected Planet API base URL
API_BASE_URL = "https://api.protectedplanet.net/v4"

# Maximum polygon size in KB before simplification
MAX_POLYGON_SIZE_KB = 50

# Simplification tolerance in degrees (~100m at equator)
SIMPLIFICATION_TOLERANCE = 0.001


class ProtectedPlanetService:
    """Service for interacting with Protected Planet API."""

    def __init__(self, api_token: str):
        self.api_token = api_token
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def fetch_protected_area(self, wdpa_id: str) -> Optional[dict]:
        """
        Fetch protected area data including geometry from Protected Planet API.

        Args:
            wdpa_id: WDPA ID (external_id in our mpas table)

        Returns:
            Protected area data dict or None if not found
        """
        url = f"{API_BASE_URL}/protected_areas/{wdpa_id}"
        params = {
            "token": self.api_token,
            "with_geometry": "true",
        }

        try:
            response = await self.client.get(url, params=params)

            if response.status_code == 404:
                logger.warning(f"Protected area {wdpa_id} not found in Protected Planet")
                return None

            if response.status_code == 401:
                logger.error("Invalid Protected Planet API token")
                raise ValueError("Invalid Protected Planet API token")

            response.raise_for_status()
            data = response.json()

            return data.get("protected_area")

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching protected area {wdpa_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching protected area {wdpa_id}: {e}")
            return None

    def extract_geometry(self, protected_area: dict) -> Optional[dict]:
        """
        Extract GeoJSON geometry from protected area response.

        Args:
            protected_area: Protected area data from API

        Returns:
            GeoJSON geometry dict or None if not available
        """
        if not protected_area:
            return None

        geojson = protected_area.get("geojson")
        if not geojson:
            return None

        # The geojson field contains the geometry
        geometry = geojson.get("geometry")
        if not geometry:
            return None

        return geometry

    def _extract_polygons(self, geom) -> Optional[Polygon | MultiPolygon]:
        """Extract polygon parts from a geometry, handling GeometryCollections."""
        if geom.geom_type in ('Polygon', 'MultiPolygon'):
            return geom
        elif geom.geom_type == 'GeometryCollection':
            polygons = [g for g in get_parts(geom)
                       if g.geom_type in ('Polygon', 'MultiPolygon')]
            if not polygons:
                return None
            elif len(polygons) == 1:
                return polygons[0]
            else:
                all_polys = []
                for p in polygons:
                    if p.geom_type == 'Polygon':
                        all_polys.append(p)
                    else:
                        all_polys.extend(get_parts(p))
                return MultiPolygon(all_polys) if all_polys else None
        return None

    def simplify_geometry(self, geometry: dict) -> dict:
        """
        Simplify complex geometries to reduce storage size.

        Uses Shapely to simplify polygons while preserving topology.

        Args:
            geometry: GeoJSON geometry dict

        Returns:
            Simplified GeoJSON geometry dict
        """
        # Check if simplification is needed
        geom_str = json.dumps(geometry)
        size_kb = len(geom_str.encode("utf-8")) / 1024

        if size_kb <= MAX_POLYGON_SIZE_KB:
            return geometry

        logger.info(f"Simplifying geometry ({size_kb:.1f}KB > {MAX_POLYGON_SIZE_KB}KB)")

        try:
            # Convert to Shapely geometry
            geom = shape(geometry)

            # Make valid if necessary
            if not geom.is_valid:
                geom = make_valid(geom)
                # make_valid can return GeometryCollection - extract polygons
                geom = self._extract_polygons(geom)
                if geom is None:
                    logger.warning("No polygon parts after make_valid")
                    return geometry

            # Simplify with topology preservation
            simplified = geom.simplify(SIMPLIFICATION_TOLERANCE, preserve_topology=True)

            # Convert back to GeoJSON
            simplified_geojson = mapping(simplified)

            new_size_kb = len(json.dumps(simplified_geojson).encode("utf-8")) / 1024
            logger.info(f"Simplified geometry: {size_kb:.1f}KB -> {new_size_kb:.1f}KB")

            return simplified_geojson

        except Exception as e:
            logger.error(f"Error simplifying geometry: {e}")
            return geometry

    def geometry_to_wkt(self, geometry: dict) -> Optional[str]:
        """
        Convert GeoJSON geometry to WKT format for PostGIS.

        Args:
            geometry: GeoJSON geometry dict

        Returns:
            WKT string or None if conversion fails
        """
        try:
            geom = shape(geometry)

            # Make valid if necessary
            if not geom.is_valid:
                geom = make_valid(geom)
                # make_valid can return GeometryCollection - extract polygons
                geom = self._extract_polygons(geom)
                if geom is None:
                    logger.warning("No polygon parts found in geometry")
                    return None

            return geom.wkt

        except Exception as e:
            logger.error(f"Error converting geometry to WKT: {e}")
            return None

    async def fetch_mpa_polygon(self, wdpa_id: str) -> Optional[str]:
        """
        Fetch MPA polygon and return as WKT for PostGIS storage.

        This is the main entry point for fetching polygon data.

        Args:
            wdpa_id: WDPA ID (external_id in our mpas table)

        Returns:
            WKT geometry string or None if not available
        """
        # Fetch protected area data
        protected_area = await self.fetch_protected_area(wdpa_id)
        if not protected_area:
            return None

        # Extract geometry
        geometry = self.extract_geometry(protected_area)
        if not geometry:
            logger.warning(f"No geometry available for protected area {wdpa_id}")
            return None

        # Simplify if needed
        geometry = self.simplify_geometry(geometry)

        # Convert to WKT
        wkt_str = self.geometry_to_wkt(geometry)

        return wkt_str

    async def fetch_mpa_geojson(self, wdpa_id: str) -> Optional[dict]:
        """
        Fetch MPA polygon and return as GeoJSON geometry.

        Useful for direct frontend use without PostGIS.

        Args:
            wdpa_id: WDPA ID (external_id in our mpas table)

        Returns:
            GeoJSON geometry dict or None if not available
        """
        # Fetch protected area data
        protected_area = await self.fetch_protected_area(wdpa_id)
        if not protected_area:
            return None

        # Extract geometry
        geometry = self.extract_geometry(protected_area)
        if not geometry:
            return None

        # Simplify if needed
        geometry = self.simplify_geometry(geometry)

        return geometry


# Singleton instance
_service: Optional[ProtectedPlanetService] = None


def get_protected_planet_service() -> ProtectedPlanetService:
    """Get or create Protected Planet service instance."""
    global _service
    if _service is None:
        settings = get_settings()
        if not settings.protected_planet_api_token:
            raise ValueError("PROTECTED_PLANET_API_TOKEN not configured")
        _service = ProtectedPlanetService(settings.protected_planet_api_token)
    return _service
