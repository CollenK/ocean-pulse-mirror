/**
 * Indicator Species Detail Page
 * Detailed view for a single indicator species
 */

'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardTitle, CardContent, Icon, Badge } from '@/components/ui';
import {
  SpeciesCategory,
  CATEGORY_INFO,
  CONSERVATION_STATUS_INFO,
  ECOSYSTEM_INFO,
  EcosystemType,
  type IndicatorSpecies,
} from '@/types/indicator-species';
import { INDICATOR_SPECIES, getSpeciesByCategory } from '@/data/indicator-species';

// Map category to icon names
const CATEGORY_ICONS: Record<SpeciesCategory, string> = {
  [SpeciesCategory.APEX_PREDATOR]: 'shark',
  [SpeciesCategory.CORAL]: 'flower',
  [SpeciesCategory.FOUNDATION]: 'leaf',
  [SpeciesCategory.KEYSTONE]: 'star',
  [SpeciesCategory.SEABIRD]: 'bird',
  [SpeciesCategory.INVERTEBRATE]: 'bug',
};

// Map ecosystem to icon
const ECOSYSTEM_ICONS: Record<EcosystemType, string> = {
  [EcosystemType.CORAL_REEF]: 'gem',
  [EcosystemType.KELP_FOREST]: 'leaf',
  [EcosystemType.SEAGRASS]: 'grass',
  [EcosystemType.MANGROVE]: 'tree',
  [EcosystemType.ROCKY_REEF]: 'mountain',
  [EcosystemType.OPEN_OCEAN]: 'globe',
  [EcosystemType.POLAR]: 'snowflake',
  [EcosystemType.TEMPERATE]: 'thermometer',
  [EcosystemType.DEEP_SEA]: 'droplet',
};

// Sensitivity rating display
const SENSITIVITY_INFO = {
  low: {
    label: 'Low Sensitivity',
    description: 'Tolerant to environmental changes',
    color: '#10B981',
  },
  medium: {
    label: 'Medium Sensitivity',
    description: 'Moderate sensitivity to environmental stress',
    color: '#F59E0B',
  },
  high: {
    label: 'High Sensitivity',
    description: 'Highly sensitive to environmental changes',
    color: '#EF4444',
  },
};

