'use client';

import { Card, CardTitle, CardContent, Button, Badge, HealthBadge } from '@/components/ui';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
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
      <main className="min-h-screen">
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
      <main ref={containerRef} className="min-h-screen p-6 pb-24">
        <div className="max-w-screen-xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-navy-600 mb-2">
            🌊 Ocean PULSE
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Marine Protected Area Monitor
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="info">PWA Enabled</Badge>
            <Badge variant="healthy">Phase 3 Complete</Badge>
            <Badge variant="info">{mpas.length} MPAs Loaded</Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="mb-6 bg-gradient-to-br from-cyan-500 to-navy-600 text-white">
          <CardTitle className="text-white">Global MPA Network</CardTitle>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold">1,000+</p>
                <p className="text-sm opacity-90">MPAs Tracked</p>
              </div>
              <div>
                <p className="text-3xl font-bold">15K+</p>
                <p className="text-sm opacity-90">Species</p>
              </div>
              <div>
                <p className="text-3xl font-bold">50+</p>
                <p className="text-sm opacity-90">Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card hover interactive>
            <CardTitle>🗺️ Interactive Map</CardTitle>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Explore marine protected areas worldwide with real-time health indicators
              </p>
              <Button
                size="sm"
                fullWidth
                onClick={() => setShowMap(true)}
                loading={loading}
              >
                {loading ? 'Loading...' : `View ${mpas.length} MPAs on Map`}
              </Button>
            </CardContent>
          </Card>

          <Card hover interactive>
            <CardTitle>📍 Find Nearby</CardTitle>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Discover MPAs near your location using GPS
              </p>
              <Link href="/nearby">
                <Button size="sm" fullWidth variant="secondary">
                  Find MPAs
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card hover interactive>
            <CardTitle>📷 Add Observations</CardTitle>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Contribute species sightings and help marine research
              </p>
              <Link href="/observe">
                <Button size="sm" fullWidth>
                  Start Observing
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card hover interactive>
            <CardTitle>💾 Offline Ready</CardTitle>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Works without internet on boats and remote locations
              </p>
              <Badge variant="healthy" size="sm">
                ✓ PWA Enabled
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* MPA Health Examples */}
        <Card>
          <CardTitle>MPA Health Status Examples</CardTitle>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Great Barrier Reef</span>
                <HealthBadge score={85} size="sm" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Galápagos Islands</span>
                <HealthBadge score={92} size="sm" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Mediterranean Sea</span>
                <HealthBadge score={68} size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Status */}
        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm mb-2">
            🚀 Development Status: Phase 3 Complete
          </p>
          <p className="text-xs">
            Interactive map with {mpas.length} Marine Protected Areas
          </p>
          <p className="text-xs mt-1">
            Next: Phase 4 - Offline Functionality
          </p>
        </div>
      </div>
    </main>
    </>
  );
}
