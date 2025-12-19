/**
 * TrackingHeatmap Component
 * Displays marine megafauna tracking data as heatmap and paths using MapLibre GL
 */

'use client';

import { useState, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MPATrackingSummary, TrackingPath } from '@/types/obis-tracking';
import { Icon } from './ui';

interface TrackingHeatmapProps {
  summary: MPATrackingSummary;
  center: [number, number];
  zoom?: number;
}

// Path colors for different species
const SPECIES_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

// Heatmap layer style
const heatmapLayer: LayerProps = {
  id: 'heatmap-layer',
  type: 'heatmap',
  paint: {
    'heatmap-weight': ['get', 'intensity'],
    'heatmap-intensity': 1,
    'heatmap-radius': 30,
    'heatmap-opacity': 0.8,
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 0, 255, 0)',
      0.2, 'rgba(0, 0, 255, 0.5)',
      0.4, 'rgba(0, 255, 0, 0.6)',
      0.6, 'rgba(255, 255, 0, 0.7)',
      0.8, 'rgba(255, 128, 0, 0.8)',
      1, 'rgba(255, 0, 0, 0.9)',
    ],
  },
};

export function TrackingHeatmap({ summary, center, zoom = 6 }: TrackingHeatmapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'paths'>('heatmap');
  const [selectedPath, setSelectedPath] = useState<TrackingPath | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<string[]>(summary.species);
  const [popupInfo, setPopupInfo] = useState<{
    lat: number;
    lng: number;
    path: TrackingPath;
    isStart: boolean;
  } | null>(null);

  // Filter paths by selected species
  const filteredPaths = summary.paths.filter(path =>
    speciesFilter.includes(path.scientificName)
  );

  // Convert heatmap data to GeoJSON
  const heatmapGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: summary.heatmapData.map((point, i) => ({
      type: 'Feature' as const,
      properties: { intensity: point.intensity },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.lng, point.lat],
      },
    })),
  }), [summary.heatmapData]);

  // Convert paths to GeoJSON for line layer
  const pathsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredPaths.map((path, pathIndex) => ({
      type: 'Feature' as const,
      properties: {
        color: SPECIES_COLORS[summary.species.indexOf(path.scientificName) % SPECIES_COLORS.length],
        individualID: path.individualID,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: path.points.map(p => [p.longitude, p.latitude]),
      },
    })),
  }), [filteredPaths, summary.species]);

  const toggleSpecies = (species: string) => {
    setSpeciesFilter(prev =>
      prev.includes(species)
        ? prev.filter(s => s !== species)
        : [...prev, species]
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl p-4 shadow-card border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="map" size="sm" className="text-ocean-primary" />
            <h3 className="text-lg font-semibold text-ocean-deep">
              Movement Patterns
            </h3>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-ocean-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon name="fire" size="sm" />
                <span>Heatmap</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('paths')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'paths'
                  ? 'bg-ocean-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon name="route" size="sm" />
                <span>Paths</span>
              </div>
            </button>
          </div>
        </div>

        {/* Species Filter */}
        {viewMode === 'paths' && summary.species.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Filter by Species
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.species.map((species, index) => {
                const isSelected = speciesFilter.includes(species);
                const color = SPECIES_COLORS[index % SPECIES_COLORS.length];

                return (
                  <button
                    key={species}
                    onClick={() => toggleSpecies(species)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                      isSelected
                        ? 'border-current text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    {species}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-[500px] rounded-xl overflow-hidden shadow-card border border-gray-200">
        <Map
          initialViewState={{
            latitude: center[0],
            longitude: center[1],
            zoom: zoom,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          {/* Heatmap View */}
          {viewMode === 'heatmap' && summary.heatmapData.length > 0 && (
            <Source id="heatmap-source" type="geojson" data={heatmapGeoJSON}>
              <Layer {...heatmapLayer} />
            </Source>
          )}

          {/* Paths View */}
          {viewMode === 'paths' && (
            <>
              {/* Path lines */}
              <Source id="paths-source" type="geojson" data={pathsGeoJSON}>
                <Layer
                  id="paths-layer"
                  type="line"
                  paint={{
                    'line-color': ['get', 'color'],
                    'line-width': 3,
                    'line-opacity': 0.7,
                  }}
                />
              </Source>

              {/* Start/End markers */}
              {filteredPaths.map((path, pathIndex) => {
                const color = SPECIES_COLORS[
                  summary.species.indexOf(path.scientificName) % SPECIES_COLORS.length
                ];

                return (
                  <div key={path.individualID}>
                    {/* Start marker */}
                    {path.points.length > 0 && (
                      <Marker
                        latitude={path.points[0].latitude}
                        longitude={path.points[0].longitude}
                        anchor="center"
                        onClick={(e) => {
                          e.originalEvent.stopPropagation();
                          setPopupInfo({
                            lat: path.points[0].latitude,
                            lng: path.points[0].longitude,
                            path,
                            isStart: true,
                          });
                          setSelectedPath(path);
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white cursor-pointer shadow-md"
                          style={{ backgroundColor: color }}
                        />
                      </Marker>
                    )}

                    {/* End marker */}
                    {path.points.length > 1 && (
                      <Marker
                        latitude={path.points[path.points.length - 1].latitude}
                        longitude={path.points[path.points.length - 1].longitude}
                        anchor="center"
                        onClick={(e) => {
                          e.originalEvent.stopPropagation();
                          setPopupInfo({
                            lat: path.points[path.points.length - 1].latitude,
                            lng: path.points[path.points.length - 1].longitude,
                            path,
                            isStart: false,
                          });
                          setSelectedPath(path);
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white cursor-pointer shadow-md opacity-70"
                          style={{ backgroundColor: color }}
                        />
                      </Marker>
                    )}
                  </div>
                );
              })}

              {/* Popup */}
              {popupInfo && (
                <Popup
                  latitude={popupInfo.lat}
                  longitude={popupInfo.lng}
                  anchor="bottom"
                  onClose={() => setPopupInfo(null)}
                  closeButton={true}
                  closeOnClick={false}
                >
                  <div className="text-sm p-1">
                    <p className="font-semibold">{popupInfo.path.commonName}</p>
                    <p className="text-xs text-gray-600 italic">{popupInfo.path.scientificName}</p>
                    <p className="text-xs mt-1">
                      <span className="font-medium">{popupInfo.isStart ? 'Start' : 'End'}:</span>{' '}
                      {new Date(
                        popupInfo.isStart
                          ? popupInfo.path.points[0].timestamp
                          : popupInfo.path.points[popupInfo.path.points.length - 1].timestamp
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </Popup>
              )}
            </>
          )}
        </Map>
      </div>

      {/* Selected Path Info */}
      {selectedPath && viewMode === 'paths' && (
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-ocean-deep">{selectedPath.commonName}</h4>
              <p className="text-sm text-gray-600 italic">{selectedPath.scientificName}</p>
            </div>
            <button
              onClick={() => {
                setSelectedPath(null);
                setPopupInfo(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon name="xmark" size="sm" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Tracking Points</p>
              <p className="font-semibold text-ocean-deep">{selectedPath.points.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Time in MPA</p>
              <p className="font-semibold text-ocean-deep">
                {selectedPath.mpaMetrics.percentTimeInMPA.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-600">Residency Time</p>
              <p className="font-semibold text-ocean-deep">
                {selectedPath.mpaMetrics.residencyTimeHours.toFixed(1)} hrs
              </p>
            </div>
            <div>
              <p className="text-gray-600">Boundary Crossings</p>
              <p className="font-semibold text-ocean-deep">
                {selectedPath.mpaMetrics.boundaryCrossings}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
