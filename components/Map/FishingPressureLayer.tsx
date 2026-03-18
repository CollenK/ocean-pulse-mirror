'use client';

/**
 * FishingPressureLayer Component
 *
 * Displays fishing pressure data from Global Fishing Watch as a heatmap layer
 * overlaid on the map. Shows fishing effort intensity using color gradients.
 */

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { GFWFishingEffortSummary } from '@/types/gfw';

interface FishingPressureLayerProps {
  fishingData: GFWFishingEffortSummary | null;
  visible: boolean;
  opacity?: number;
}

// Note: heatmap and circle layer paint properties are inlined in the JSX below.

export function FishingPressureLayer({
  fishingData,
  visible,
  opacity = 0.8,
}: FishingPressureLayerProps) {
  // Convert hotspots to GeoJSON
  const geojsonData = useMemo(() => {
    if (!fishingData || !fishingData.hotspots || fishingData.hotspots.length === 0) {
      // Return empty feature collection
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    const features = fishingData.hotspots.map((hotspot, index) => ({
      type: 'Feature' as const,
      properties: {
        id: `hotspot-${index}`,
        fishingHours: hotspot.fishingHours,
        intensity: hotspot.intensity,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [hotspot.lon, hotspot.lat],
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [fishingData]);

  if (!visible) {
    return null;
  }

  return (
    <Source
      id="fishing-pressure"
      type="geojson"
      data={geojsonData}
    >
      <Layer
        id="fishing-pressure-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'fishingHours'],
            0, 0,
            10, 0.3,
            100, 0.6,
            1000, 1,
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3,
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33, 102, 172, 0)',
            0.2, 'rgb(103, 169, 207)',
            0.4, 'rgb(209, 229, 240)',
            0.6, 'rgb(253, 219, 119)',
            0.8, 'rgb(239, 138, 98)',
            1, 'rgb(178, 24, 43)',
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            3, 10,
            6, 20,
            9, 30,
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, opacity,
            9, 0,
          ],
        }}
      />
      <Layer
        id="fishing-pressure-circles"
        type="circle"
        minzoom={7}
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'fishingHours'],
            0, 4,
            100, 8,
            1000, 16,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'intensity'], 'very_high'], '#b2182b',
            ['==', ['get', 'intensity'], 'high'], '#ef8a62',
            ['==', ['get', 'intensity'], 'medium'], '#fddbc7',
            '#d1e5f0',
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0,
            8, opacity,
          ],
        }}
      />
    </Source>
  );
}

// Simplified layer for global view (aggregated data)
interface GlobalFishingLayerProps {
  visible: boolean;
  opacity?: number;
}

export function GlobalFishingLayer({ visible, opacity: _opacity = 0.6 }: GlobalFishingLayerProps) {
  // This would connect to GFW 4Wings tile API for global fishing heatmap
  // For now, return null as this requires additional tile server setup
  if (!visible) return null;

  return null;
}
