'use client';

import Link from 'next/link';
import { CollapsibleCard, Badge, Button, Icon } from '@/components/ui';
import { SpeciesCard } from '@/components/SpeciesCard';
import type { IndicatorSpecies } from '@/types/indicator-species';
import { CATEGORY_INFO } from '@/types/indicator-species';

interface MPAIndicatorSpeciesSectionProps {
  speciesLoading: boolean;
  indicatorSpecies: IndicatorSpecies[];
  showAllSpecies: boolean;
  onToggleShowAll: () => void;
}

export function MPAIndicatorSpeciesSection({ speciesLoading, indicatorSpecies, showAllSpecies, onToggleShowAll }: MPAIndicatorSpeciesSectionProps) {
  return (
    <CollapsibleCard
      title="Indicator Species" icon="leaf" iconColor="text-healthy" defaultOpen={false}
      badge={indicatorSpecies.length > 0 && <Badge variant="healthy" size="sm">{indicatorSpecies.length} species</Badge>}
      className="mb-4"
    >
      {speciesLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-healthy mb-4" />
          <p className="text-balean-gray-500">Loading indicator species...</p>
        </div>
      ) : indicatorSpecies.length > 0 ? (
        <>
          <p className="text-balean-gray-500 mb-4">These species serve as key markers for assessing ecosystem health.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(
              indicatorSpecies.reduce((acc, sp) => { acc[sp.category] = (acc[sp.category] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([category, count]) => {
              const info = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
              return <Badge key={category} variant="info" size="sm" className="px-2 py-1">{info.name}: {count}</Badge>;
            })}
          </div>
          <div className="space-y-2 mb-4">
            {indicatorSpecies.slice(0, showAllSpecies ? indicatorSpecies.length : 5).map((sp) => (
              <Link key={sp.id} href={`/ocean-pulse-app/indicator-species/${sp.id}`} className="block">
                <SpeciesCard species={sp} compact />
              </Link>
            ))}
          </div>
          {indicatorSpecies.length > 5 && (
            <Button fullWidth variant="secondary" onClick={onToggleShowAll}>
              <Icon name={showAllSpecies ? 'angle-up' : 'angle-down'} size="sm" />
              {showAllSpecies ? 'Show Less' : `View All ${indicatorSpecies.length} Species`}
            </Button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="leaf" className="text-balean-gray-300 text-3xl" />
          </div>
          <p className="text-balean-gray-500 mb-2 font-medium">No indicator species identified</p>
          <p className="text-sm text-balean-gray-400 mb-4">No indicator species match this MPA&apos;s ecosystem type</p>
          <Link href="/ocean-pulse-app/indicator-species">
            <Button variant="secondary"><Icon name="leaf" size="sm" />Browse Indicator Species</Button>
          </Link>
        </div>
      )}
    </CollapsibleCard>
  );
}
