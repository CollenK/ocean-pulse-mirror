'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardTitle, CardContent, Input, Badge } from '@/components/ui';
import { searchSpeciesCached, getPopularSpecies } from '@/lib/species-service';
import { OBISSpecies, getCommonName } from '@/lib/obis-client';
import { debounce } from '@/lib/performance';
import { trackSpeciesSearch } from '@/lib/analytics';
import Link from 'next/link';

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
    <main id="main-content" className="min-h-screen p-6 pb-24 bg-gray-50">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">
          🐠 Species Database
        </h1>
        <p className="text-gray-600 mb-6">
          Search marine species from the OBIS database
        </p>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by scientific or common name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-10"
                aria-label="Search species by name"
                autoComplete="off"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite" aria-atomic="true">
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="sr-only">Searching...</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Type at least 2 characters to search
            </p>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchPerformed && (
          <Card className="mb-6">
            <CardTitle>
              Search Results ({results.length})
            </CardTitle>
            <CardContent role="region" aria-live="polite" aria-atomic="false">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-gray-600 mb-2">No species found</p>
                  <p className="text-sm text-gray-500">
                    Try searching with a different term or check your spelling
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((species) => (
                    <Link
                      key={species.id}
                      href={`/species/${encodeURIComponent(species.scientificName)}`}
                      className="block"
                    >
                      <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-cyan-300">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-navy-600 mb-1">
                              {getCommonName(species)}
                            </h3>
                            {species.vernacularName && (
                              <p className="text-sm text-gray-600 italic mb-2">
                                {species.scientificName}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {species.taxonRank && (
                                <Badge variant="secondary" size="sm">
                                  {species.taxonRank}
                                </Badge>
                              )}
                              {species.kingdom && (
                                <Badge variant="info" size="sm">
                                  {species.kingdom}
                                </Badge>
                              )}
                              {species.records !== undefined && species.records > 0 && (
                                <Badge variant="secondary" size="sm">
                                  {species.records.toLocaleString()} records
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-3xl">
                            {species.kingdom === 'Animalia' && '🐟'}
                            {species.kingdom === 'Plantae' && '🌿'}
                            {species.phylum === 'Cnidaria' && '🪸'}
                            {species.class === 'Mammalia' && '🐋'}
                            {species.class === 'Aves' && '🦅'}
                            {!species.kingdom && !species.phylum && !species.class && '🐠'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Popular Species */}
        {!searchPerformed && popularSpecies.length > 0 && (
          <Card>
            <CardTitle>Popular Marine Species</CardTitle>
            <CardContent>
              <div className="space-y-3">
                {popularSpecies.map((species) => (
                  <Link
                    key={species.id}
                    href={`/species/${encodeURIComponent(species.scientificName)}`}
                    className="block"
                  >
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-cyan-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-navy-600 mb-1">
                            {getCommonName(species)}
                          </h3>
                          {species.vernacularName && (
                            <p className="text-sm text-gray-600 italic mb-2">
                              {species.scientificName}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {species.taxonRank && (
                              <Badge variant="secondary" size="sm">
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
                        <div className="text-3xl">
                          {species.class === 'Mammalia' && '🐋'}
                          {species.class === 'Reptilia' && '🐢'}
                          {species.class === 'Actinopterygii' && '🐟'}
                          {species.class === 'Elasmobranchii' && '🦈'}
                          {species.order === 'Scleractinia' && '🪸'}
                          {species.class === 'Cephalopoda' && '🐙'}
                          {!['Mammalia', 'Reptilia', 'Actinopterygii', 'Elasmobranchii', 'Cephalopoda'].includes(species.class || '') && species.order !== 'Scleractinia' && '🐠'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="mt-6">
          <CardTitle>About Species Data</CardTitle>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Species data is provided by the <strong>Ocean Biodiversity Information System (OBIS)</strong>,
                a global database of marine biodiversity observations.
              </p>
              <p>
                🌐 OBIS contains data from over 3,500 datasets representing millions of observations
                of over 120,000 marine species.
              </p>
              <p>
                📊 Data is contributed by researchers, institutions, and citizen scientists worldwide
                to support marine conservation and research.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
