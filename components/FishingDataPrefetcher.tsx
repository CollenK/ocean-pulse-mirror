'use client';

import { useEffect, useRef } from 'react';
import { useSavedMPAs } from '@/hooks/useSavedMPAs';
import { prefetchFishingDataForMPAs } from '@/hooks/useFishingData';
import type { Json } from '@/types/supabase';

// Helper to safely parse geometry from Supabase Json type
function parseGeometry(geometry: Json | null | undefined): { type: string; coordinates: unknown } | null {
  if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry)) {
    return null;
  }
  const geo = geometry as Record<string, unknown>;
  if (typeof geo.type === 'string' && geo.coordinates) {
    return { type: geo.type, coordinates: geo.coordinates };
  }
  return null;
}

/**
 * Background component that pre-fetches fishing data for saved MPAs.
 * This warms the cache so data loads instantly when visiting saved MPA pages.
 *
 * Renders nothing - it's purely for side effects.
 */
export function FishingDataPrefetcher() {
  const { savedMPAs, loading, isAuthenticated } = useSavedMPAs();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Only run if authenticated and we have saved MPAs
    if (!isAuthenticated || loading || savedMPAs.length === 0) {
      return;
    }

    // Only run once per session
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    // Filter to MPAs with geometry that we haven't prefetched yet
    const mpasToPreftch = savedMPAs
      .filter(saved => {
        const mpa = saved.mpa;
        if (!mpa) return false;
        if (prefetchedRef.current.has(mpa.id)) return false;
        // Need geometry
        return !!parseGeometry(mpa.geometry);
      })
      .map(saved => {
        const mpa = saved.mpa!;
        prefetchedRef.current.add(mpa.id);
        return {
          id: mpa.id,
          geometry: parseGeometry(mpa.geometry),
          protectionLevel: mpa.protection_level || undefined,
          establishedYear: mpa.established_year || undefined,
        };
      });

    if (mpasToPreftch.length === 0) {
      return;
    }

    // Delay prefetch to not compete with initial page load
    const timeoutId = setTimeout(() => {
      console.log(`[FishingDataPrefetcher] Starting background prefetch for ${mpasToPreftch.length} saved MPAs`);
      prefetchFishingDataForMPAs(mpasToPreftch, { delayMs: 3000 })
        .then(() => {
          console.log('[FishingDataPrefetcher] Background prefetch complete');
        })
        .catch(err => {
          console.warn('[FishingDataPrefetcher] Background prefetch error:', err);
        });
    }, 5000); // Wait 5 seconds after mount before starting prefetch

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, loading, savedMPAs]);

  // This component renders nothing
  return null;
}
