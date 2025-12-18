'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MPA } from '@/types';
import { fetchMPAById, formatArea } from '@/lib/mpa-service';
import { cacheMPA, getCachedMPA, isMPACached } from '@/lib/offline-storage';
import { getSpeciesForMPA } from '@/lib/species-service';
import { OBISSpecies, getCommonName } from '@/lib/obis-client';
import { Card, CardTitle, CardContent, Button, Badge, Icon, CircularProgress, getHealthColor } from '@/components/ui';
import { MPACardSkeleton } from '@/components/ui';
import { motion } from 'framer-motion';
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
    <main className="min-h-screen pb-32">
      {/* Modern Hero Header with Gradient */}
      <div className="bg-gradient-to-br from-ocean-primary via-ocean-accent to-cyan-400 pt-8 pb-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="mb-6 text-white/90 hover:text-white hover:bg-white/20 border-none"
            >
              <Icon name="angle-left" size="sm" />
              Back
            </Button>

            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon name="map-marker" className="text-white text-3xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{mpa.name}</h1>
                    <p className="text-white/80 flex items-center gap-2">
                      <Icon name="marker" size="sm" />
                      {mpa.country} • Est. {mpa.establishedYear}
                    </p>
                  </div>
                </div>
              </div>

              <CircularProgress
                value={mpa.healthScore}
                size="xl"
                color={getHealthColor(mpa.healthScore)}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="info" size="md" className="bg-white/20 text-white border-none">
                <Icon name="shield-check" size="sm" />
                {mpa.protectionLevel}
              </Badge>
              {cached && (
                <Badge variant="healthy" size="md" className="bg-white/20 text-white border-none">
                  <Icon name="download" size="sm" />
                  Cached
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 -mt-10">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ocean-primary to-ocean-accent mx-auto mb-2 flex items-center justify-center">
                <Icon name="chart-line" className="text-white text-xl" />
              </div>
              <p className="text-3xl font-bold text-ocean-deep">{mpa.healthScore}</p>
              <p className="text-xs text-gray-500 mt-1">Health Score</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mx-auto mb-2 flex items-center justify-center">
                <Icon name="fish" className="text-white text-xl" />
              </div>
              <p className="text-3xl font-bold text-ocean-deep">
                {mpa.speciesCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Species</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mx-auto mb-2 flex items-center justify-center">
                <Icon name="map" className="text-white text-xl" />
              </div>
              <p className="text-3xl font-bold text-ocean-deep">{formatArea(mpa.area)}</p>
              <p className="text-xs text-gray-500 mt-1">Area</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mx-auto mb-2 flex items-center justify-center">
                <Icon name="calendar" className="text-white text-xl" />
              </div>
              <p className="text-3xl font-bold text-ocean-deep">{mpa.establishedYear}</p>
              <p className="text-xs text-gray-500 mt-1">Established</p>
            </CardContent>
          </Card>
        </motion.div>

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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Link href="/observe">
            <Card hover interactive className="text-center">
              <CardContent className="py-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mx-auto mb-2 flex items-center justify-center">
                  <Icon name="camera" className="text-white text-lg" />
                </div>
                <p className="text-xs font-medium text-ocean-deep">Add Photo</p>
              </CardContent>
            </Card>
          </Link>

          <Card hover interactive className="text-center cursor-pointer" onClick={() => {}}>
            <CardContent className="py-4">
              <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                cached
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : 'bg-gradient-to-br from-gray-300 to-gray-400'
              }`}>
                <Icon name={cached ? 'check' : 'download'} className="text-white text-lg" />
              </div>
              <p className="text-xs font-medium text-ocean-deep">
                {cached ? 'Saved' : 'Save'}
              </p>
            </CardContent>
          </Card>

          <Card hover interactive className="text-center cursor-pointer">
            <CardContent className="py-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 mx-auto mb-2 flex items-center justify-center">
                <Icon name="share" className="text-white text-lg" />
              </div>
              <p className="text-xs font-medium text-ocean-deep">Share</p>
            </CardContent>
          </Card>
        </motion.div>

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
                          <div className="w-10 h-10 rounded-full bg-ocean-primary/10 flex items-center justify-center">
                            <Icon name="fish" className="text-ocean-primary" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {species.length > 5 && (
                  <Link href="/species">
                    <Button fullWidth variant="secondary">
                      <Icon name="arrow-right" size="sm" />
                      View All {species.length} Species
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <Icon name="search" className="text-gray-400 text-3xl" />
                </div>
                <p className="text-gray-600 mb-2 font-medium">No species data available</p>
                <p className="text-sm text-gray-500 mb-4">
                  This MPA may not have documented observations in the OBIS database yet
                </p>
                <Link href="/species">
                  <Button variant="secondary">
                    <Icon name="fish" size="sm" />
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
