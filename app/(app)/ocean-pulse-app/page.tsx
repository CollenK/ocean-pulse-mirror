'use client';

import { Button, Card, CardTitle, CardContent, Badge } from '@/components/ui';
import { CircularProgress, getHealthColor } from '@/components/CircularProgress';
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MPA } from '@/types';
import { fetchAllMPAs, fetchMPAGeometries } from '@/lib/mpa-service';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh';
import { useSavedMPAs } from '@/hooks/useSavedMPAs';
import dynamic from 'next/dynamic';
import { MapFilterPanel, MapFilters, DEFAULT_FILTERS, filterMPAs } from '@/components/Map/MapFilterPanel';

// Dynamically import map component (no SSR due to Leaflet)
const MobileMap = dynamic(
  () => import('@/components/Map/MobileMap').then((mod) => mod.MobileMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-balean-navy">
        <div className="text-center text-white">
          <i className="fi fi-rr-map text-4xl mb-4 animate-pulse" />
          <p className="text-white/60">Loading map...</p>
        </div>
      </div>
    ),
  }
);

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// Quick action items
const quickActions = [
  {
    href: null, // Map is handled differently
    icon: 'fi-rr-map',
    label: 'Map',
    description: 'Explore MPAs',
    color: 'bg-balean-cyan',
    textColor: 'text-balean-cyan',
    bgLight: 'bg-balean-cyan/10',
  },
  {
    href: '/ocean-pulse-app/nearby',
    icon: 'fi-rr-marker',
    label: 'Nearby',
    description: 'Find MPAs',
    color: 'bg-healthy',
    textColor: 'text-healthy',
    bgLight: 'bg-healthy/10',
  },
  {
    href: '/ocean-pulse-app/species',
    icon: 'fi-rr-fish',
    label: 'Species',
    description: '15K+ tracked',
    color: 'bg-balean-coral',
    textColor: 'text-balean-coral',
    bgLight: 'bg-balean-coral/10',
  },
  {
    href: '/ocean-pulse-app/observe',
    icon: 'fi-rr-camera',
    label: 'Observe',
    description: 'Add sighting',
    color: 'bg-balean-yellow',
    textColor: 'text-balean-yellow-dark',
    bgLight: 'bg-balean-yellow/20',
  },
];

