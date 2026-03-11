/**
 * Map utility functions for MapLibre GL integration
 * Handles coordinate conversion and styling helpers
 */

/**
 * Convert [lat, lng] (Leaflet/MPA format) to [lng, lat] (MapLibre/GeoJSON format)
 */
export function toMapLibreCoords(latLng: [number, number]): [number, number] {
  return [latLng[1], latLng[0]];
}

/**
 * Convert bounds array [[lat1, lng1], [lat2, lng2]] to GeoJSON polygon coordinates
 * Returns a closed ring in [lng, lat] order for MapLibre
 */
export function boundsToGeoJSON(bounds: number[][]): number[][] {
  if (!bounds || bounds.length !== 2) return [];

  const [[lat1, lng1], [lat2, lng2]] = bounds;

  // GeoJSON polygon: [lng, lat] order, closed ring (first point repeated at end)
  return [
    [lng1, lat1],
    [lng2, lat1],
    [lng2, lat2],
    [lng1, lat2],
    [lng1, lat1], // Close the ring
  ];
}

/**
 * Get marker/boundary color based on health score
 * Matches the existing color scheme from the app
 */
export function getHealthColor(score: number): string {
  if (score >= 80) return '#10B981'; // green (healthy)
  if (score >= 50) return '#F59E0B'; // yellow/amber (warning)
  return '#EF4444'; // red (critical)
}

/**
 * Check if a polygon ring crosses the anti-meridian by detecting
 * large longitude jumps (>180 degrees) between consecutive points.
 */
function ringCrossesAntimeridian(ring: number[][]): boolean {
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize a polygon ring that crosses the anti-meridian by shifting
 * negative longitudes to positive (adding 360) so the polygon renders
 * as a continuous shape on the map with renderWorldCopies enabled.
 */
function normalizeRing(ring: number[][]): number[][] {
  if (!ringCrossesAntimeridian(ring)) return ring;
  return ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat]);
}

/**
 * Normalize a GeoJSON geometry that may cross the anti-meridian.
 * Shifts coordinates so that polygons spanning the date line render correctly.
 */
export function normalizeAntimeridianGeometry<
  T extends { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] }
>(geom: T): T {
  if (geom.type === 'Polygon') {
    const coords = geom.coordinates as number[][][];
    const needsNormalization = coords.some(ringCrossesAntimeridian);
    if (!needsNormalization) return geom;
    return { ...geom, coordinates: coords.map(normalizeRing) };
  }
  if (geom.type === 'MultiPolygon') {
    const coords = geom.coordinates as number[][][][];
    const needsNormalization = coords.some(poly => poly.some(ringCrossesAntimeridian));
    if (!needsNormalization) return geom;
    return {
      ...geom,
      coordinates: coords.map(poly => poly.map(normalizeRing)),
    };
  }
  return geom;
}

/**
 * Check if device supports touch (mobile/tablet detection)
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
