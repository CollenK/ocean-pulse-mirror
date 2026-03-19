'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MPA } from '@/types';
import { fetchMPAById } from '@/lib/mpa-service';
import { cacheMPA, getCachedMPA } from '@/lib/offline-storage';
import { Card, CardTitle, CardContent, CollapsibleCard, Button, Badge, Icon } from '@/components/ui';
import { MPACardSkeleton } from '@/components/ui';
import Link from 'next/link';
import { useAbundanceData } from '@/hooks/useAbundanceData';
import { useEnvironmentalData } from '@/hooks/useEnvironmentalData';
import { useHybridHealthScore } from '@/hooks/useHybridHealthScore';
import { HealthScoreModal } from '@/components/HealthScoreModal';
import { getIndicatorSpeciesForMPA } from '@/lib/indicator-species';
import type { IndicatorSpecies } from '@/types/indicator-species';
import { LiveReports } from '@/components/LiveReports';
import { useObservations } from '@/hooks/useObservations';
import { getCountryName } from '@/lib/country-names';
import { useFishingData } from '@/hooks/useFishingData';
import { useHeatwaveAlert } from '@/hooks/useHeatwaveAlert';
import { IUURiskBadge } from '@/components/ui/IUURiskBadge';
import { HeatwaveAlert } from '@/components/HeatwaveAlert';
import { useWindFarmConflictsForMPA } from '@/hooks/useWindFarmData';
import { WindFarmConflictCard } from '@/components/WindFarmConflictCard';
import { useCoastalConditions } from '@/hooks/useCoastalConditions';
import { useLitterAnalytics } from '@/hooks/useLitterAnalytics';
import { MPAHeroHeader } from './MPAHeroHeader';
import { MPAStatsGrid } from './MPAStatsGrid';
import { MPAFishingSection } from './MPAFishingSection';
import { MPALitterSection } from './MPALitterSection';
import { MPACoastalSection } from './MPACoastalSection';
import { MPAIndicatorSpeciesSection } from './MPAIndicatorSpeciesSection';
import { MPAPopulationTrendsSection } from './MPAPopulationTrendsSection';
import { MPAHabitatQualitySection } from './MPAHabitatQualitySection';
import type { MarineHeatwaveAlert } from '@/hooks/useHeatwaveAlert';
import type { LitterAnalytics } from '@/lib/litter-analytics-service';

function MPAHeatwaveSection({ alert, loading }: { alert: MarineHeatwaveAlert | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
        <p className="text-balean-gray-500 mb-2">Checking thermal conditions...</p>
      </div>
    );
  }
  if (alert) return <HeatwaveAlert alert={alert} />;
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center"><Icon name="temperature-half" className="text-balean-gray-300 text-3xl" /></div>
      <p className="text-balean-gray-500 mb-2 font-medium">Heatwave data unavailable</p>
      <p className="text-sm text-balean-gray-400">Unable to fetch thermal conditions from Copernicus Marine Service</p>
    </div>
  );
}

function getLitterBadge(analytics: LitterAnalytics | null) {
  if (!analytics) return null;
  if (analytics.cleanlinessRating) {
    const variantMap = { clean: 'healthy' as const, moderate: 'warning' as const, dirty: 'danger' as const, very_dirty: 'danger' as const };
    const labelMap = { clean: 'Clean', moderate: 'Moderate', dirty: 'Dirty', very_dirty: 'Very Dirty' };
    return <Badge variant={variantMap[analytics.cleanlinessRating] || 'danger'} size="sm">{labelMap[analytics.cleanlinessRating] || analytics.cleanlinessRating}</Badge>;
  }
  return <Badge variant="info" size="sm">{analytics.totalReports} report{analytics.totalReports !== 1 ? 's' : ''}</Badge>;
}

function getHeatwaveBadge(alert: MarineHeatwaveAlert | null) {
  if (!alert) return undefined;
  const variant = alert.category === 'none' ? 'healthy' as const : alert.category === 'moderate' ? 'warning' as const : 'danger' as const;
  return <Badge variant={variant} size="sm">{alert.active ? alert.category : 'Normal'}</Badge>;
}

function getFishingBadge(iuuRisk: ReturnType<typeof useFishingData>['data']['iuuRisk'], complianceScore: ReturnType<typeof useFishingData>['data']['compliance']) {
  const compVariant = complianceScore ? (complianceScore.score >= 80 ? 'healthy' as const : complianceScore.score >= 60 ? 'warning' as const : 'danger' as const) : null;
  return (
    <div className="flex items-center gap-2">
      {iuuRisk && <IUURiskBadge riskData={iuuRisk} size="sm" showTooltip={false} />}
      {complianceScore && compVariant && <Badge variant={compVariant} size="sm">{complianceScore.score}/100</Badge>}
    </div>
  );
}

