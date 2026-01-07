'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MPA } from '@/types';
import { fetchMPAById, formatArea } from '@/lib/mpa-service';
import { cacheMPA, getCachedMPA, isMPACached } from '@/lib/offline-storage';
import { Card, CardTitle, CardContent, CollapsibleCard, Button, Badge, Icon, CircularProgress, getHealthColor } from '@/components/ui';
import { MPACardSkeleton } from '@/components/ui';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAbundanceData } from '@/hooks/useAbundanceData';
import { AbundanceTrendCard } from '@/components/AbundanceTrendCard';
import { useEnvironmentalData } from '@/hooks/useEnvironmentalData';
import { EnvironmentalDashboard } from '@/components/EnvironmentalDashboard';
import { useTrackingData } from '@/hooks/useTrackingData';
import { useHybridHealthScore } from '@/hooks/useHybridHealthScore';
import { HealthScoreModal } from '@/components/HealthScoreModal';
import { TrackingStatsCard } from '@/components/TrackingStatsCard';
import { SpeciesCard } from '@/components/SpeciesCard';
import { getIndicatorSpeciesForMPA } from '@/lib/indicator-species';
import type { IndicatorSpecies } from '@/types/indicator-species';
import { CATEGORY_INFO } from '@/types/indicator-species';
import { UserMenu } from '@/components/UserMenu';
import { SaveMPAButton } from '@/components/SaveMPAButton';

// Dynamically import TrackingHeatmap with SSR disabled (Leaflet requires window)
const TrackingHeatmap = dynamic(
  () => import('@/components/TrackingHeatmap').then(mod => mod.TrackingHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-ocean-primary mb-2" />
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    )
  }
);

