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
 * Check if device supports touch (mobile/tablet detection)
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
