/**
 * TrackingHeatmap Component
 * Displays marine megafauna tracking data as heatmap and paths on Leaflet map
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { MPATrackingSummary, TrackingPath } from '@/types/obis-tracking';
import { Icon } from './ui';

interface TrackingHeatmapProps {
  summary: MPATrackingSummary;
  center: [number, number];
  zoom?: number;
}

// Heatmap layer component
function HeatmapLayer({ summary }: { summary: MPATrackingSummary }) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!map || !summary.heatmapData.length) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create heat layer data
    const heatData: [number, number, number][] = summary.heatmapData.map(point => [
      point.lat,
      point.lng,
      point.intensity,
    ]);

    // Create and add heat layer
    heatLayerRef.current = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red',
      },
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, summary]);

  return null;
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

export function TrackingHeatmap({ summary, center, zoom = 6 }: TrackingHeatmapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'paths'>('heatmap');
  const [selectedPath, setSelectedPath] = useState<TrackingPath | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<string[]>(summary.species);

  // Filter paths by selected species
  const filteredPaths = summary.paths.filter(path =>
    speciesFilter.includes(path.scientificName)
  );

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
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Heatmap View */}
          {viewMode === 'heatmap' && summary.heatmapData.length > 0 && (
            <HeatmapLayer summary={summary} />
          )}

          {/* Paths View */}
          {viewMode === 'paths' && filteredPaths.map((path, pathIndex) => {
            const color = SPECIES_COLORS[
              summary.species.indexOf(path.scientificName) % SPECIES_COLORS.length
            ];

            // Extract path coordinates
            const pathCoords: [number, number][] = path.points.map(p => [
              p.latitude,
              p.longitude,
            ]);

            return (
              <div key={path.individualID}>
                {/* Path polyline */}
                <Polyline
                  positions={pathCoords}
                  pathOptions={{
                    color,
                    weight: 3,
                    opacity: 0.7,
                  }}
                  eventHandlers={{
                    click: () => setSelectedPath(path),
                  }}
                />

                {/* Start point */}
                {path.points.length > 0 && (
                  <CircleMarker
                    center={[path.points[0].latitude, path.points[0].longitude]}
                    radius={6}
                    pathOptions={{
                      color: 'white',
                      fillColor: color,
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{path.commonName}</p>
                        <p className="text-xs text-gray-600">{path.scientificName}</p>
                        <p className="text-xs mt-1">
                          <span className="font-medium">Start:</span>{' '}
                          {new Date(path.points[0].timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                {/* End point */}
                {path.points.length > 1 && (
                  <CircleMarker
                    center={[
                      path.points[path.points.length - 1].latitude,
                      path.points[path.points.length - 1].longitude,
                    ]}
                    radius={6}
                    pathOptions={{
                      color: 'white',
                      fillColor: color,
                      fillOpacity: 0.7,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{path.commonName}</p>
                        <p className="text-xs text-gray-600">{path.scientificName}</p>
                        <p className="text-xs mt-1">
                          <span className="font-medium">End:</span>{' '}
                          {new Date(path.points[path.points.length - 1].timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}
              </div>
            );
          })}
        </MapContainer>
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
              onClick={() => setSelectedPath(null)}
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
