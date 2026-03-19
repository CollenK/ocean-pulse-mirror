'use client';

import { CollapsibleCard, Badge, Button, Icon } from '@/components/ui';
import { BeachConditionsCard, WhatsAroundToday } from '@/components/CoastalConditions';
import type { CoastalConditions } from '@/types/coastal-conditions';
import type { ObservationWithProfile } from '@/lib/observations-service';

interface MPACoastalSectionProps {
  coastalConditions: CoastalConditions | null;
  coastalLoading: boolean;
  coastalError: string | null;
  coastalStale: boolean;
  refetchCoastal: () => void;
  mpaObservations: ObservationWithProfile[];
}

export function MPACoastalSection({ coastalConditions, coastalLoading, coastalError, coastalStale, refetchCoastal, mpaObservations }: MPACoastalSectionProps) {
  return (
    <CollapsibleCard
      title="Beach & Coastal Conditions" icon="sun" iconColor="text-amber-500" defaultOpen={true}
      badge={coastalConditions && (
        <Badge variant={coastalConditions.swimSafety === 'safe' ? 'healthy' : coastalConditions.swimSafety === 'caution' ? 'warning' : 'danger'} size="sm">
          {coastalConditions.weatherDescription}
        </Badge>
      )}
      className="mb-4"
    >
      {coastalLoading && !coastalConditions ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-amber-500 mb-4" />
          <p className="text-balean-gray-500">Loading beach conditions...</p>
        </div>
      ) : coastalConditions ? (
        <div className="space-y-6">
          <BeachConditionsCard conditions={coastalConditions} isStale={coastalStale} onRefresh={refetchCoastal} />
          <WhatsAroundToday observations={mpaObservations} />
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="sun" className="text-balean-gray-300 text-3xl" />
          </div>
          <p className="text-balean-gray-500 mb-2 font-medium">Conditions unavailable</p>
          <p className="text-sm text-balean-gray-400 mb-4">{coastalError || 'Weather data could not be loaded for this location'}</p>
          <Button variant="secondary" onClick={refetchCoastal}><Icon name="refresh" size="sm" />Try Again</Button>
        </div>
      )}
    </CollapsibleCard>
  );
}
