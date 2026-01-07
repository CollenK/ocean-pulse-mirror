'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardTitle, CardContent, Input, Badge, Icon } from '@/components/ui';
import { searchSpeciesCached, getPopularSpecies } from '@/lib/species-service';
import { OBISSpecies, getCommonName } from '@/lib/obis-client';
import { debounce } from '@/lib/performance';
import { trackSpeciesSearch } from '@/lib/analytics';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Helper function to get species icon based on classification
function getSpeciesIcon(species: OBISSpecies): string {
  if (species.class === 'Mammalia') return 'whale';
  if (species.class === 'Reptilia') return 'turtle';
  if (species.class === 'Aves') return 'bird';
  if (species.class === 'Actinopterygii') return 'fish';
  if (species.class === 'Elasmobranchii') return 'fish';
  if (species.class === 'Cephalopoda') return 'fish';
  if (species.phylum === 'Cnidaria') return 'gem';
  if (species.order === 'Scleractinia') return 'gem';
  if (species.kingdom === 'Plantae') return 'leaf';
  return 'fish'; // default
}

export default function SpeciesSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OBISSpecies[]>([]);
  const [popularSpecies, setPopularSpecies] = useState<OBISSpecies[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Load popular species on mount
  useEffect(() => {
    getPopularSpecies(10).then(setPopularSpecies);
  }, []);

  // Memoized debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchQuery: string) => {
        searchSpeciesCached(searchQuery)
          .then((data) => {
            setResults(data);
            setSearchPerformed(true);
            // Track search analytics
            trackSpeciesSearch(searchQuery, data.length);
          })
          .finally(() => setLoading(false));
      }, 500),
    []
  );

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearchPerformed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return (
    <main id="main-content" className="min-h-screen pb-32">
      {/* Modern Hero Header with Gradient */}
      <div className="bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 pt-8 pb-12 px-6 mb-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon name="fish" size="xl" className="text-white" />
              </div>
              <h1 className="text-4xl font-bold">Species Database</h1>
            </div>
            <p className="text-lg text-white/90">
              Search marine species from the OBIS database
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6 shadow-lg">
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Icon name="search" className="text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by scientific or common name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12 pr-10"
                  aria-label="Search species by name"
                  autoComplete="off"
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2" aria-live="polite" aria-atomic="true">
                    <div className="w-5 h-5 border-2 border-ocean-primary border-t-transparent rounded-full animate-spin" />
                    <span className="sr-only">Searching...</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Icon name="info" size="sm" />
                Type at least 2 characters to search
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search Results */}
        {searchPerformed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="mb-0">Search Results</CardTitle>
                <Badge variant="info" size="md">
                  {results.length} {results.length === 1 ? 'species' : 'species'}
                </Badge>
              </div>
              <CardContent>
                {results.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                      <Icon name="search" className="text-gray-400 text-3xl" />
                    </div>
                    <p className="text-gray-600 mb-2 font-medium">No species found</p>
                    <p className="text-sm text-gray-500">
                      Try searching with a different term or check your spelling
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((species, index) => (
                      <motion.div
                        key={species.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={`/species/${encodeURIComponent(species.scientificName)}`}
                          className="block"
                        >
                          <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-200 hover:border-ocean-primary hover:shadow-md group">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-ocean-deep mb-1 group-hover:text-ocean-primary transition-colors">
                                  {getCommonName(species)}
                                </h3>
                                {species.vernacularName && (
                                  <p className="text-sm text-gray-600 italic mb-2">
                                    {species.scientificName}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {species.taxonRank && (
                                    <Badge variant="info" size="sm">
                                      {species.taxonRank}
                                    </Badge>
                                  )}
                                  {species.kingdom && (
                                    <Badge variant="info" size="sm">
                                      {species.kingdom}
                                    </Badge>
                                  )}
                                  {species.records !== undefined && species.records > 0 && (
                                    <Badge variant="info" size="sm">
                                      <Icon name="chart-simple" size="sm" />
                                      {species.records.toLocaleString()} records
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Icon name={getSpeciesIcon(species)} className="text-white text-xl" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Popular Species */}
        {!searchPerformed && popularSpecies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg">
              <CardTitle>Popular Marine Species</CardTitle>
              <CardContent>
                <div className="space-y-3">
                  {popularSpecies.map((species, index) => (
                    <motion.div
                      key={species.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      <Link
                        href={`/species/${encodeURIComponent(species.scientificName)}`}
                        className="block"
                      >
                        <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-200 hover:border-ocean-primary hover:shadow-md group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-ocean-deep mb-1 group-hover:text-ocean-primary transition-colors">
                                {getCommonName(species)}
                              </h3>
                              {species.vernacularName && (
                                <p className="text-sm text-gray-600 italic mb-2">
                                  {species.scientificName}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {species.taxonRank && (
                                  <Badge variant="info" size="sm">
                                    {species.taxonRank}
                                  </Badge>
                                )}
                                {species.family && (
                                  <Badge variant="info" size="sm">
                                    {species.family}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Icon name={getSpeciesIcon(species)} className="text-white text-xl" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mt-6 shadow-lg">
            <CardTitle>About Species Data</CardTitle>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Species data is provided by the <strong>Ocean Biodiversity Information System (OBIS)</strong>,
                  a global database of marine biodiversity observations.
                </p>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ocean-primary to-ocean-accent flex items-center justify-center flex-shrink-0">
                    <Icon name="globe" className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      OBIS contains data from over <strong>3,500 datasets</strong> representing millions of observations
                      of over <strong>120,000 marine species</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Icon name="users" className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Data is contributed by researchers, institutions, and citizen scientists worldwide
                      to support marine conservation and research.
                    </p>
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
