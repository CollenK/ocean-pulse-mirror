'use client';

/**
 * WindFarmLayer Component
 *
 * Renders offshore wind farm polygons on the map using data from EMODnet.
 * Color-codes wind farms by development status (operational, under construction,
 * planned, etc.) to visualize spatial conflicts with Marine Protected Areas.
 */

import { Source, Layer } from 'react-map-gl/maplibre';
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

// Note: layer paint/layout properties are inlined in the JSX below.

export function WindFarmLayer({
  geojson,
  visible,
  opacity = 0.35,
}: WindFarmLayerProps) {
  if (!geojson) return null;

  const visibility = visible && geojson.features.length > 0 ? 'visible' : 'none';

  return (
    <Source
      id="wind-farms"
      type="geojson"
      data={geojson}
    >
      <Layer
        id="wind-farms-fill"
        type="fill"
        layout={{ visibility }}
        paint={{
          'fill-color': statusColorExpression as unknown as string,
          'fill-opacity': opacity,
        }}
      />
      <Layer
        id="wind-farms-line"
        type="line"
        layout={{ visibility }}
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
          visibility,
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
