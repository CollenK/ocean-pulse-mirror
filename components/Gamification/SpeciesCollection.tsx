'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';
import type { SpeciesCollectionEntry } from '@/types/gamification';

interface SpeciesCollectionProps {
  collection: SpeciesCollectionEntry[];
}

export function SpeciesCollection({ collection }: SpeciesCollectionProps) {
  if (collection.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-cyan-50 mx-auto mb-3 flex items-center justify-center">
          <Icon name="fish" className="text-cyan-400 text-xl" />
        </div>
        <p className="text-sm text-balean-gray-500 mb-1">No species discovered yet</p>
        <p className="text-xs text-balean-gray-400">
          Start submitting observations with species names to build your life list
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {collection.slice(0, 10).map(entry => (
        <div
          key={entry.species_name}
          className="flex items-center justify-between p-3 rounded-lg bg-balean-gray-50 hover:bg-balean-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-cyan-50 flex-shrink-0 flex items-center justify-center">
              <Icon name="fish" size="sm" className="text-cyan-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-balean-navy truncate">
                {entry.species_name}
              </p>
              <p className="text-xs text-balean-gray-400">
                {entry.observation_count} sighting{entry.observation_count !== 1 ? 's' : ''}
                {entry.mpa_name ? ` near ${entry.mpa_name}` : ''}
              </p>
            </div>
          </div>
          <span className="text-xs text-balean-gray-400 flex-shrink-0 ml-2">
            {new Date(entry.first_seen_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      ))}
      {collection.length > 10 && (
        <Link
          href="/ocean-pulse-app/observe"
          className="block text-center text-sm text-balean-cyan font-medium py-2"
        >
          View all {collection.length} species
        </Link>
      )}
    </div>
  );
}