export default function MPADetailPage() {
  const params = useParams();
  const router = useRouter();
  const [mpa, setMpa] = useState<MPA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [indicatorSpecies, setIndicatorSpecies] = useState<IndicatorSpecies[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Load abundance data (filtered by indicator species)
  const {
    summary: abundanceSummary,
    loading: abundanceLoading,
    progress: abundanceProgress
  } = useAbundanceData(
    mpa?.id || '',
    mpa?.center || [0, 0],
    50,
    mpa ? {
      latitude: mpa.center[0],
      longitude: mpa.center[1],
      name: mpa.name,
      description: mpa.description,
    } : undefined
  );

  // Load environmental data
  const {
    summary: environmentalSummary,
    loading: environmentalLoading,
    progress: environmentalProgress
  } = useEnvironmentalData(
    mpa?.id || '',
    mpa?.center || [0, 0],
    50
  );

  // Generate boundary from MPA bounds (memoized to prevent infinite loops)
  const mpaBoundary = useMemo(() => {
    return mpa?.bounds?.map(([lat, lng]) => [lat, lng] as [number, number]) || [];
  }, [mpa?.bounds]);

  // MPA info for indicator species filtering
  const mpaInfo = useMemo(() => {
    if (!mpa) return undefined;
    return {
      latitude: mpa.center[0],
      longitude: mpa.center[1],
      name: mpa.name,
      description: mpa.description,
    };
  }, [mpa]);

  // Load tracking data (filtered by indicator species relevant to this MPA's ecosystem)
  const {
    summary: trackingSummary,
    loading: trackingLoading,
    progress: trackingProgress
  } = useTrackingData({
    mpaId: mpa?.id || '',
    mpaBoundary: mpaBoundary,
    enabled: !!mpa && mpaBoundary.length > 0,
    mpaInfo: mpaInfo,
  });

  // Calculate health score - uses backend when available, falls back to client-side
  const compositeHealth = useHybridHealthScore({
    mpaId: mpa?.id || '',
    mpaName: mpa?.name || '',
    lat: mpa?.center[0] || 0,
    lon: mpa?.center[1] || 0,
    abundanceSummary,
    abundanceLoading,
    environmentalSummary,
    environmentalLoading,
    trackingSummary,
    trackingLoading,
    indicatorSpeciesCount: indicatorSpecies.length,
    preferBackend: true, // Try backend first for Copernicus data
  });

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

  // Load indicator species for MPA
  useEffect(() => {
    if (mpa) {
      setSpeciesLoading(true);
      getIndicatorSpeciesForMPA({
        latitude: mpa.center[0],
        longitude: mpa.center[1],
        name: mpa.name,
        description: mpa.description,
      })
        .then(setIndicatorSpecies)
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
      <div className="bg-gradient-to-br from-ocean-primary via-ocean-accent to-cyan-400 pt-4 pb-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          {/* Top bar with back button and user menu */}
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/20 border-none"
            >
              <Icon name="angle-left" size="sm" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <SaveMPAButton mpaId={mpa.id} variant="icon" size="md" />
              <UserMenu />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >

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

              {compositeHealth.loading && compositeHealth.score === 0 ? (
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white" />
                </div>
              ) : (
                <div className="flex-shrink-0 relative">
                  <CircularProgress
                    value={compositeHealth.score}
                    size="xl"
                    color={getHealthColor(compositeHealth.score)}
                  />
                  {compositeHealth.confidence !== 'high' && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center" title={`${compositeHealth.dataSourcesAvailable}/3 data sources`}>
                      <Icon name="info" className="text-white text-xs" />
                    </div>
                  )}
                </div>
              )}
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
          <Card
            className="text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            interactive
            hover
            onClick={() => !compositeHealth.loading && setShowHealthModal(true)}
          >
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ocean-primary to-ocean-accent mx-auto mb-2 flex items-center justify-center">
                <Icon name="heart-rate" className="text-white text-xl" />
              </div>
              {compositeHealth.loading && compositeHealth.score === 0 ? (
                <>
                  <div className="h-9 flex items-center justify-center">
                    <div className="animate-pulse bg-gray-200 rounded w-12 h-8" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Calculating...</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-ocean-deep">{compositeHealth.score}</p>
                  <p className="text-xs text-gray-500 mt-1">Health Score</p>
                  <p className="text-xs text-gray-400">
                    {compositeHealth.dataSourcesAvailable}/{compositeHealth.source === 'backend' ? '5' : '3'} sources
                    {compositeHealth.backendAvailable && (
                      <span className="ml-1 text-green-600" title="Using Copernicus satellite data">*</span>
                    )}
                  </p>
                  <p className="text-xs text-ocean-primary mt-1 flex items-center justify-center gap-1">
                    <Icon name="info" size="sm" />
                    Tap for details
                  </p>
                </>
              )}
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
          <CollapsibleCard
            title="About this MPA"
            icon="info-circle"
            iconColor="text-ocean-primary"
            defaultOpen={true}
            className="mb-4"
          >
            <p className="text-gray-700 leading-relaxed">{mpa.description}</p>
          </CollapsibleCard>
        )}

        {/* Regulations */}
        {mpa.regulations && (
          <CollapsibleCard
            title="Protection & Regulations"
            icon="shield-check"
            iconColor="text-blue-600"
            defaultOpen={false}
            className="mb-4"
          >
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-gray-700 leading-relaxed">{mpa.regulations}</p>
            </div>
          </CollapsibleCard>
        )}

        {/* Location Card */}
        <CollapsibleCard
          title="Location"
          icon="map-marker"
          iconColor="text-green-600"
          defaultOpen={false}
          className="mb-4"
        >
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
        </CollapsibleCard>

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

        {/* Indicator Species */}
        <CollapsibleCard
          title="Indicator Species"
          icon="leaf"
          iconColor="text-emerald-600"
          defaultOpen={false}
          badge={
            indicatorSpecies.length > 0 && (
              <Badge variant="healthy" size="sm">{indicatorSpecies.length} species</Badge>
            )
          }
          className="mb-4"
        >
          {speciesLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-500 mb-4" />
              <p className="text-gray-600">Loading indicator species...</p>
            </div>
          ) : indicatorSpecies.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">
                These species serve as key markers for assessing ecosystem health.
              </p>

              {/* Category breakdown */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(
                  indicatorSpecies.reduce((acc, sp) => {
                    acc[sp.category] = (acc[sp.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([category, count]) => {
                  const info = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
                  return (
                    <Badge
                      key={category}
                      variant="info"
                      size="sm"
                      className="px-2 py-1"
                    >
                      {info.name}: {count}
                    </Badge>
                  );
                })}
              </div>

              <div className="space-y-2 mb-4">
                {indicatorSpecies.slice(0, showAllSpecies ? indicatorSpecies.length : 5).map((sp) => (
                  <Link
                    key={sp.id}
                    href={`/indicator-species/${sp.id}`}
                    className="block"
                  >
                    <SpeciesCard species={sp} compact />
                  </Link>
                ))}
              </div>
              {indicatorSpecies.length > 5 && (
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => setShowAllSpecies(!showAllSpecies)}
                >
                  <Icon name={showAllSpecies ? "angle-up" : "angle-down"} size="sm" />
                  {showAllSpecies ? 'Show Less' : `View All ${indicatorSpecies.length} Species`}
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="leaf" className="text-gray-400 text-3xl" />
              </div>
              <p className="text-gray-600 mb-2 font-medium">No indicator species identified</p>
              <p className="text-sm text-gray-500 mb-4">
                No indicator species match this MPA's ecosystem type
              </p>
              <Link href="/indicator-species">
                <Button variant="secondary">
                  <Icon name="leaf" size="sm" />
                  Browse Indicator Species
                </Button>
              </Link>
            </div>
          )}
        </CollapsibleCard>

        {/* Indicator Species Population Trends (10-Year Analysis) */}
        <CollapsibleCard
          title="Population Trends"
          icon="arrow-trend-up"
          iconColor="text-purple-600"
          defaultOpen={false}
          badge={
            abundanceSummary && abundanceSummary.speciesTrends.length > 0 && (
              <Badge
                variant={abundanceSummary.overallBiodiversity.trendDirection === 'increasing' ? 'healthy' :
                         abundanceSummary.overallBiodiversity.trendDirection === 'stable' ? 'info' : 'warning'}
                size="sm"
              >
                {abundanceSummary.overallBiodiversity.trendDirection}
              </Badge>
            )
          }
          className="mb-4"
        >
          {abundanceLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-ocean-primary mb-4" />
              <p className="text-gray-600 mb-2">Analyzing indicator species abundance data...</p>
              <p className="text-sm text-gray-500 mb-4">
                Filtering for ecosystem-relevant indicator species
              </p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <motion.div
                  className="bg-gradient-to-r from-ocean-primary to-ocean-accent h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${abundanceProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : abundanceSummary && abundanceSummary.speciesTrends.length > 0 ? (
            <>
              {/* Overall indicator species health summary */}
              <div className="mb-6 p-4 bg-gradient-to-br from-ocean-primary/10 to-ocean-accent/10 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Indicator Species Health</p>
                    <p className="text-3xl font-bold text-ocean-deep">
                      {abundanceSummary.overallBiodiversity.healthScore}
                      <span className="text-lg text-gray-500">/100</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {abundanceSummary.speciesTrends.length} indicator species
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    abundanceSummary.overallBiodiversity.trendDirection === 'increasing'
                      ? 'bg-green-100 text-green-700'
                      : abundanceSummary.overallBiodiversity.trendDirection === 'stable'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    <Icon name={
                      abundanceSummary.overallBiodiversity.trendDirection === 'increasing'
                        ? 'arrow-trend-up'
                        : abundanceSummary.overallBiodiversity.trendDirection === 'stable'
                        ? 'minus'
                        : 'arrow-trend-down'
                    } />
                    <span className="font-medium capitalize">
                      {abundanceSummary.overallBiodiversity.trendDirection}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data quality indicator */}
              <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded">
                <div className="flex items-start gap-2">
                  <Icon name="leaf" size="sm" className="text-emerald-600 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Indicator Species Data</p>
                    <p className="text-xs text-gray-600">
                      {abundanceSummary.dataQuality.recordsWithAbundance.toLocaleString()} occurrence records
                      for indicator species from OBIS (10-year analysis)
                    </p>
                  </div>
                </div>
              </div>

              {/* Trend cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {abundanceSummary.speciesTrends
                  .slice(0, showAllTrends ? undefined : 6)
                  .map((trend) => (
                    <AbundanceTrendCard key={trend.scientificName} trend={trend} />
                  ))}
              </div>

              {/* View all button */}
              {abundanceSummary.speciesTrends.length > 6 && (
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => setShowAllTrends(!showAllTrends)}
                >
                  <Icon name={showAllTrends ? "angle-up" : "angle-down"} size="sm" />
                  {showAllTrends ? 'Show Less' : `View All ${abundanceSummary.speciesTrends.length} Trends`}
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="chart-line" className="text-gray-400 text-3xl" />
              </div>
              <p className="text-gray-600 mb-2 font-medium">No indicator species abundance data</p>
              <p className="text-sm text-gray-500">
                No abundance records found for indicator species in this MPA
              </p>
            </div>
          )}
        </CollapsibleCard>

        {/* Habitat Quality (Environmental Data) */}
        <CollapsibleCard
          title="Habitat Quality"
          icon="flask"
          iconColor="text-cyan-600"
          defaultOpen={false}
          badge={
            environmentalSummary && environmentalSummary.parameters.length > 0 && (
              <Badge
                variant={environmentalSummary.habitatQualityScore >= 80 ? 'healthy' :
                         environmentalSummary.habitatQualityScore >= 60 ? 'info' : 'warning'}
                size="sm"
              >
                {environmentalSummary.habitatQualityScore}/100
              </Badge>
            )
          }
          className="mb-4"
        >
          {environmentalLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-ocean-primary mb-4" />
              <p className="text-gray-600 mb-2">Analyzing environmental conditions...</p>
              <p className="text-sm text-gray-500 mb-4">
                Temperature, salinity, pH, and more
              </p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <motion.div
                  className="bg-gradient-to-r from-ocean-primary to-ocean-accent h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${environmentalProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : environmentalSummary && environmentalSummary.parameters.length > 0 ? (
            <>
              {/* Habitat quality score */}
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Habitat Quality Score</p>
                    <p className="text-3xl font-bold text-ocean-deep">
                      {environmentalSummary.habitatQualityScore}
                      <span className="text-lg text-gray-500">/100</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {environmentalSummary.parameters.length} environmental parameters
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
                    <Icon
                      name={
                        environmentalSummary.habitatQualityScore >= 80 ? 'circle-check' :
                        environmentalSummary.habitatQualityScore >= 60 ? 'circle-exclamation' :
                        'triangle-exclamation'
                      }
                      className={`text-3xl ${
                        environmentalSummary.habitatQualityScore >= 80 ? 'text-green-500' :
                        environmentalSummary.habitatQualityScore >= 60 ? 'text-yellow-500' :
                        'text-orange-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Data quality indicator */}
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start gap-2">
                  <Icon name="info" size="sm" className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Environmental Monitoring Data</p>
                    <p className="text-xs text-gray-600">
                      {environmentalSummary.dataQuality.measurementsCount.toLocaleString()} measurements
                      across {environmentalSummary.parameters.length} parameters from OBIS-ENV-DATA
                    </p>
                  </div>
                </div>
              </div>

              {/* Environmental dashboard */}
              <EnvironmentalDashboard summary={environmentalSummary} />
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="flask" className="text-gray-400 text-3xl" />
              </div>
              <p className="text-gray-600 mb-2 font-medium">No environmental data available</p>
              <p className="text-sm text-gray-500">
                This MPA may not have environmental measurements in the OBIS database yet
              </p>
            </div>
          )}
        </CollapsibleCard>

        {/* Satellite Tracking Data from Movebank */}
        <CollapsibleCard
          title="Satellite Tracking"
          icon="satellite"
          iconColor="text-indigo-600"
          defaultOpen={false}
          badge={
            trackingSummary && trackingSummary.trackedIndividuals > 0 && (
              <Badge variant="info" size="sm">
                {trackingSummary.trackedIndividuals} tagged
              </Badge>
            )
          }
          className="mb-4"
        >
          {trackingLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-ocean-primary mb-4" />
              <p className="text-gray-600 mb-2">Searching Movebank for tracking data...</p>
              <p className="text-sm text-gray-500 mb-4">
                Finding GPS/satellite telemetry studies near this MPA
              </p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <motion.div
                  className="bg-gradient-to-r from-ocean-primary to-ocean-accent h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${trackingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : trackingSummary && trackingSummary.trackedIndividuals > 0 ? (
            <>
              {/* Tracking Stats */}
              <div className="mb-6">
                <TrackingStatsCard summary={trackingSummary} />
              </div>

              {/* Data source attribution */}
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start gap-2">
                  <Icon name="satellite" size="sm" className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Real Telemetry Data from Movebank</p>
                    <p className="text-xs text-gray-600">
                      GPS/satellite tracking data from tagged animals in scientific studies
                    </p>
                  </div>
                </div>
              </div>

              {/* Tracking Heatmap */}
              <TrackingHeatmap
                summary={trackingSummary}
                center={mpa.center}
                zoom={6}
              />
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="satellite" className="text-gray-400 text-3xl" />
              </div>
              <p className="text-gray-600 mb-2 font-medium">No satellite tracking data available</p>
              <p className="text-sm text-gray-500">
                No GPS/satellite telemetry studies found for marine species in this area on Movebank
              </p>
            </div>
          )}
        </CollapsibleCard>
      </div>

      {/* Health Score Modal */}
      <HealthScoreModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        healthData={compositeHealth}
      />
    </main>
  );
}
