'use client';

import { Source, Layer } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';

interface SSTLayerProps {
  visible: boolean;
  opacity?: number;
}

/**
 * Sea Surface Temperature layer using Copernicus Marine Service WMTS tiles.
 *
 * Data: Global SST Analysis (METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2)
 * Resolution: ~5km globally
 * Update frequency: Daily
 *
 * This is a public endpoint that doesn't require authentication.
 */
export function SSTLayer({ visible, opacity = 0.7 }: SSTLayerProps) {
  if (!visible) return null;

  // Copernicus Marine WMTS endpoint (public, CORS-enabled, no auth required)
  // Product: SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001
  // Dataset: METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2
  const tileUrl =
    'https://wmts.marine.copernicus.eu/teroWmts' +
    '?SERVICE=WMTS&REQUEST=GetTile' +
    '&LAYER=SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2/analysed_sst' +
    '&STYLE=cmap:thermal' +
    '&TILEMATRIXSET=EPSG:3857' +
    '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}' +
    '&FORMAT=image/png';

  const layerStyle: LayerProps = {
    id: 'sst-layer',
    type: 'raster',
    paint: {
      'raster-opacity': opacity,
      'raster-fade-duration': 300,
    },
  };

  return (
    <Source
      id="copernicus-sst"
      type="raster"
      tiles={[tileUrl]}
      tileSize={256}
      attribution="© Copernicus Marine Service"
    >
      <Layer {...layerStyle} />
    </Source>
  );
}
