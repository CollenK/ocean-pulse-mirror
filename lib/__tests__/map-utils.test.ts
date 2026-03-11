import { describe, it, expect } from 'vitest';
import {
  toMapLibreCoords,
  boundsToGeoJSON,
  getHealthColor,
  normalizeAntimeridianGeometry,
} from '@/components/Map/map-utils';

describe('toMapLibreCoords', () => {
  it('swaps lat/lng to lng/lat', () => {
    expect(toMapLibreCoords([51.5, -0.1])).toEqual([-0.1, 51.5]);
  });

  it('handles zero coordinates', () => {
    expect(toMapLibreCoords([0, 0])).toEqual([0, 0]);
  });

  it('handles negative coordinates', () => {
    expect(toMapLibreCoords([-33.9, 18.4])).toEqual([18.4, -33.9]);
  });
});

describe('boundsToGeoJSON', () => {
  it('converts bounds to closed GeoJSON ring', () => {
    const bounds = [[10, 20], [30, 40]];
    const result = boundsToGeoJSON(bounds);
    expect(result).toHaveLength(5);
    // First and last point should be the same (closed ring)
    expect(result[0]).toEqual(result[4]);
    // Check coordinate order is [lng, lat]
    expect(result[0]).toEqual([20, 10]);
  });

  it('returns empty array for empty bounds', () => {
    expect(boundsToGeoJSON([])).toEqual([]);
  });

  it('returns empty array for single-point bounds', () => {
    expect(boundsToGeoJSON([[1, 2]])).toEqual([]);
  });

  it('returns empty array for three-point bounds', () => {
    expect(boundsToGeoJSON([[1, 2], [3, 4], [5, 6]])).toEqual([]);
  });
});

describe('getHealthColor', () => {
  it('returns green for healthy scores (>= 80)', () => {
    expect(getHealthColor(80)).toBe('#10B981');
    expect(getHealthColor(100)).toBe('#10B981');
    expect(getHealthColor(95)).toBe('#10B981');
  });

  it('returns amber for warning scores (50-79)', () => {
    expect(getHealthColor(50)).toBe('#F59E0B');
    expect(getHealthColor(79)).toBe('#F59E0B');
    expect(getHealthColor(65)).toBe('#F59E0B');
  });

  it('returns red for critical scores (< 50)', () => {
    expect(getHealthColor(0)).toBe('#EF4444');
    expect(getHealthColor(49)).toBe('#EF4444');
    expect(getHealthColor(25)).toBe('#EF4444');
  });
});

describe('normalizeAntimeridianGeometry', () => {
  it('returns unchanged polygon that does not cross anti-meridian', () => {
    const geom = {
      type: 'Polygon' as const,
      coordinates: [[[10, 20], [30, 20], [30, 40], [10, 40], [10, 20]]],
    };
    const result = normalizeAntimeridianGeometry(geom);
    expect(result).toEqual(geom);
  });

  it('normalizes polygon crossing anti-meridian', () => {
    const geom = {
      type: 'Polygon' as const,
      coordinates: [[[170, -40], [-170, -40], [-170, -30], [170, -30], [170, -40]]],
    };
    const result = normalizeAntimeridianGeometry(geom);
    // Negative longitudes should be shifted to positive
    expect(result.coordinates[0][1][0]).toBe(190); // -170 + 360
    expect(result.coordinates[0][2][0]).toBe(190);
    // Positive longitudes should remain unchanged
    expect(result.coordinates[0][0][0]).toBe(170);
  });

  it('handles MultiPolygon that does not cross anti-meridian', () => {
    const geom = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[10, 20], [30, 20], [30, 40], [10, 40], [10, 20]]]],
    };
    const result = normalizeAntimeridianGeometry(geom);
    expect(result.type).toBe('MultiPolygon');
    expect(result).toEqual(geom);
  });

  it('normalizes MultiPolygon crossing anti-meridian', () => {
    const geom = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[170, -40], [-170, -40], [-170, -30], [170, -30], [170, -40]]]],
    };
    const result = normalizeAntimeridianGeometry(geom);
    expect(result.coordinates[0][0][1][0]).toBe(190);
  });

  it('preserves the type literal', () => {
    const geom = {
      type: 'Polygon' as const,
      coordinates: [[[10, 20], [30, 20], [30, 40], [10, 40], [10, 20]]],
    };
    const result = normalizeAntimeridianGeometry(geom);
    expect(result.type).toBe('Polygon');
  });
});
