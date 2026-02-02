/**
 * Indicator Species Browser Page
 * Main page for browsing and filtering curated indicator species
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardContent, Icon, Badge } from '@/components/ui';
import { IndicatorSpeciesFilter } from '@/components/IndicatorSpeciesFilter';
import { SpeciesCard, SpeciesCardGrid, SpeciesCardSkeleton } from '@/components/SpeciesCard';
import {
  SpeciesCategory,
  ConservationStatus,
  CATEGORY_INFO,
  CONSERVATION_STATUS_INFO,
  type IndicatorSpecies,
} from '@/types/indicator-species';
import { INDICATOR_SPECIES, getSpeciesByCategory } from '@/data/indicator-species';

export default function IndicatorSpeciesPage() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<SpeciesCategory[]>(
    Object.values(SpeciesCategory)
  );
  const [selectedStatuses, setSelectedStatuses] = useState<ConservationStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter species based on selections
  const filteredSpecies = useMemo(() => {
    return INDICATOR_SPECIES.filter((species) => {
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(species.category)) {
        return false;
      }

      // Conservation status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(species.conservationStatus)) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          species.commonName.toLowerCase().includes(query) ||
          species.scientificName.toLowerCase().includes(query) ||
          species.ecologicalSignificance.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [selectedCategories, selectedStatuses, searchQuery]);

  // Group species by category for statistics
  const categoryStats = useMemo(() => {
    const stats: Record<SpeciesCategory, { total: number; filtered: number }> = {} as any;
    for (const category of Object.values(SpeciesCategory)) {
      stats[category] = {
        total: INDICATOR_SPECIES.filter(s => s.category === category).length,
        filtered: filteredSpecies.filter(s => s.category === category).length,
      };
    }
    return stats;
  }, [filteredSpecies]);

  // Conservation status statistics
  const statusStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const species of filteredSpecies) {
      stats[species.conservationStatus] = (stats[species.conservationStatus] || 0) + 1;
    }
    return stats;
  }, [filteredSpecies]);

  const handleSpeciesClick = (species: IndicatorSpecies) => {
    router.push(`/ocean-pulse-app/indicator-species/${species.id}`);
  };

  return (
    <main id="main-content" className="min-h-screen pb-32">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-healthy via-balean-cyan to-balean-navy pt-4 pb-8 px-6 mb-4">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon name="leaf" size="xl" className="text-white" />
              </div>
              <h1 className="text-4xl font-bold">Indicator Species</h1>
            </div>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Curated marine species that serve as key indicators of ecosystem health.
              These species help scientists assess the condition of marine protected areas.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mt-6"
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-white">
              <div className="text-2xl font-bold">{INDICATOR_SPECIES.length}</div>
              <div className="text-sm text-white/80">Total Species</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-white">
              <div className="text-2xl font-bold">{Object.values(SpeciesCategory).length}</div>
              <div className="text-sm text-white/80">Categories</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-white">
              <div className="text-2xl font-bold">
                {INDICATOR_SPECIES.filter(s =>
                  ['CR', 'EN', 'VU'].includes(s.conservationStatus)
                ).length}
              </div>
              <div className="text-sm text-white/80">Threatened</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-4 space-y-4">
              <IndicatorSpeciesFilter
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                showStatusFilter={true}
                showSearch={true}
              />

              {/* Category Breakdown */}
              <Card className="shadow-lg">
                <CardTitle className="text-sm">Category Breakdown</CardTitle>
                <CardContent>
                  <div className="space-y-2">
                    {Object.values(SpeciesCategory).map((category) => {
                      const info = CATEGORY_INFO[category];
                      const stats = categoryStats[category];
                      const percentage = stats.total > 0
                        ? Math.round((stats.filtered / stats.total) * 100)
                        : 0;

                      return (
                        <div key={category} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: info.color }}
                          />
                          <span className="text-xs text-balean-gray-500 flex-1 truncate">
                            {info.name}
                          </span>
                          <span className="text-xs font-medium text-balean-gray-600">
                            {stats.filtered}/{stats.total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-balean-navy">
                  {loading ? 'Loading...' : `${filteredSpecies.length} Species`}
                </h2>
                {filteredSpecies.length !== INDICATOR_SPECIES.length && (
                  <Badge variant="info" size="sm">Filtered</Badge>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-balean-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-balean-cyan shadow-sm'
                      : 'text-balean-gray-400 hover:text-balean-gray-600'
                  }`}
                  aria-label="Grid view"
                >
                  <Icon name="grid-2x2" size="sm" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-balean-cyan shadow-sm'
                      : 'text-balean-gray-400 hover:text-balean-gray-600'
                  }`}
                  aria-label="List view"
                >
                  <Icon name="list" size="sm" />
                </button>
              </div>
            </div>

            {/* Conservation Status Summary */}
            {Object.keys(statusStats).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(statusStats)
                  .sort(([a], [b]) => {
                    const order = ['CR', 'EN', 'VU', 'NT', 'LC', 'DD'];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([status, count]) => {
                    const info = CONSERVATION_STATUS_INFO[status as ConservationStatus];
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${info.color}15`, color: info.color }}
                        title={`${info.name}: ${info.description}`}
                      >
                        <span className="font-bold">{status}</span>
                        <span className="text-balean-gray-500">
                          {info.name} ({count})
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Species Grid/List */}
            {loading ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'space-y-2'
              }>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SpeciesCardSkeleton key={i} compact={viewMode === 'list'} />
                ))}
              </div>
            ) : (
              <SpeciesCardGrid
                species={filteredSpecies}
                compact={viewMode === 'list'}
                onSpeciesClick={handleSpeciesClick}
              />
            )}

            {/* No Results */}
            {!loading && filteredSpecies.length === 0 && (
              <Card className="text-center py-12">
                <Icon name="search" size="xl" className="text-balean-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-balean-gray-500 mb-2">
                  No species match your filters
                </h3>
                <p className="text-balean-gray-400 mb-4">
                  Try adjusting your category or conservation status filters
                </p>
                <button
                  onClick={() => {
                    setSelectedCategories(Object.values(SpeciesCategory));
                    setSelectedStatuses([]);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-balean-cyan text-white rounded-lg hover:bg-balean-cyan-dark transition-colors"
                >
                  Reset Filters
                </button>
              </Card>
            )}
          </motion.div>
        </div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mt-8 shadow-lg">
            <CardTitle>About Indicator Species</CardTitle>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-balean-gray-600">
                    Indicator species are organisms whose presence, absence, or abundance
                    reflects a specific environmental condition. In marine ecosystems,
                    these species help scientists assess the overall health and stability
                    of protected areas.
                  </p>
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <Icon name="check" className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-800 mb-1">Why They Matter</h4>
                      <p className="text-sm text-emerald-700">
                        Changes in indicator species populations often signal broader
                        ecosystem changes before they become obvious in other ways.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-balean-navy">Species Categories</h4>
                  <div className="space-y-2">
                    {Object.values(SpeciesCategory).slice(0, 4).map((category) => {
                      const info = CATEGORY_INFO[category];
                      return (
                        <div
                          key={category}
                          className="flex items-start gap-3 p-3 bg-balean-gray-50 rounded-lg"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: info.color }}
                          >
                            <Icon name="star" size="sm" className="text-white" />
                          </div>
                          <div>
                            <h5 className="font-medium text-balean-navy text-sm">{info.name}</h5>
                            <p className="text-xs text-balean-gray-400 line-clamp-2">{info.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
