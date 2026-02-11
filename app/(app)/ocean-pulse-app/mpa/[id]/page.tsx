'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MPA } from '@/types';
import { fetchMPAById, formatArea } from '@/lib/mpa-service';
import { cacheMPA, getCachedMPA, isMPACached } from '@/lib/offline-storage';
import { Card, CardTitle, CardContent, CollapsibleCard, Button, Badge, Icon, InfoTip, CircularProgress, getHealthColor } from '@/components/ui';
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
import { SaveMPAButton } from '@/components/SaveMPAButton';
import { LiveReports } from '@/components/LiveReports';
import { useObservations } from '@/hooks/useObservations';
import { getCountryName } from '@/lib/country-names';
import { useFishingData } from '@/hooks/useFishingData';
import { useHeatwaveAlert } from '@/hooks/useHeatwaveAlert';
import { FishingTrendChart, FishingByFlagChart, FishingByGearChart } from '@/components/Charts/FishingTrendChart';
import { VesselActivityFeed } from '@/components/VesselActivity';
import { IUURiskBadge } from '@/components/ui/IUURiskBadge';
import { HeatwaveAlert, HeatwaveAlertBadge } from '@/components/HeatwaveAlert';

// Dynamically import TrackingHeatmap with SSR disabled (Leaflet requires window)
const TrackingHeatmap = dynamic(
  () => import('@/components/TrackingHeatmap').then(mod => mod.TrackingHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-xl bg-balean-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-balean-gray-200 border-t-balean-cyan mb-2" />
          <p className="text-sm text-balean-gray-400">Loading map...</p>
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

  // Load observations for badge count
  const { observations: mpaObservations } = useObservations(mpa?.id || '', { enabled: !!mpa });

  // Scale search radius to MPA size (min 50km, max 300km)
  const abundanceRadius = useMemo(() => {
    if (!mpa?.area) return 50;
    return Math.min(Math.max(Math.round(Math.sqrt(mpa.area / Math.PI)), 50), 300);
  }, [mpa?.area]);

  // Load abundance data (filtered by indicator species)
  const {
    summary: abundanceSummary,
    loading: abundanceLoading,
    progress: abundanceProgress
  } = useAbundanceData(
    mpa?.id || '',
    mpa?.center || [0, 0],
    abundanceRadius,
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

  // Load fishing activity data from Global Fishing Watch
  const {
    data: fishingData,
    loading: fishingLoading,
    error: fishingError,
  } = useFishingData({
    mpaId: mpa?.id || '',
    geometry: mpa?.geometry || undefined,
    bounds: mpa?.bounds || undefined,
    protectionLevel: mpa?.protectionLevel,
    establishedYear: mpa?.establishedYear,
    enabled: !!mpa,
  });

  // Load marine heatwave alert from Copernicus data
  const {
    alert: heatwaveAlert,
    isLoading: heatwaveLoading,
  } = useHeatwaveAlert(
    mpa?.id,
    mpa?.center[0],
    mpa?.center[1],
    !!mpa
  );

  // Extract fishing data for easier access
  const fishingEffort = fishingData.fishingEffort;
  const vesselActivity = fishingData.vesselActivity;
  const complianceScore = fishingData.compliance;
  const iuuRisk = fishingData.iuuRisk;

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
    fishingCompliance: complianceScore,
    fishingComplianceLoading: fishingLoading,
    heatwaveAlert: heatwaveAlert,
    heatwaveLoading: heatwaveLoading,
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
      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-4">
            <div className="h-10 w-32 bg-balean-gray-200 animate-pulse rounded" />
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
      <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
        <div className="max-w-screen-xl mx-auto">
          <Card>
            <CardTitle>Error</CardTitle>
            <CardContent>
              <p className="text-balean-gray-500 mb-4">
                {error || 'MPA not found'}
              </p>
              <Button onClick={() => router.push('/')} variant="secondary">
                <Icon name="angle-left" size="sm" /> Back to Home
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
      <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-4 sm:px-6">
        <div className="max-w-screen-xl mx-auto">
          {/* Save button */}
          <div className="flex justify-end mb-4">
            <SaveMPAButton mpaId={mpa.id} mpaDbId={mpa.dbId} variant="icon" size="md" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Mobile: Stack vertically, Desktop: Side by side */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">{mpa.name}</h1>
              </div>

              {compositeHealth.loading && compositeHealth.score === 0 ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 self-center sm:self-start">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-white/30 border-t-white" />
                </div>
              ) : (
                <div className="flex-shrink-0 self-center sm:self-start">
                  <CircularProgress
                    value={compositeHealth.score}
                    size="lg"
                    color={getHealthColor(compositeHealth.score)}
                  />
                </div>
              )}
            </div>

            <p className="text-white/80 flex items-center justify-center gap-2 text-2xl sm:text-3xl mb-6">
              <Icon name="marker" size="sm" />
              {getCountryName(mpa.country)} • Est. {mpa.establishedYear}
            </p>

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
              {heatwaveAlert && heatwaveAlert.active && (
                <HeatwaveAlertBadge alert={heatwaveAlert} />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 -mt-10">
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
            onClick={() => setShowHealthModal(true)}
          >
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-balean-cyan to-balean-cyan-dark mx-auto mb-2 flex items-center justify-center">
                <Icon name="heart-rate" className="text-white text-xl" />
              </div>
              {compositeHealth.loading && compositeHealth.score === 0 ? (
                <>
                  <div className="h-9 flex items-center justify-center">
                    <div className="animate-pulse bg-balean-gray-200 rounded w-12 h-8" />
                  </div>
                  <p className="text-xs text-balean-gray-400 mt-1">Calculating...</p>
                  <p className="text-xs text-balean-cyan mt-1 flex items-center justify-center gap-1">
                    <Icon name="info" size="sm" />
                    Tap for details
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-balean-navy">{compositeHealth.score}</p>
                  <p className="text-xs text-balean-gray-400 mt-1 flex items-center justify-center gap-1">
                    Estimated Health
                    <InfoTip text="A composite score (0-100) derived from species population trends, habitat quality, and environmental data. Higher scores indicate healthier ecosystems." />
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    compositeHealth.confidence === 'high' ? 'text-green-500' :
                    compositeHealth.confidence === 'medium' ? 'text-yellow-500' :
                    'text-orange-500'
                  }`}>
                    {compositeHealth.confidence === 'high' ? 'High' :
                     compositeHealth.confidence === 'medium' ? 'Medium' : 'Low'} confidence
                  </p>
                  <p className="text-xs text-balean-gray-300">
                    {compositeHealth.dataSourcesAvailable}/{
                      Object.keys(compositeHealth.breakdown).length
                    } sources
                    {compositeHealth.backendAvailable && (
                      <span className="ml-1 text-healthy" title="Using Copernicus satellite data">*</span>
                    )}
                  </p>
                  <p className="text-xs text-balean-cyan mt-1 flex items-center justify-center gap-1">
                    <Icon name="info" size="sm" />
                    Tap for details
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-balean-coral to-balean-coral-dark mx-auto mb-2 flex items-center justify-center">
                <Icon name="fish" className="text-white text-xl" />
              </div>
              <p className="text-3xl font-bold text-balean-navy">
                {mpa.speciesCount.toLocaleString()}
              </p>
              <p className="text-xs text-balean-gray-400 mt-1">Species</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-healthy to-healthy-light mx-auto mb-2 flex items-center justify-center">
                <Icon name="map" className="text-white text-xl" />
              </div>
              <p className="text-3xl font-bold text-balean-navy">{formatArea(mpa.area)}</p>
              <p className="text-xs text-balean-gray-400 mt-1">Area</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-balean-yellow to-balean-yellow-dark mx-auto mb-2 flex items-center justify-center">
                <Icon name="calendar" className="text-balean-navy text-xl" />
              </div>
              <p className="text-3xl font-bold text-balean-navy">{mpa.establishedYear}</p>
              <p className="text-xs text-balean-gray-400 mt-1">Established</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Description */}
        {mpa.description && (
          <CollapsibleCard
            title="About this MPA"
            icon="info-circle"
            iconColor="text-balean-cyan"
            defaultOpen={true}
            className="mb-4"
          >
            <p className="text-balean-gray-500 leading-relaxed">{mpa.description}</p>
          </CollapsibleCard>
        )}

        {/* Regulations */}
        {mpa.regulations && (
          <CollapsibleCard
            title="Protection & Regulations"
            icon="shield-check"
            iconColor="text-info"
            defaultOpen={false}
            className="mb-4"
          >
            <div className="bg-info/10 border-l-4 border-info p-4 rounded">
              <p className="text-balean-gray-500 leading-relaxed">{mpa.regulations}</p>
            </div>
          </CollapsibleCard>
        )}

        {/* Location Card */}
        <CollapsibleCard
          title="Location"
          icon="map-marker"
          iconColor="text-healthy"
          defaultOpen={false}
          className="mb-4"
        >
          <div className="space-y-2">
            <div>
              <span className="font-semibold text-balean-gray-500">Center: </span>
              <span className="text-balean-gray-400">
                {mpa.center[0].toFixed(4)}°, {mpa.center[1].toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="font-semibold text-balean-gray-500">Country: </span>
              <span className="text-balean-gray-400">{getCountryName(mpa.country)}</span>
            </div>
          </div>
          <div className="mt-4">
            <Link href={`/ocean-pulse-app?lat=${mpa.center[0]}&lng=${mpa.center[1]}&zoom=6&mpa=${mpa.id}`}>
              <Button fullWidth>View on Map</Button>
            </Link>
          </div>
        </CollapsibleCard>

        {/* Live Reports Section */}
        <CollapsibleCard
          title="Live Reports"
          icon="camera"
          iconColor="text-balean-cyan"
          defaultOpen={false}
          badge={
            mpaObservations.length > 0 && (
              <Badge variant="info" size="sm">{mpaObservations.length} reports</Badge>
            )
          }
          className="mb-4"
        >
          <LiveReports mpaId={mpa.id} maxHeight={500} />
        </CollapsibleCard>

        {/* Indicator Species */}
        <CollapsibleCard
          title="Indicator Species"
          icon="leaf"
          iconColor="text-healthy"
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-healthy mb-4" />
              <p className="text-balean-gray-500">Loading indicator species...</p>
            </div>
          ) : indicatorSpecies.length > 0 ? (
            <>
              <p className="text-balean-gray-500 mb-4">
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
                    href={`/ocean-pulse-app/indicator-species/${sp.id}`}
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
              <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="leaf" className="text-balean-gray-300 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">No indicator species identified</p>
              <p className="text-sm text-balean-gray-400 mb-4">
                No indicator species match this MPA's ecosystem type
              </p>
              <Link href="/ocean-pulse-app/indicator-species">
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
          iconColor="text-balean-coral"
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
              <p className="text-balean-gray-500 mb-2">Analyzing indicator species abundance data...</p>
              <p className="text-sm text-balean-gray-400 mb-4">
                Filtering for ecosystem-relevant indicator species
              </p>
              <div className="mt-4 w-full bg-balean-gray-200 rounded-full h-2 max-w-md mx-auto">
                <motion.div
                  className="bg-gradient-to-r from-balean-cyan to-balean-cyan-light h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${abundanceProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : abundanceSummary && abundanceSummary.speciesTrends.length > 0 ? (
            <>
              {/* Overall indicator species health summary */}
              <div className="mb-6 p-4 bg-gradient-to-br from-balean-cyan/10 to-balean-cyan-light/10 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-balean-gray-500 mb-1">Estimated Species Health</p>
                    <p className="text-3xl font-bold text-balean-navy">
                      {abundanceSummary.overallBiodiversity.healthScore}
                      <span className="text-lg text-balean-gray-400">/100</span>
                    </p>
                    <p className="text-xs text-balean-gray-400 mt-1">
                      Based on {abundanceSummary.speciesTrends.length} indicator species from available data
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    abundanceSummary.overallBiodiversity.trendDirection === 'increasing'
                      ? 'bg-healthy/10 text-healthy'
                      : abundanceSummary.overallBiodiversity.trendDirection === 'stable'
                      ? 'bg-info/10 text-info'
                      : 'bg-warning/10 text-warning'
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
              <div className="mb-4 p-3 bg-healthy/10 border-l-4 border-healthy rounded">
                <div className="flex items-start gap-2">
                  <Icon name="leaf" size="sm" className="text-healthy mt-0.5" />
                  <div className="text-sm text-balean-gray-500">
                    <p className="font-medium mb-1">Indicator Species Data</p>
                    <p className="text-xs text-balean-gray-400">
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
              <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="chart-line" className="text-balean-gray-300 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">No indicator species abundance data</p>
              <p className="text-sm text-balean-gray-400">
                No abundance records found for indicator species in this MPA
              </p>
            </div>
          )}
        </CollapsibleCard>

        {/* Habitat Quality (Environmental Data) */}
        <CollapsibleCard
          title="Habitat Quality"
          icon="flask"
          iconColor="text-balean-cyan"
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
              <p className="text-balean-gray-500 mb-2">Analyzing environmental conditions...</p>
              <p className="text-sm text-balean-gray-400 mb-4">
                Temperature, salinity, pH, and more
              </p>
              <div className="mt-4 w-full bg-balean-gray-200 rounded-full h-2 max-w-md mx-auto">
                <motion.div
                  className="bg-gradient-to-r from-balean-cyan to-balean-cyan-light h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${environmentalProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : environmentalSummary && environmentalSummary.parameters.length > 0 ? (
            <>
              {/* Habitat quality score */}
              <div className="mb-6 p-4 bg-gradient-to-br from-balean-cyan/10 to-balean-cyan-light/10 rounded-xl border border-balean-cyan/20">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-balean-gray-500 mb-1">Estimated Habitat Quality</p>
                    <p className="text-3xl font-bold text-balean-navy">
                      {environmentalSummary.habitatQualityScore}
                      <span className="text-lg text-balean-gray-400">/100</span>
                    </p>
                    <p className="text-xs text-balean-gray-400 mt-1">
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
                        environmentalSummary.habitatQualityScore >= 80 ? 'text-healthy' :
                        environmentalSummary.habitatQualityScore >= 60 ? 'text-warning' :
                        'text-critical'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Data quality indicator */}
              <div className="mb-4 p-3 bg-info/10 border-l-4 border-info rounded">
                <div className="flex items-start gap-2">
                  <Icon name="info" size="sm" className="text-info mt-0.5" />
                  <div className="text-sm text-balean-gray-500">
                    <p className="font-medium mb-1">Environmental Monitoring Data</p>
                    <p className="text-xs text-balean-gray-400">
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
              <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="flask" className="text-balean-gray-300 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">No environmental data available</p>
              <p className="text-sm text-balean-gray-400">
                This MPA may not have environmental measurements in the OBIS database yet
              </p>
            </div>
          )}
        </CollapsibleCard>

        {/* Marine Heatwave Alert */}
        <CollapsibleCard
          title="Marine Heatwave Status"
          icon="temperature-hot"
          iconColor={heatwaveAlert?.active ? 'text-red-500' : 'text-balean-cyan'}
          defaultOpen={heatwaveAlert?.active || false}
          badge={
            heatwaveAlert && (
              <Badge
                variant={
                  heatwaveAlert.category === 'none' ? 'healthy' :
                  heatwaveAlert.category === 'moderate' ? 'warning' :
                  'danger'
                }
                size="sm"
              >
                {heatwaveAlert.active ? heatwaveAlert.category : 'Normal'}
              </Badge>
            )
          }
          className="mb-4"
        >
          {heatwaveLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
              <p className="text-balean-gray-500 mb-2">Checking thermal conditions...</p>
              <p className="text-sm text-balean-gray-400">
                Analyzing sea surface temperature data
              </p>
            </div>
          ) : heatwaveAlert ? (
            <HeatwaveAlert alert={heatwaveAlert} />
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="temperature-half" className="text-balean-gray-300 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">Heatwave data unavailable</p>
              <p className="text-sm text-balean-gray-400">
                Unable to fetch thermal conditions from Copernicus Marine Service
              </p>
            </div>
          )}
        </CollapsibleCard>

        {/* Satellite Tracking Data from Movebank */}
        <CollapsibleCard
          title="Satellite Tracking"
          icon="satellite"
          iconColor="text-balean-coral"
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
              <p className="text-balean-gray-500 mb-2">Searching Movebank for tracking data...</p>
              <p className="text-sm text-balean-gray-400 mb-4">
                Finding GPS/satellite telemetry studies near this MPA
              </p>
              <div className="mt-4 w-full bg-balean-gray-200 rounded-full h-2 max-w-md mx-auto">
                <motion.div
                  className="bg-gradient-to-r from-balean-cyan to-balean-cyan-light h-2 rounded-full"
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
              <div className="mb-4 p-3 bg-info/10 border-l-4 border-info rounded">
                <div className="flex items-start gap-2">
                  <Icon name="satellite" size="sm" className="text-info mt-0.5" />
                  <div className="text-sm text-balean-gray-500">
                    <p className="font-medium mb-1">Real Telemetry Data from Movebank</p>
                    <p className="text-xs text-balean-gray-400">
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
              <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="satellite" className="text-balean-gray-300 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">No satellite tracking data available</p>
              <p className="text-sm text-balean-gray-400">
                No GPS/satellite telemetry studies found for marine species in this area on Movebank
              </p>
            </div>
          )}
        </CollapsibleCard>

        {/* Fishing Activity - Global Fishing Watch Data */}
        <CollapsibleCard
          title="Fishing Activity"
          icon="ship"
          iconColor="text-balean-cyan"
          defaultOpen={false}
          badge={
            <div className="flex items-center gap-2">
              {iuuRisk && <IUURiskBadge riskData={iuuRisk} size="sm" showTooltip={false} />}
              {complianceScore && (
                <Badge
                  variant={complianceScore.score >= 80 ? 'healthy' : complianceScore.score >= 60 ? 'warning' : 'danger'}
                  size="sm"
                >
                  {complianceScore.score}/100
                </Badge>
              )}
            </div>
          }
          className="mb-4"
        >
          {fishingLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
              <p className="text-balean-gray-500 mb-2">Analyzing fishing activity...</p>
              <p className="text-sm text-balean-gray-400">
                Data from Global Fishing Watch
              </p>
            </div>
          ) : fishingError ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-amber-50 mx-auto mb-4 flex items-center justify-center">
                <Icon name="info" className="text-amber-500 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">Fishing data unavailable</p>
              <p className="text-sm text-balean-gray-400 max-w-md mx-auto">
                {fishingError.message.includes('not configured')
                  ? 'Global Fishing Watch API is not configured. Contact the administrator to enable this feature.'
                  : fishingError.message.includes('authentication') || fishingError.message.includes('401')
                    ? 'Global Fishing Watch API token may be expired or invalid.'
                    : 'Unable to fetch fishing data. The API may be temporarily unavailable.'}
              </p>
              <p className="text-xs text-balean-gray-300 mt-2">
                Error: {fishingError.message}
              </p>
            </div>
          ) : fishingEffort || vesselActivity?.length || complianceScore || iuuRisk ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {fishingEffort && (
                  <>
                    <div className="bg-balean-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-balean-navy">
                        {fishingEffort.totalFishingHours >= 1000
                          ? `${(fishingEffort.totalFishingHours / 1000).toFixed(1)}K`
                          : Math.round(fishingEffort.totalFishingHours)}
                      </p>
                      <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">
                        Fishing Hours
                        <InfoTip text="Total hours of detected fishing activity within this MPA over the past 12 months. Data from Global Fishing Watch using AIS (Automatic Identification System) vessel tracking. AIS coverage may vary; some vessels disable transponders or operate without AIS." />
                      </p>
                    </div>
                    <div className="bg-balean-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-balean-navy">
                        {fishingEffort.totalVessels}
                      </p>
                      <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">
                        Vessels
                        <InfoTip text="Unique fishing vessels detected in this MPA over the past 12 months. Identified by their AIS transponders via Global Fishing Watch satellite tracking. Small-scale or artisanal vessels without AIS may not be counted." />
                      </p>
                    </div>
                  </>
                )}
                {complianceScore && (
                  <div className={`rounded-xl p-3 text-center ${
                    complianceScore.score >= 80 ? 'bg-green-50' :
                    complianceScore.score >= 60 ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      complianceScore.score >= 80 ? 'text-green-700' :
                      complianceScore.score >= 60 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {complianceScore.score}
                    </p>
                    <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">
                      Compliance
                      <InfoTip text={`Estimated compliance score (0-100) based on fishing activity relative to this MPA's protection level (${mpa.protectionLevel}). Higher scores indicate less fishing activity. For no-take zones, any fishing reduces the score. This is a simplified estimate; actual compliance depends on specific regulations and permitted activities.`} />
                    </p>
                  </div>
                )}
                {iuuRisk && (
                  <div className={`rounded-xl p-3 text-center ${
                    iuuRisk.riskLevel === 'low' ? 'bg-green-50' :
                    iuuRisk.riskLevel === 'moderate' ? 'bg-amber-50' :
                    iuuRisk.riskLevel === 'high' ? 'bg-orange-50' : 'bg-red-50'
                  }`}>
                    <p className={`text-2xl font-bold capitalize ${
                      iuuRisk.riskLevel === 'low' ? 'text-green-700' :
                      iuuRisk.riskLevel === 'moderate' ? 'text-amber-700' :
                      iuuRisk.riskLevel === 'high' ? 'text-orange-700' : 'text-red-700'
                    }`}>
                      {iuuRisk.riskLevel}
                    </p>
                    <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">
                      IUU Risk
                      <InfoTip text="Illegal, Unreported, and Unregulated (IUU) fishing risk estimate based on fishing intensity and vessel diversity patterns. Factors include: total fishing hours, number of flag states present, and vessel count. This is an indicative assessment; confirmed IUU activity requires investigation by authorities." />
                    </p>
                  </div>
                )}
              </div>

              {/* Fishing Trends Chart */}
              {fishingEffort && (
                <div className="mb-6">
                  <FishingTrendChart data={fishingEffort} />
                </div>
              )}

              {/* Breakdown Charts */}
              {fishingEffort && (fishingEffort.byFlag?.length > 0 || fishingEffort.byGearType?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {fishingEffort.byFlag && fishingEffort.byFlag.length > 0 && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <h4 className="font-semibold text-balean-navy mb-3 flex items-center gap-2">
                        <Icon name="flag" size="sm" className="text-balean-cyan" />
                        By Flag State
                      </h4>
                      <FishingByFlagChart data={fishingEffort.byFlag} />
                    </div>
                  )}
                  {fishingEffort.byGearType && fishingEffort.byGearType.length > 0 && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <h4 className="font-semibold text-balean-navy mb-3 flex items-center gap-2">
                        <Icon name="anchor" size="sm" className="text-balean-coral" />
                        By Gear Type
                      </h4>
                      <FishingByGearChart data={fishingEffort.byGearType} />
                    </div>
                  )}
                </div>
              )}

              {/* Vessel Activity Feed */}
              {vesselActivity && vesselActivity.length > 0 && (
                <div className="mb-4">
                  <VesselActivityFeed events={vesselActivity} maxItems={10} />
                </div>
              )}

              {/* Data attribution */}
              <div className="p-3 bg-balean-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon name="info" size="sm" className="text-balean-gray-400 mt-0.5" />
                  <div className="text-xs text-balean-gray-400">
                    <p>Data from <strong>Global Fishing Watch</strong> (globalfishingwatch.org)</p>
                    <p className="mt-1">
                      Global Fishing Watch uses satellite data to track commercial fishing activity worldwide.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Icon name="ship" className="text-balean-gray-300 text-3xl" />
              </div>
              <p className="text-balean-gray-500 mb-2 font-medium">No fishing activity data</p>
              <p className="text-sm text-balean-gray-400">
                Global Fishing Watch data is not available for this MPA
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
