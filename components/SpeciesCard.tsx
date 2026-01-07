/**
 * SpeciesCard Component
 * Display card for indicator species with conservation status and ecological info
 */

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Icon } from './ui';
import type { IndicatorSpecies } from '@/types/indicator-species';
import {
  CATEGORY_INFO,
  CONSERVATION_STATUS_INFO,
  ECOSYSTEM_INFO,
  SpeciesCategory,
} from '@/types/indicator-species';

interface SpeciesCardProps {
  species: IndicatorSpecies;
  showEcosystems?: boolean;
  showSignificance?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

// Map category to icon names
const CATEGORY_ICONS: Record<SpeciesCategory, string> = {
  [SpeciesCategory.APEX_PREDATOR]: 'shark',
  [SpeciesCategory.CORAL]: 'flower',
  [SpeciesCategory.FOUNDATION]: 'leaf',
  [SpeciesCategory.KEYSTONE]: 'star',
  [SpeciesCategory.SEABIRD]: 'bird',
  [SpeciesCategory.INVERTEBRATE]: 'bug',
};

// Sensitivity rating display
const SENSITIVITY_INFO = {
  low: { label: 'Low Sensitivity', color: '#10B981', icon: 'clock' },
  medium: { label: 'Medium Sensitivity', color: '#F59E0B', icon: 'clock' },
  high: { label: 'High Sensitivity', color: '#EF4444', icon: 'clock' },
};

export function SpeciesCard({
  species,
  showEcosystems = true,
  showSignificance = false,
  compact = false,
  onClick,
}: SpeciesCardProps) {
  const categoryInfo = CATEGORY_INFO[species.category];
  const statusInfo = CONSERVATION_STATUS_INFO[species.conservationStatus];
  const sensitivityInfo = SENSITIVITY_INFO[species.sensitivityRating];

  const CardWrapper = onClick ? motion.button : motion.div;

  if (compact) {
    return (
      <CardWrapper
        whileHover={{ scale: 1.01 }}
        whileTap={onClick ? { scale: 0.99 } : undefined}
        onClick={onClick}
        className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm ${
          onClick ? 'cursor-pointer hover:border-ocean-primary/30 w-full text-left' : ''
        }`}
      >
        {/* Category Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-ocean-primary/10"
        >
          <Icon
            name={CATEGORY_ICONS[species.category]}
            size="md"
            className="text-ocean-primary"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-ocean-deep truncate">
            {species.commonName}
          </h4>
          <p className="text-xs text-gray-500 italic truncate">
            {species.scientificName}
          </p>
        </div>

        {/* Status Badge */}
        <div
          className="px-2 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0"
          style={{ backgroundColor: statusInfo.color }}
        >
          {species.conservationStatus}
        </div>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-lg w-full text-left' : ''
      }`}
    >
      {/* Header with category color */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${categoryInfo.color}10` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: categoryInfo.color }}
          >
            <Icon
              name={CATEGORY_ICONS[species.category]}
              size="sm"
              className="text-white"
            />
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
          >
            {categoryInfo.name}
          </span>
        </div>

        {/* Conservation Status */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: statusInfo.color }}
          title={statusInfo.name}
        >
          {species.conservationStatus}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Names */}
        <h3 className="text-lg font-semibold text-ocean-deep mb-0.5">
          {species.commonName}
        </h3>
        <p className="text-sm text-gray-500 italic mb-3">
          {species.scientificName}
        </p>

        {/* Sensitivity Rating */}
        <div className="flex items-center gap-2 mb-3">
          <Icon
            name="gauge"
            size="sm"
            className="text-ocean-primary"
          />
          <span className="text-xs text-gray-600">
            {sensitivityInfo.label}
          </span>
        </div>

        {/* Ecosystems */}
        {showEcosystems && species.ecosystems.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
              Ecosystems
            </p>
            <div className="flex flex-wrap gap-1.5">
              {species.ecosystems.map((eco) => {
                const ecoInfo = ECOSYSTEM_INFO[eco];
                return (
                  <span
                    key={eco}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                  >
                    {ecoInfo.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Ecological Significance */}
        {showSignificance && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
              Ecological Significance
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {species.ecologicalSignificance}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {onClick && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <span className="text-xs text-ocean-primary font-medium flex items-center gap-1">
            View Details
            <Icon name="chevron-right" size="sm" />
          </span>
        </div>
      )}
    </CardWrapper>
  );
}

/**
 * SpeciesCardSkeleton - Loading state for SpeciesCard
 */
export function SpeciesCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
        <div className="w-8 h-5 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="w-20 h-5 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="w-8 h-5 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3 animate-pulse" />
        <div className="flex gap-1.5">
          <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse" />
          <div className="w-20 h-5 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * SpeciesCardGrid - Grid layout for species cards
 */
export function SpeciesCardGrid({
  species,
  compact = false,
  onSpeciesClick,
}: {
  species: IndicatorSpecies[];
  compact?: boolean;
  onSpeciesClick?: (species: IndicatorSpecies) => void;
}) {
  if (species.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="search" size="xl" className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No species found matching your criteria</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
      {species.map((s, index) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <SpeciesCard
            species={s}
            compact={compact}
            onClick={onSpeciesClick ? () => onSpeciesClick(s) : undefined}
          />
        </motion.div>
      ))}
    </div>
  );
}
