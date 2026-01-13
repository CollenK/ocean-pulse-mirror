'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle, CardContent, Button, Badge, HealthBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocationPermissionPrompt } from '@/components/LocationPermissionPrompt';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh';
import { MPA } from '@/types';
import { findNearestMPAs, formatDistance } from '@/lib/mpa-service';
import Link from 'next/link';

export default function NearbyPage() {
  const { position, error, loading, permission, requestPermission, refetch } = useGeolocation({
    enableHighAccuracy: true,
  });

  const [nearbyMPAs, setNearbyMPAs] = useState<Array<MPA & { distance: number }>>([]);
  const [maxDistance, setMaxDistance] = useState(500); // km

  useEffect(() => {
    async function loadNearbyMPAs() {
      if (position) {
        const nearest = await findNearestMPAs(
          position.latitude,
          position.longitude,
          maxDistance
        );
        setNearbyMPAs(nearest);
      }
    }
    loadNearbyMPAs();
  }, [position, maxDistance]);

  // Pull to refresh - refetch location
  const handleRefresh = useCallback(async () => {
    if (permission === 'granted') {
      refetch();
    }
  }, [permission, refetch]);

  const { containerRef, pullDistance, refreshing, canRefresh } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: permission === 'granted',
  });

  return (
    <>
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
        canRefresh={canRefresh}
      />
      <main ref={containerRef} className="min-h-screen p-6 pb-24 bg-gray-50">
        <div className="max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold text-navy-600 mb-2 flex items-center gap-2">
          <Icon name="marker" size="lg" /> Nearby MPAs
        </h1>
        <p className="text-gray-600 mb-6">
          Find Marine Protected Areas near your location
        </p>

        {/* Location Permission Prompt */}
        <LocationPermissionPrompt
          permission={permission}
          error={error}
          loading={loading}
          onRequestPermission={requestPermission}
        />

        {/* Current Location Info */}
        {position && (
          <Card className="mb-6">
            <CardTitle>Your Location</CardTitle>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-mono text-sm">{position.latitude.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-mono text-sm">{position.longitude.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="text-sm">±{position.accuracy.toFixed(0)}m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distance Filter */}
        {position && (
          <Card className="mb-6">
            <CardTitle>Search Radius</CardTitle>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Max Distance:</span>
                  <span className="font-semibold text-cyan-600">{maxDistance} km</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>50 km</span>
                  <span>2000 km</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nearby MPAs List */}
        {position && (
          <>
            {nearbyMPAs.length > 0 && nearbyMPAs[0].distance > 1000 && (
              <Card className="mb-4 bg-blue-50 border-blue-200">
                <CardContent>
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <Icon name="lightbulb" className="flex-shrink-0 mt-0.5" />
                    <span><strong>Tip:</strong> The nearest MPA is {nearbyMPAs[0].distance.toFixed(0)} km away. Marine Protected Areas may be sparse in your region. Consider exploring the map to see all available MPAs.</span>
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardTitle>
                Nearby MPAs ({nearbyMPAs.length})
              </CardTitle>
              <CardContent>
              {nearbyMPAs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4"><Icon name="search" className="text-6xl text-gray-400" /></div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    No MPAs Nearby
                  </p>
                  <p className="text-gray-500 mb-6">
                    No Marine Protected Areas found within {maxDistance} km of your location
                  </p>
                  <div className="space-y-3">
                    <Button
                      size="md"
                      onClick={() => setMaxDistance(maxDistance + 500)}
                    >
                      Expand to {maxDistance + 500} km
                    </Button>
                    <Button
                      size="md"
                      variant="secondary"
                      onClick={() => setMaxDistance(2000)}
                    >
                      Search Maximum Range (2000 km)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {nearbyMPAs.map((mpa) => (
                    <Link
                      key={mpa.id}
                      href={`/mpa/${mpa.id}`}
                      className="block"
                    >
                      <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-cyan-300">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-navy-600 mb-1">
                              {mpa.name}
                            </h3>
                            <p className="text-sm text-gray-600">{mpa.country}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-cyan-600">
                              {formatDistance(mpa.distance)}
                            </p>
                            <p className="text-xs text-gray-500">away</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <HealthBadge score={mpa.healthScore} size="sm" />
                          <Badge variant="info" size="sm">
                            {mpa.speciesCount} species
                          </Badge>
                          <Badge variant="info" size="sm">
                            {mpa.protectionLevel}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}

        {/* Placeholder for loading state */}
        {!position && permission === 'granted' && loading && (
          <Card>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-cyan-500 mb-4" />
                <p className="text-gray-600">Getting your location...</p>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </>
  );
}
