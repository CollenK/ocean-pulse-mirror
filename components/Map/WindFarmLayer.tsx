'use client';

/**
 * WindFarmLayer Component
 *
 * Renders offshore wind farm polygons on the map using data from EMODnet.
 * Color-codes wind farms by development status (operational, under construction,
 * planned, etc.) to visualize spatial conflicts with Marine Protected Areas.
 */

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import { WIND_FARM_STATUS_COLORS } from '@/types/wind-farms';

interface WindFarmLayerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geojson: { type: 'FeatureCollection'; features: any[] };
  visible: boolean;
  opacity?: number;
}

// Build the color expression for status-based styling
const statusColorExpression: unknown[] = ['match', ['get', 'status']];
for (const [status, color] of Object.entries(WIND_FARM_STATUS_COLORS)) {
  statusColorExpression.push(status, color);
}
statusColorExpression.push('#9ca3af'); // fallback

// Fill layer: semi-transparent polygons colored by status
const windFarmFillLayer: LayerProps = {
  id: 'wind-farms-fill',
  type: 'fill',
  paint: {
    'fill-color': statusColorExpression as unknown as string,
    'fill-opacity': 0.35,
  },
};

// Line layer: polygon outlines
const windFarmLineLayer: LayerProps = {
  id: 'wind-farms-line',
  type: 'line',
  paint: {
    'line-color': statusColorExpression as unknown as string,
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      3, 0.5,
      6, 1.5,
      10, 2.5,
    ],
    'line-opacity': 0.8,
  },
};

// Symbol layer: wind farm labels at higher zoom
const windFarmLabelLayer: LayerProps = {
  id: 'wind-farms-label',
  type: 'symbol',
  minzoom: 8,
  layout: {
    'text-field': ['get', 'name'],
    'text-size': 11,
    'text-anchor': 'center',
    'text-max-width': 8,
    'text-allow-overlap': false,
  },
  paint: {
    'text-color': '#1e293b',
    'text-halo-color': '#ffffff',
    'text-halo-width': 1.5,
  },
};

export function WindFarmLayer({
  geojson,
  visible,
  opacity = 0.35,
}: WindFarmLayerProps) {
  if (!visible || !geojson || geojson.features.length === 0) {
    return null;
  }

  return (
    <Source
      id="wind-farms"
      type="geojson"
      data={geojson}
    >
      <Layer
        id="wind-farms-fill"
        type="fill"
        paint={{
          'fill-color': statusColorExpression as unknown as string,
          'fill-opacity': opacity,
        }}
      />
      <Layer
        id="wind-farms-line"
        type="line"
        paint={{
          'line-color': statusColorExpression as unknown as string,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 0.5,
            6, 1.5,
            10, 2.5,
          ],
          'line-opacity': 0.8,
        }}
      />
      <Layer
        id="wind-farms-label"
        type="symbol"
        minzoom={8}
        layout={{
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-anchor': 'center',
          'text-max-width': 8,
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#1e293b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  );
}
