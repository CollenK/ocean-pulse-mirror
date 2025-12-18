import { MPA } from '@/types';
import { sampleMPAs } from './mpa-data';

/**
 * MPA Service
 * Handles fetching, caching, and managing MPA data
 */

/**
 * Fetch all MPAs
 * In production, this would fetch from an API or database
 */
export async function fetchAllMPAs(): Promise<MPA[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return sampleMPAs;
}

/**
 * Fetch a single MPA by ID
 */
export async function fetchMPAById(id: string): Promise<MPA | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return sampleMPAs.find((mpa) => mpa.id === id) || null;
}

/**
 * Find nearest MPAs to a given location
 * @param lat Latitude
 * @param lng Longitude
 * @param limit Maximum number of results
 */
export async function findNearestMPAs(
  lat: number,
  lng: number,
  limit: number = 5
): Promise<(MPA & { distance: number })[]> {
  const mpas = await fetchAllMPAs();

  // Calculate distance for each MPA
  const mpasWithDistance = mpas.map((mpa) => ({
    ...mpa,
    distance: calculateDistance(lat, lng, mpa.center[0], mpa.center[1]),
  }));

  // Sort by distance and return top N
  return mpasWithDistance.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate health score based on species diversity and other factors
 * This is a simplified algorithm
 */
export function calculateHealthScore(mpa: MPA): number {
  // In a real app, this would use more sophisticated metrics
  // For now, we're using the pre-calculated scores from our data
  return mpa.healthScore;
}

/**
 * Get health category based on score
 */
export function getHealthCategory(
  score: number
): 'healthy' | 'moderate' | 'at-risk' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'moderate';
  return 'at-risk';
}

/**
 * Format area for display
 */
export function formatArea(areaKm2: number): string {
  if (areaKm2 >= 1000000) {
    return `${(areaKm2 / 1000000).toFixed(1)}M km²`;
  } else if (areaKm2 >= 1000) {
    return `${(areaKm2 / 1000).toFixed(1)}K km²`;
  }
  return `${areaKm2.toFixed(0)} km²`;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm >= 1000) {
    return `${(distanceKm / 1000).toFixed(0)}K km`;
  } else if (distanceKm >= 10) {
    return `${distanceKm.toFixed(0)} km`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
