'use client';

import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getUnsyncedObservations, markObservationSynced } from '@/lib/offline-storage';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { captureError } from '@/lib/error-reporting';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Syncs unsynced local observations to Supabase when online.
 * Runs on network reconnection and every 5 minutes while online.
 * Renders nothing - purely a side-effect component.
 */
export function OfflineSync() {
  const { isOnline } = useNetworkStatus();
  const syncingRef = useRef(false);

  useEffect(() => {
    async function syncObservations() {
      if (syncingRef.current || !isOnline || !isSupabaseConfigured()) return;
      syncingRef.current = true;

      try {
        const unsynced = await getUnsyncedObservations();
        if (unsynced.length === 0) return;

        const supabase = createClient();

        for (const obs of unsynced) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('observations') as any).insert({
              mpa_id: obs.mpaId,
              user_id: obs.userId || null,
              report_type: obs.reportType,
              species_name: obs.speciesName || null,
              species_type: null,
              quantity: obs.quantity || null,
              notes: obs.notes || null,
              latitude: obs.location?.lat,
              longitude: obs.location?.lng,
              location_accuracy_m: obs.location?.accuracy || null,
              location_manually_entered: obs.location?.manuallyEntered || false,
              photo_url: (obs.photo as string) || null,
              health_score_assessment: obs.healthScoreAssessment || null,
              is_draft: obs.isDraft || false,
              synced_at: new Date().toISOString(),
            });

            if (!error) {
              await markObservationSynced(obs.id);
            }
          } catch (err) {
            captureError(err, { context: 'offlineSync', observationId: String(obs.id) });
          }
        }
      } catch (err) {
        captureError(err, { context: 'offlineSync', action: 'getUnsynced' });
      } finally {
        syncingRef.current = false;
      }
    }

    // Sync immediately when coming online
    if (isOnline) {
      syncObservations();
    }

    // Periodic sync while online
    const interval = setInterval(() => {
      if (isOnline) syncObservations();
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [isOnline]);

  return null;
}