function getWindFarmBadge(hasConflicts: boolean, count: number) {
  if (hasConflicts) return <Badge variant="danger" size="sm">{count} Conflict{count !== 1 ? 's' : ''}</Badge>;
  return <Badge variant="healthy" size="sm">Clear</Badge>;
}

function useMPALoader(id: string) {
  const [mpa, setMpa] = useState<MPA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    getCachedMPA(id).then((d) => { if (d) { setMpa(d); setCached(true); setLoading(false); } }).catch(() => {});
    fetchMPAById(id)
      .then(async (d) => { if (d) { setMpa(d); await cacheMPA(d); setCached(true); } else { setError('MPA not found'); } })
      .catch(() => setError('Failed to load MPA'))
      .finally(() => setLoading(false));
  }, [id]);

  return { mpa, loading, error, cached };
}

function MPADetailContent({ mpa, cached }: { mpa: MPA; cached: boolean }) {
  const [indicatorSpecies, setIndicatorSpecies] = useState<IndicatorSpecies[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const { observations: mpaObservations } = useObservations(mpa.id, { enabled: true });
  const abundanceRadius = useMemo(() => Math.min(Math.max(Math.round(Math.sqrt((mpa.area || 0) / Math.PI)), 50), 300), [mpa.area]);

  const { summary: abundanceSummary, loading: abundanceLoading, progress: abundanceProgress } = useAbundanceData(
    mpa.id, mpa.center, abundanceRadius,
    { latitude: mpa.center[0], longitude: mpa.center[1], name: mpa.name, description: mpa.description }
  );
  const { summary: environmentalSummary, loading: environmentalLoading, progress: environmentalProgress } = useEnvironmentalData(mpa.id, mpa.center, 50);
  const { data: fishingData, loading: fishingLoading, error: fishingError } = useFishingData({
    mpaId: mpa.id, geometry: mpa.geometry || undefined, bounds: mpa.bounds || undefined,
    protectionLevel: mpa.protectionLevel, establishedYear: mpa.establishedYear, enabled: true,
  });
  const { alert: heatwaveAlert, isLoading: heatwaveLoading } = useHeatwaveAlert(mpa.id, mpa.center[0], mpa.center[1], true);
  const { conflicts: windFarmConflicts, nearbyWindFarms, isLoading: windFarmsLoading, hasConflicts: hasWindFarmConflicts } = useWindFarmConflictsForMPA(mpa.id, [mpa], true);
  const { conditions: coastalConditions, loading: coastalLoading, error: coastalError, isStale: coastalStale, refetch: refetchCoastal } = useCoastalConditions(mpa.id, mpa.center[0], mpa.center[1], true);
  const { analytics: litterAnalytics, loading: litterLoading } = useLitterAnalytics(mpa.id, true);

  const compositeHealth = useHybridHealthScore({
    mpaId: mpa.id, mpaName: mpa.name, lat: mpa.center[0], lon: mpa.center[1],
    abundanceSummary, abundanceLoading, environmentalSummary, environmentalLoading,
    indicatorSpeciesCount: indicatorSpecies.length, preferBackend: true,
    fishingCompliance: fishingData.compliance, fishingComplianceLoading: fishingLoading,
    heatwaveAlert, heatwaveLoading,
    litterPressureScore: litterAnalytics?.pressureScore ?? null, litterPressureLoading: litterLoading,
  });

  useEffect(() => {
    setSpeciesLoading(true);
    getIndicatorSpeciesForMPA({ latitude: mpa.center[0], longitude: mpa.center[1], name: mpa.name, description: mpa.description })
      .then(setIndicatorSpecies).finally(() => setSpeciesLoading(false));
  }, [mpa]);

  return (
    <main className="min-h-screen pb-32">
      <MPAHeroHeader mpa={mpa} cached={cached} compositeHealth={compositeHealth} heatwaveAlert={heatwaveAlert} />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 -mt-10">
        <MPAStatsGrid mpa={mpa} compositeHealth={compositeHealth} onHealthClick={() => setShowHealthModal(true)} />
        {mpa.description && <CollapsibleCard title="About this MPA" icon="info-circle" iconColor="text-balean-cyan" defaultOpen={true} className="mb-4"><p className="text-balean-gray-500 leading-relaxed">{mpa.description}</p></CollapsibleCard>}
        <MPACoastalSection coastalConditions={coastalConditions} coastalLoading={coastalLoading} coastalError={coastalError} coastalStale={coastalStale} refetchCoastal={refetchCoastal} mpaObservations={mpaObservations} />
        {mpa.regulations && <CollapsibleCard title="Protection & Regulations" icon="shield-check" iconColor="text-info" defaultOpen={false} className="mb-4"><div className="bg-info/10 border-l-4 border-info p-4 rounded"><p className="text-balean-gray-500 leading-relaxed">{mpa.regulations}</p></div></CollapsibleCard>}
        <CollapsibleCard title="Location" icon="map-marker" iconColor="text-healthy" defaultOpen={false} className="mb-4">
          <div className="space-y-2">
            <div><span className="font-semibold text-balean-gray-500">Center: </span><span className="text-balean-gray-400">{mpa.center[0].toFixed(4)}&deg;, {mpa.center[1].toFixed(4)}&deg;</span></div>
            <div><span className="font-semibold text-balean-gray-500">Country: </span><span className="text-balean-gray-400">{getCountryName(mpa.country)}</span></div>
          </div>
          <div className="mt-4"><Link href={`/ocean-pulse-app?lat=${mpa.center[0]}&lng=${mpa.center[1]}&zoom=6&mpa=${mpa.id}`}><Button fullWidth>View on Map</Button></Link></div>
        </CollapsibleCard>
        <CollapsibleCard title="Live Reports" icon="camera" iconColor="text-balean-cyan" defaultOpen={false} badge={mpaObservations.length > 0 && <Badge variant="info" size="sm">{mpaObservations.length} reports</Badge>} className="mb-4"><LiveReports mpaId={mpa.id} maxHeight={500} /></CollapsibleCard>
        <MPAIndicatorSpeciesSection speciesLoading={speciesLoading} indicatorSpecies={indicatorSpecies} showAllSpecies={showAllSpecies} onToggleShowAll={() => setShowAllSpecies(!showAllSpecies)} />
        <MPAPopulationTrendsSection abundanceLoading={abundanceLoading} abundanceProgress={abundanceProgress} abundanceSummary={abundanceSummary} showAllTrends={showAllTrends} onToggleShowAll={() => setShowAllTrends(!showAllTrends)} />
        <MPAHabitatQualitySection environmentalLoading={environmentalLoading} environmentalProgress={environmentalProgress} environmentalSummary={environmentalSummary} />
        <CollapsibleCard title="Marine Heatwave Status" icon="temperature-hot" iconColor={heatwaveAlert?.active ? 'text-red-500' : 'text-balean-cyan'} defaultOpen={heatwaveAlert?.active || false} badge={getHeatwaveBadge(heatwaveAlert)} className="mb-4"><MPAHeatwaveSection alert={heatwaveAlert} loading={heatwaveLoading} /></CollapsibleCard>
        <CollapsibleCard title="Marine Litter" icon="trash" iconColor="text-teal-600" defaultOpen={!!litterAnalytics && litterAnalytics.totalReports > 0} badge={getLitterBadge(litterAnalytics)} className="mb-4"><MPALitterSection litterLoading={litterLoading} litterAnalytics={litterAnalytics} /></CollapsibleCard>
        <CollapsibleCard title="Fishing Activity" icon="ship" iconColor="text-balean-cyan" defaultOpen={false} badge={getFishingBadge(fishingData.iuuRisk, fishingData.compliance)} className="mb-4"><MPAFishingSection fishingLoading={fishingLoading} fishingError={fishingError} fishingEffort={fishingData.fishingEffort} vesselActivity={fishingData.vesselActivity} complianceScore={fishingData.compliance} iuuRisk={fishingData.iuuRisk} protectionLevel={mpa.protectionLevel} /></CollapsibleCard>
        <CollapsibleCard title="Offshore Wind Farms" icon="wind" iconColor="text-orange-500" defaultOpen={hasWindFarmConflicts} badge={getWindFarmBadge(hasWindFarmConflicts, windFarmConflicts.length)} className="mb-4"><WindFarmConflictCard conflicts={windFarmConflicts} nearbyWindFarms={nearbyWindFarms} isLoading={windFarmsLoading} /></CollapsibleCard>
      </div>
      <HealthScoreModal isOpen={showHealthModal} onClose={() => setShowHealthModal(false)} healthData={compositeHealth} />
    </main>
  );
}

function MPALoadingSkeleton() {
  return (
    <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-4"><div className="h-10 w-32 bg-balean-gray-200 animate-pulse rounded" /></div>
        <MPACardSkeleton /><div className="mt-4"><MPACardSkeleton /></div>
      </div>
    </main>
  );
}

function MPAErrorView({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <main className="min-h-screen p-6 pb-24 bg-balean-off-white">
      <div className="max-w-screen-xl mx-auto">
        <Card><CardTitle>Error</CardTitle>
          <CardContent>
            <p className="text-balean-gray-500 mb-4">{error}</p>
            <Button onClick={onBack} variant="secondary"><Icon name="angle-left" size="sm" /> Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function MPADetailPage() {
  const params = useParams();
  const router = useRouter();
  const { mpa, loading, error, cached } = useMPALoader(params.id as string);

  if (loading) return <MPALoadingSkeleton />;
  if (error || !mpa) return <MPAErrorView error={error || 'MPA not found'} onBack={() => router.push('/')} />;
  return <MPADetailContent mpa={mpa} cached={cached} />;
}
