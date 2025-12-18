'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MPA } from '@/types';
import { fetchMPAById, formatArea } from '@/lib/mpa-service';
import { cacheMPA, getCachedMPA, isMPACached } from '@/lib/offline-storage';
import { getSpeciesForMPA } from '@/lib/species-service';
import { OBISSpecies, getCommonName } from '@/lib/obis-client';
import { Card, CardTitle, CardContent, Button, HealthBadge, Badge } from '@/components/ui';
import { MPACardSkeleton } from '@/components/ui';
import Link from 'next/link';

export default function MPADetailPage() {
  const params = useParams();
  const router = useRouter();
  const [mpa, setMpa] = useState<MPA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [species, setSpecies] = useState<OBISSpecies[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);

  useEffect(() => {
    const id = params.id as string;

    // Try to load from cache first
    getCachedMPA(id)
      .then((cachedData) => {
        if (cachedData) {
          setMpa(cachedData);
          setCached(true);
          setLoading(false);
        }
      })
      .catch(() => {
        // If cache fails, continue to fetch from network
      });

    // Fetch from network
    fetchMPAById(id)
      .then(async (data) => {
        if (data) {
          setMpa(data);
          // Automatically cache the MPA
          await cacheMPA(data);
          setCached(true);
        } else {
          setError('MPA not found');
        }
      })
      .catch(() => setError('Failed to load MPA'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Load species data for MPA
  useEffect(() => {
    if (mpa) {
      setSpeciesLoading(true);
      getSpeciesForMPA(mpa.id, mpa.center, 50)
        .then(setSpecies)
        .finally(() => setSpeciesLoading(false));
    }
  }, [mpa]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 pb-24 bg-gray-50">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-4">
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
          <MPACardSkeleton />
          <div className="mt-4">
            <MPACardSkeleton />
          </div>
        </div>
      </main>
    );
  }

  if (error || !mpa) {
    return (
      <main className="min-h-screen p-6 pb-24 bg-gray-50">
        <div className="max-w-screen-xl mx-auto">
          <Card>
            <CardTitle>Error</CardTitle>
            <CardContent>
              <p className="text-gray-600 mb-4">
                {error || 'MPA not found'}
              </p>
              <Button onClick={() => router.push('/')} variant="secondary">
                ← Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-gray-50">
      {/* Hero Header with Gradient */}
      <div className="bg-gradient-to-br from-cyan-500 to-navy-600 text-white p-6 pb-12">
        <div className="max-w-screen-xl mx-auto">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-4 text-white border-white hover:bg-white/20"
          >
            ← Back
          </Button>

          <h1 className="text-3xl font-bold mb-2">{mpa.name}</h1>
          <p className="text-lg opacity-90 mb-4">
            {mpa.country} • Est. {mpa.establishedYear}
          </p>

          <div className="flex flex-wrap gap-2">
            <HealthBadge score={mpa.healthScore} size="md" />
            <Badge variant="info" size="md">
              {mpa.protectionLevel}
            </Badge>
            {cached && (
              <Badge variant="healthy" size="md">
                💾 Cached
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 -mt-6">
        {/* Stats Card */}
        <Card className="mb-6 shadow-lg">
          <CardTitle>Key Statistics</CardTitle>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-cyan-600">{mpa.healthScore}</p>
                <p className="text-sm text-gray-600">Health Score</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-navy-600">
                  {mpa.speciesCount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Species</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-ocean-500">{formatArea(mpa.area)}</p>
                <p className="text-sm text-gray-600">Area</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-700">{mpa.establishedYear}</p>
                <p className="text-sm text-gray-600">Established</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {mpa.description && (
          <Card className="mb-6">
            <CardTitle>About this MPA</CardTitle>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{mpa.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Regulations */}
        {mpa.regulations && (
          <Card className="mb-6">
            <CardTitle>Protection & Regulations</CardTitle>
            <CardContent>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-gray-700 leading-relaxed">{mpa.regulations}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Card */}
        <Card className="mb-6">
          <CardTitle>Location</CardTitle>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-gray-700">Center: </span>
                <span className="text-gray-600">
                  {mpa.center[0].toFixed(4)}°, {mpa.center[1].toFixed(4)}°
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Country: </span>
                <span className="text-gray-600">{mpa.country}</span>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/">
                <Button fullWidth>View on Map</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="mb-6">
          <CardTitle>Actions</CardTitle>
          <CardContent>
            <div className="space-y-3">
              <Link href="/observe">
                <Button fullWidth variant="secondary">
                  📷 Add Observation
                </Button>
              </Link>
              <Button fullWidth variant="ghost" disabled={cached}>
                {cached ? '✓ Saved for Offline' : '💾 Save for Offline'}
              </Button>
              <Button fullWidth variant="ghost">
                📤 Share MPA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Species Preview */}
        <Card>
          <CardTitle>Species Diversity</CardTitle>
          <CardContent>
            {speciesLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-cyan-500 mb-4" />
                <p className="text-gray-600">Loading species data from OBIS...</p>
              </div>
            ) : species.length > 0 ? (
              <>
                <p className="text-gray-600 mb-4">
                  Found{' '}
                  <span className="font-bold text-navy-600">
                    {species.length}
                  </span>{' '}
                  species documented in this area from the OBIS database.
                </p>
                <div className="space-y-3 mb-4">
                  {species.slice(0, 5).map((sp) => (
                    <Link
                      key={sp.id}
                      href={`/species/${encodeURIComponent(sp.scientificName)}`}
                      className="block"
                    >
                      <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-cyan-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-navy-600 text-sm">
                              {getCommonName(sp)}
                            </p>
                            {sp.vernacularName && (
                              <p className="text-xs text-gray-500 italic">
                                {sp.scientificName}
                              </p>
                            )}
                          </div>
                          <div className="text-xl">
                            {sp.class === 'Mammalia' && '🐋'}
                            {sp.class === 'Reptilia' && '🐢'}
                            {sp.class === 'Actinopterygii' && '🐟'}
                            {sp.class === 'Elasmobranchii' && '🦈'}
                            {sp.order === 'Scleractinia' && '🪸'}
                            {!['Mammalia', 'Reptilia', 'Actinopterygii', 'Elasmobranchii'].includes(sp.class || '') && sp.order !== 'Scleractinia' && '🐠'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {species.length > 5 && (
                  <Link href="/species">
                    <Button fullWidth variant="secondary">
                      View All {species.length} Species →
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-600 mb-2">No species data available</p>
                <p className="text-sm text-gray-500 mb-4">
                  This MPA may not have documented observations in the OBIS database yet
                </p>
                <Link href="/species">
                  <Button variant="secondary">
                    Browse Species Database
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
