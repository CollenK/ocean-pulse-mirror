'use client';

import { Source, Layer } from 'react-map-gl/maplibre';
import { useMemo } from 'react';
import { LITTER_INTENSITY_COLORS } from '@/lib/emodnet-litter';

interface LitterHotspotLayerProps {
  geojson: GeoJSON.FeatureCollection;
  visible: boolean;
  opacity?: number;
}

export function LitterHotspotLayer({ geojson, visible, opacity = 0.8 }: LitterHotspotLayerProps) {
  const data = useMemo(() => geojson, [geojson]);

  if (!visible) return null;

  return (
    <Source id="litter-hotspots" type="geojson" data={data}>
      {/* Heatmap at low zoom */}
      <Layer
        id="litter-heatmap"
        type="heatmap"
        maxzoom={8}
        paint={{
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'itemsPer100m'],
            0, 0,
            100, 0.5,
            500, 1,
          ],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, 1,
            8, 3,
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(34, 197, 94, 0)',
            0.2, 'rgba(34, 197, 94, 0.4)',
            0.4, 'rgba(234, 179, 8, 0.6)',
            0.6, 'rgba(249, 115, 22, 0.7)',
            0.8, 'rgba(239, 68, 68, 0.8)',
            1, 'rgba(185, 28, 28, 0.9)',
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 4,
            5, 20,
            8, 40,
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, opacity,
            9, 0,
          ],
        }}
      />

      {/* Circle markers at higher zoom */}
      <Layer
        id="litter-circles"
        type="circle"
        minzoom={6}
        paint={{
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'itemsPer100m'],
            0, 5,
            100, 8,
            500, 14,
            1000, 20,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'intensity'], 'very_high'], LITTER_INTENSITY_COLORS.very_high,
            ['==', ['get', 'intensity'], 'high'], LITTER_INTENSITY_COLORS.high,
            ['==', ['get', 'intensity'], 'moderate'], LITTER_INTENSITY_COLORS.moderate,
            LITTER_INTENSITY_COLORS.low,
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1.5,
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            6, 0,
            7, opacity,
          ],
        }}
      />

      {/* Labels at high zoom */}
      <Layer
        id="litter-labels"
        type="symbol"
        minzoom={9}
        layout={{
          'text-field': ['get', 'beachName'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true,
        }}
        paint={{
          'text-color': '#1e293b',
          'text-halo-color': 'white',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  );
}
