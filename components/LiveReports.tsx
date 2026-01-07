'use client';

import { useObservations } from '@/hooks/useObservations';
import { ObservationCard } from './ObservationCard';
import { Button, Icon } from '@/components/ui';
import Link from 'next/link';

interface LiveReportsProps {
  mpaId: string;
  maxHeight?: number;
}

export function LiveReports({ mpaId, maxHeight = 500 }: LiveReportsProps) {
  const { observations, loading, totalCount } = useObservations(mpaId);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                <div className="h-6 bg-gray-200 animate-pulse rounded w-24" />
                <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scrollable reports list */}
      {observations.length > 0 ? (
        <div
          className="overflow-y-auto space-y-6 pr-2 -mr-2"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {observations.map((observation) => (
            <ObservationCard
              key={observation.id}
              observation={observation}
              onViewDetails={() => {
                console.log('View observation:', observation.id);
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="camera" className="text-blue-500 text-2xl" />
          </div>
          <p className="text-gray-900 font-medium mb-2">No reports yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Be the first to share an observation for this MPA
          </p>
        </div>
      )}

      {/* Submit Report Button */}
      <Link href={`/observe?mpa=${mpaId}`} className="block">
        <Button fullWidth size="lg" className="rounded-xl">
          <Icon name="camera" size="sm" />
          Submit Report
        </Button>
      </Link>
    </div>
  );
}
