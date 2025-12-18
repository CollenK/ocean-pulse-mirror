'use client';

import { Card, CardTitle, CardContent, Button, Badge, Icon, CircularProgress, getHealthColor } from '@/components/ui';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MPA } from '@/types';
import { fetchAllMPAs } from '@/lib/mpa-service';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh';
import dynamic from 'next/dynamic';

// Dynamically import map component (no SSR due to Leaflet)
const MobileMap = dynamic(
  () => import('@/components/Map/MobileMap').then((mod) => mod.MobileMap),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen">Loading map...</div> }
);

export default function Home() {
  const [mpas, setMpas] = useState<MPA[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMPAs = useCallback(async () => {
    const data = await fetchAllMPAs();
    setMpas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMPAs();
  }, [loadMPAs]);

  // Pull to refresh
  const { containerRef, pullDistance, refreshing, canRefresh } = usePullToRefresh({
    onRefresh: loadMPAs,
    enabled: !showMap, // Disable when map is showing
  });
  if (showMap) {
    return (
      <main id="main-content" className="min-h-screen">
        <div className="absolute top-4 left-4 z-[1001]">
          <Button
            onClick={() => setShowMap(false)}
            size="sm"
            variant="secondary"
          >
            ← Back to Home
          </Button>
        </div>
        <MobileMap mpas={mpas} />
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
      <main id="main-content" ref={containerRef} className="min-h-screen pb-32">
        {/* Hero Header with Gradient */}
        <div className="bg-gradient-to-br from-ocean-primary via-ocean-accent to-cyan-400 pt-8 pb-12 px-6 mb-6">
          <div className="max-w-screen-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center text-white"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <Icon name="wave" size="xl" className="text-white/90" />
                <h1 className="text-4xl font-bold">
                  Ocean PULSE
                </h1>
              </div>
              <p className="text-lg text-white/90 mb-6">
                Marine Protected Area Monitor
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">{mpas.length}</div>
                  <div className="text-sm text-white/80">MPAs</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">15K+</div>
                  <div className="text-sm text-white/80">Species</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">50+</div>
                  <div className="text-sm text-white/80">Countries</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6">

          {/* Featured MPA - Hero Card */}
          {mpas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="mb-6 overflow-hidden hover" shadow="lg">
                <div className="relative">
                  {/* Health indicator bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ocean-primary to-ocean-accent" />

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-primary to-ocean-accent flex items-center justify-center shadow-lg">
                          <Icon name="map-marker" className="text-white text-2xl" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-ocean-deep">{mpas[0].name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Icon name="marker" size="sm" />
                            {mpas[0].location}
                          </p>
                        </div>
                      </div>
                      <CircularProgress
                        value={mpas[0].healthScore}
                        size="lg"
                        color={getHealthColor(mpas[0].healthScore)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-ocean-deep">{mpas[0].area}</div>
                        <div className="text-xs text-gray-500 mt-1">Area</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-ocean-deep">8</div>
                        <div className="text-xs text-gray-500 mt-1">Species</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-ocean-deep">{mpas[0].year}</div>
                        <div className="text-xs text-gray-500 mt-1">Est.</div>
                      </div>
                    </div>

                    <Link href={`/mpa/${mpas[0].id}`}>
                      <Button fullWidth className="mt-4">
                        <Icon name="arrow-right" size="sm" />
                        Explore This MPA
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card
                hover
                interactive
                className="text-center cursor-pointer"
                onClick={() => setShowMap(true)}
              >
                <CardContent>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ocean-primary to-ocean-accent mx-auto mb-3 flex items-center justify-center">
                    <Icon name="map" className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold text-ocean-deep mb-1">Interactive Map</h3>
                  <p className="text-xs text-gray-500">{mpas.length} MPAs</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/nearby">
                <Card hover interactive className="text-center">
                  <CardContent>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mx-auto mb-3 flex items-center justify-center">
                      <Icon name="marker" className="text-white text-xl" />
                    </div>
                    <h3 className="font-semibold text-ocean-deep mb-1">Find Nearby</h3>
                    <p className="text-xs text-gray-500">Use GPS</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link href="/species">
                <Card hover interactive className="text-center">
                  <CardContent>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mx-auto mb-3 flex items-center justify-center">
                      <Icon name="fish" className="text-white text-xl" />
                    </div>
                    <h3 className="font-semibold text-ocean-deep mb-1">Species</h3>
                    <p className="text-xs text-gray-500">15K+ tracked</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/observe">
                <Card hover interactive className="text-center">
                  <CardContent>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mx-auto mb-3 flex items-center justify-center">
                      <Icon name="camera" className="text-white text-xl" />
                    </div>
                    <h3 className="font-semibold text-ocean-deep mb-1">Observe</h3>
                    <p className="text-xs text-gray-500">Add sighting</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>

          {/* Featured MPAs List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="mb-0">Featured MPAs</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMap(true)}>
                  <Icon name="arrow-right" size="sm" />
                  View All
                </Button>
              </div>
              <CardContent>
                <div className="space-y-3">
                  {mpas.slice(0, 5).map((mpa, index) => (
                    <Link key={mpa.id} href={`/mpa/${mpa.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer group"
                      >
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
                            <div className="font-medium text-ocean-deep">{mpa.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Icon name="marker" size="sm" />
                              {mpa.location}
                            </div>
                          </div>
                        </div>
                        <Icon name="angle-right" className="text-gray-400 group-hover:text-ocean-primary transition-colors" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
      </div>
    </main>
    </>
  );
}