export default function IndicatorSpeciesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const speciesId = params.id as string;

  // Find the species
  const species = useMemo(() => {
    return INDICATOR_SPECIES.find(s => s.id === speciesId);
  }, [speciesId]);

  // Get related species (same category)
  const relatedSpecies = useMemo(() => {
    if (!species) return [];
    return getSpeciesByCategory(species.category)
      .filter(s => s.id !== species.id)
      .slice(0, 4);
  }, [species]);

  if (!species) {
    return (
      <main id="main-content" className="min-h-screen pb-32">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <Card className="text-center py-16">
            <Icon name="alert-circle" size="xl" className="text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-600 mb-2">Species Not Found</h1>
            <p className="text-gray-500 mb-6">
              The indicator species you're looking for doesn't exist.
            </p>
            <Link
              href="/indicator-species"
              className="inline-flex items-center gap-2 px-4 py-2 bg-ocean-primary text-white rounded-lg hover:bg-ocean-dark transition-colors"
            >
              <Icon name="arrow-left" size="sm" />
              Back to Species Browser
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  const categoryInfo = CATEGORY_INFO[species.category];
  const statusInfo = CONSERVATION_STATUS_INFO[species.conservationStatus];
  const sensitivityInfo = SENSITIVITY_INFO[species.sensitivityRating];

  return (
    <main id="main-content" className="min-h-screen pb-32">
      {/* Hero Header with Category Color */}
      <div
        className="pt-8 pb-16 px-6"
        style={{
          background: `linear-gradient(135deg, ${categoryInfo.color}dd 0%, ${categoryInfo.color}99 50%, ${categoryInfo.color}77 100%)`,
        }}
      >
        <div className="max-w-screen-xl mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link
              href="/indicator-species"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="arrow-left" size="sm" />
              Back to Species Browser
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-white"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Species Icon */}
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Icon
                  name={CATEGORY_ICONS[species.category]}
                  size="xl"
                  className="text-white text-4xl"
                />
              </div>

              {/* Species Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    {categoryInfo.name}
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.name}
                  </span>
                </div>

                <h1 className="text-4xl font-bold mb-1">{species.commonName}</h1>
                <p className="text-xl text-white/80 italic mb-4">{species.scientificName}</p>

                <p className="text-white/90 max-w-2xl leading-relaxed">
                  {species.ecologicalSignificance}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Key Information */}
            <Card className="shadow-lg">
              <CardTitle>Key Information</CardTitle>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Conservation Status */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: statusInfo.color }}
                      >
                        <Icon name="shield" size="sm" className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          IUCN Status
                        </p>
                        <p className="font-semibold text-gray-800">{statusInfo.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{statusInfo.description}</p>
                  </div>

                  {/* Sensitivity */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: sensitivityInfo.color }}
                      >
                        <Icon name="gauge" size="sm" className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Sensitivity
                        </p>
                        <p className="font-semibold text-gray-800">{sensitivityInfo.label}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{sensitivityInfo.description}</p>
                  </div>

                  {/* OBIS Taxon ID */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-ocean-primary flex items-center justify-center">
                        <Icon name="database" size="sm" className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          OBIS Taxon ID
                        </p>
                        <p className="font-semibold text-gray-800">{species.obisTaxonId}</p>
                      </div>
                    </div>
                    <a
                      href={`https://obis.org/taxon/${species.obisTaxonId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-ocean-primary hover:text-ocean-dark"
                    >
                      View on OBIS
                      <Icon name="external-link" size="xs" />
                    </a>
                  </div>

                  {/* Category */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        <Icon
                          name={CATEGORY_ICONS[species.category]}
                          size="sm"
                          className="text-white"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Category
                        </p>
                        <p className="font-semibold text-gray-800">{categoryInfo.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{categoryInfo.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ecosystems */}
            <Card className="shadow-lg">
              <CardTitle>Ecosystems</CardTitle>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  This species is found in the following marine ecosystems:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {species.ecosystems.map((eco) => {
                    const ecoInfo = ECOSYSTEM_INFO[eco];
                    return (
                      <div
                        key={eco}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${ecoInfo.color}20` }}
                        >
                          <Icon
                            name={ECOSYSTEM_ICONS[eco]}
                            size="sm"
                            style={{ color: ecoInfo.color }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{ecoInfo.name}</p>
                          <p className="text-xs text-gray-500">{ecoInfo.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card className="shadow-lg">
              <CardTitle>Geographic Distribution</CardTitle>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      South
                    </p>
                    <p className="text-lg font-bold text-ocean-deep">
                      {species.geographicBounds.south.toFixed(1)}&deg;
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      North
                    </p>
                    <p className="text-lg font-bold text-ocean-deep">
                      {species.geographicBounds.north.toFixed(1)}&deg;
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      West
                    </p>
                    <p className="text-lg font-bold text-ocean-deep">
                      {species.geographicBounds.west.toFixed(1)}&deg;
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      East
                    </p>
                    <p className="text-lg font-bold text-ocean-deep">
                      {species.geographicBounds.east.toFixed(1)}&deg;
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Geographic bounds indicate the typical range where this species can be found.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Facts */}
            <Card className="shadow-lg">
              <CardTitle className="text-sm">Quick Facts</CardTitle>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Icon name="check-circle" size="sm" className="text-green-500 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      Indicator of {categoryInfo.name.toLowerCase()} ecosystem health
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check-circle" size="sm" className="text-green-500 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      Found in {species.ecosystems.length} ecosystem type{species.ecosystems.length > 1 ? 's' : ''}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="check-circle" size="sm" className="text-green-500 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      {species.sensitivityRating === 'high'
                        ? 'Excellent early warning indicator'
                        : species.sensitivityRating === 'medium'
                        ? 'Good indicator of ecosystem trends'
                        : 'Reliable baseline indicator'}
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Conservation Status Detail */}
            <Card className="shadow-lg overflow-hidden">
              <div
                className="px-4 py-3"
                style={{ backgroundColor: `${statusInfo.color}15` }}
              >
                <h3
                  className="text-sm font-semibold"
                  style={{ color: statusInfo.color }}
                >
                  Conservation Status
                </h3>
              </div>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {species.conservationStatus}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{statusInfo.name}</p>
                    <p className="text-xs text-gray-500">IUCN Red List</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{statusInfo.description}</p>
              </CardContent>
            </Card>

            {/* Related Species */}
            {relatedSpecies.length > 0 && (
              <Card className="shadow-lg">
                <CardTitle className="text-sm">Related Species</CardTitle>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-3">
                    Other {categoryInfo.name.toLowerCase()} species
                  </p>
                  <div className="space-y-2">
                    {relatedSpecies.map((related) => {
                      const relatedStatus = CONSERVATION_STATUS_INFO[related.conservationStatus];
                      return (
                        <Link
                          key={related.id}
                          href={`/indicator-species/${related.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${categoryInfo.color}15` }}
                          >
                            <Icon
                              name={CATEGORY_ICONS[related.category]}
                              size="sm"
                              style={{ color: categoryInfo.color }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 group-hover:text-ocean-primary truncate">
                              {related.commonName}
                            </p>
                            <p className="text-xs text-gray-500 italic truncate">
                              {related.scientificName}
                            </p>
                          </div>
                          <div
                            className="px-1.5 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
                            style={{ backgroundColor: relatedStatus.color }}
                          >
                            {related.conservationStatus}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