function HomeContent() {
  const [mpas, setMpas] = useState<MPA[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const { savedMPAIds } = useSavedMPAs();
  const searchParams = useSearchParams();

  // Check for map navigation params from MPA detail page
  const mapLat = searchParams.get('lat');
  const mapLng = searchParams.get('lng');
  const mapZoom = searchParams.get('zoom');
  const focusMpaId = searchParams.get('mpa');

  // Filter MPAs based on current filters
  const filteredMpas = useMemo(() => filterMPAs(mpas, filters, savedMPAIds), [mpas, filters, savedMPAIds]);

  const loadMPAs = useCallback(async () => {
    setLoading(true);
    try {
      // First fetch MPA metadata
      const data = await fetchAllMPAs();

      // Then fetch geometries for these specific MPAs
      const externalIds = data.map((mpa) => mpa.id);
      const geometries = await fetchMPAGeometries(externalIds);

      // Debug
      const matches = data.filter(mpa => geometries.has(mpa.id)).length;
      console.log(`PAGE DEBUG - MPAs: ${data.length}, Geometries: ${geometries.size}, Matches: ${matches}`);

      // Merge geometries into MPAs
      const mpasWithGeometry = data.map((mpa) => ({
        ...mpa,
        geometry: geometries.get(mpa.id) || mpa.geometry,
      }));

      setMpas(mpasWithGeometry);
    } catch (error) {
      alert('Error: ' + String(error));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMPAs();
  }, [loadMPAs]);

  // Auto-show map if navigation params are present
  useEffect(() => {
    if (mapLat && mapLng) {
      setShowMap(true);
    }
  }, [mapLat, mapLng]);

  // Pull to refresh
  const { containerRef, pullDistance, refreshing, canRefresh } = usePullToRefresh({
    onRefresh: loadMPAs,
    enabled: !showMap,
  });

  // Map view
  if (showMap) {
    const center = mapLat && mapLng
      ? [parseFloat(mapLat), parseFloat(mapLng)] as [number, number]
      : undefined;
    const zoom = mapZoom ? parseFloat(mapZoom) : undefined;

    // Count active filters for badge
    const activeFilterCount = Object.values(filters).flat().length;

    return (
      <main id="main-content" className="overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Map Container - fills remaining height below shared AppHeader */}
        <div className="relative h-full">
          {/* Top toolbar for filters */}
          <div className={`absolute top-4 z-[1001] transition-all duration-300 flex items-center gap-2 ${filterPanelOpen ? 'left-[21rem]' : 'left-4'}`}>
            {/* Filter toggle button - only show when panel is closed */}
            {!filterPanelOpen && (
              <Button
                onClick={() => setFilterPanelOpen(true)}
                size="sm"
                variant="secondary"
                className="shadow-lg"
              >
                <i className="fi fi-rr-filter" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-balean-cyan text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          <MapFilterPanel
            mpas={mpas}
            filters={filters}
            onFiltersChange={setFilters}
            isOpen={filterPanelOpen}
            onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
            savedMPAIds={savedMPAIds}
          />

          <MobileMap
            mpas={filteredMpas}
            center={center}
            zoom={zoom}
            focusMpaId={focusMpaId || undefined}
          />
        </div>
      </main>
    );
  }

  return (
    <>
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
        canRefresh={canRefresh}
      />
      <main id="main-content" ref={containerRef} className="min-h-screen pb-24">
        {/* Hero Header */}
        <header className="relative bg-balean-navy overflow-hidden">
          {/* Background gradients */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-balean-cyan/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-balean-coral/10 rounded-full blur-3xl" />
          </div>

          <div className="relative container-app pt-4 pb-8">
            {/* Welcome text */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="text-white"
            >
              <motion.p variants={fadeInUp} className="text-white/60 text-sm mb-1">
                Welcome back
              </motion.p>
              <motion.h2 variants={fadeInUp} className="font-display text-2xl mb-6">
                Explore Marine Protected Areas
              </motion.h2>

              {/* Stats row */}
              <motion.div variants={fadeInUp} className="grid grid-cols-3 gap-3">
                {[
                  { value: mpas.length, label: 'MPAs', icon: 'fi-rr-map-marker' },
                  { value: '15K+', label: 'Species', icon: 'fi-rr-fish' },
                  { value: '50+', label: 'Countries', icon: 'fi-rr-globe' },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/5"
                  >
                    <i className={`fi ${stat.icon} text-balean-cyan text-lg mb-2 block`} />
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-white/60">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Wave decoration */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full h-6"
            viewBox="0 0 1440 48"
            preserveAspectRatio="none"
          >
            <path
              fill="#F8FAFC"
              d="M0,48L80,42.7C160,37,320,27,480,26.7C640,27,800,37,960,37.3C1120,37,1280,27,1360,21.3L1440,16L1440,48L1360,48C1280,48,1120,48,960,48C800,48,640,48,480,48C320,48,160,48,80,48L0,48Z"
            />
          </svg>
        </header>

        {/* Main Content */}
        <div className="container-app -mt-1 bg-balean-off-white">
          {/* Quick Actions */}
          <motion.section
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="py-6"
          >
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action, index) => {
                const content = (
                  <motion.div
                    variants={fadeInUp}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-14 h-14 ${action.bgLight} rounded-2xl flex items-center justify-center mb-2 shadow-sm`}>
                      <i className={`fi ${action.icon} ${action.textColor} text-xl`} />
                    </div>
                    <span className="text-xs font-semibold text-balean-navy">{action.label}</span>
                    <span className="text-[10px] text-balean-gray-400">{action.description}</span>
                  </motion.div>
                );

                if (action.href === null) {
                  return (
                    <button
                      key={index}
                      onClick={() => setShowMap(true)}
                      className="touch-target"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <Link key={index} href={action.href} className="touch-target">
                    {content}
                  </Link>
                );
              })}
            </div>
          </motion.section>

          {/* Featured MPA */}
          {!loading && mpas.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-balean-navy">Featured MPA</h3>
                <Badge variant="cyan" size="sm">
                  <i className="fi fi-rr-star text-[10px]" /> Top Rated
                </Badge>
              </div>

              <Link href={`/ocean-pulse-app/mpa/${mpas[0].id}`}>
                <Card variant="elevated" hover interactive className="overflow-hidden">
                  {/* Gradient accent bar */}
                  <div className="h-1 bg-gradient-to-r from-balean-cyan via-balean-coral to-balean-yellow" />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-balean-navy flex items-center justify-center flex-shrink-0">
                          <i className="fi fi-rr-map-marker text-balean-cyan text-2xl" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display text-lg text-balean-navy truncate">
                            {mpas[0].name}
                          </h4>
                          <p className="text-sm text-balean-gray-400 flex items-center gap-1">
                            <i className="fi fi-rr-marker text-xs" />
                            {mpas[0].country}
                          </p>
                        </div>
                      </div>
                      <CircularProgress
                        value={mpas[0].healthScore}
                        size="lg"
                        color={getHealthColor(mpas[0].healthScore)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-balean-gray-100">
                      {[
                        { value: mpas[0].area, label: 'Area', unit: 'km2' },
                        { value: '8', label: 'Species' },
                        { value: mpas[0].establishedYear, label: 'Est.' },
                      ].map((stat, index) => (
                        <div key={index} className="text-center">
                          <div className="text-lg font-bold text-balean-navy">{stat.value}</div>
                          <div className="text-xs text-balean-gray-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    <Button fullWidth className="mt-5" icon={<i className="fi fi-rr-arrow-right" />} iconPosition="right">
                      Explore MPA
                    </Button>
                  </div>
                </Card>
              </Link>
            </motion.section>
          )}

          {/* MPA List */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-balean-navy">All MPAs</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMap(true)}>
                View Map <i className="fi fi-rr-arrow-right" />
              </Button>
            </div>

            <Card variant="elevated">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3 p-2"
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-balean-gray-100" />
                        <div className="flex-1">
                          <div className="h-4 bg-balean-gray-100 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-balean-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="divide-y divide-balean-gray-100"
                  >
                    {mpas.slice(0, 8).map((mpa, index) => (
                      <motion.div
                        key={mpa.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/ocean-pulse-app/mpa/${mpa.id}`}>
                          <div className="flex items-center justify-between p-4 hover:bg-balean-gray-50 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <CircularProgress
                                  value={mpa.healthScore}
                                  size="sm"
                                  color={getHealthColor(mpa.healthScore)}
                                  showPercentage={false}
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-balean-navy group-hover:text-balean-cyan transition-colors">
                                  {mpa.name}
                                </div>
                                <div className="text-xs text-balean-gray-400 flex items-center gap-1">
                                  <i className="fi fi-rr-marker" />
                                  {mpa.country}
                                </div>
                              </div>
                            </div>
                            <i className="fi fi-rr-angle-right text-balean-gray-300 group-hover:text-balean-cyan group-hover:translate-x-1 transition-all" />
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {!loading && mpas.length > 8 && (
                <div className="p-4 border-t border-balean-gray-100">
                  <Button variant="ghost" fullWidth onClick={() => setShowMap(true)}>
                    View All {mpas.length} MPAs
                    <i className="fi fi-rr-arrow-right" />
                  </Button>
                </div>
              )}
            </Card>
          </motion.section>

          {/* Conservation Tips */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pb-8"
          >
            <Card variant="navy" className="relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-balean-cyan/10 rounded-full blur-2xl" />

              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-balean-yellow/20 flex items-center justify-center flex-shrink-0">
                  <i className="fi fi-rr-lightbulb-on text-balean-yellow text-xl" />
                </div>
                <div>
                  <h4 className="font-display text-white mb-1">Did you know?</h4>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Marine Protected Areas cover only about 8% of the ocean, but they are crucial
                    for protecting biodiversity and allowing ecosystems to recover.
                  </p>
                  <Link href="/ocean-pulse-app/species">
                    <Button variant="outline" size="sm" className="mt-4 border-white/30 text-white hover:bg-white hover:text-balean-navy">
                      Learn More <i className="fi fi-rr-arrow-right" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.section>
        </div>
      </main>
    </>
  );
}

// Main export wrapped in Suspense for useSearchParams
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-balean-navy">
          <div className="text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-balean-cyan via-balean-coral to-balean-yellow flex items-center justify-center mx-auto mb-4 animate-pulse">
              <i className="fi fi-rr-whale text-2xl" />
            </div>
            <p className="text-white/60">Loading Ocean PULSE...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
