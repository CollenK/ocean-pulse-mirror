'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MPA } from '@/types';
import { MPAMarker } from './MPAMarker';
import { MPAPopup } from './MPAPopup';
import { MapControls } from './MapControls';
import { SSTLayer } from './SSTLayer';
import { SSTLegend } from './SSTLegend';
import { WindFarmLayer } from './WindFarmLayer';
import { WindFarmLegend } from './WindFarmLegend';
import { toMapLibreCoords, boundsToGeoJSON, getHealthColor, normalizeAntimeridianGeometry } from './map-utils';
import type { WindFarmSummary } from '@/types/wind-farms';

interface MobileMapProps {
  mpas: MPA[];
  center?: [number, number]; // [lat, lng] - converted internally
  zoom?: number;
  onMPAClick?: (mpa: MPA) => void;
  focusMpaId?: string;
  showSST?: boolean;
  showWindFarms?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  windFarmGeoJSON?: { type: 'FeatureCollection'; features: any[] };
  windFarmSummary?: WindFarmSummary | null;
  userLocation?: { latitude: number; longitude: number };
}

// OpenFreeMap style URL (free, no API key required)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// Layer styles for MPA boundaries
const boundaryFillLayer: LayerProps = {
  id: 'mpa-boundaries-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.15,
  },
};

const boundaryLineLayer: LayerProps = {
  id: 'mpa-boundaries-line',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2,
    'line-opacity': 0.7,
  },
};

export function MobileMap({
  mpas,
  center,
  zoom,
  onMPAClick,
  focusMpaId,
  showSST = false,
  showWindFarms = false,
  windFarmGeoJSON,
  windFarmSummary,
  userLocation,
}: MobileMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredMPA, setHoveredMPA] = useState<MPA | null>(null);
  const [selectedMPA, setSelectedMPA] = useState<MPA | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringPopupRef = useRef(false);

  const hasFlownToUser = useRef(false);

  // Calculate initial view state
  const initialViewState = useMemo(() => {
    if (center && zoom !== undefined) {
      const [lng, lat] = toMapLibreCoords(center);
      return { longitude: lng, latitude: lat, zoom };
    }
    // Default world view
    return { longitude: 0, latitude: 20, zoom: 2 };
  }, [center, zoom]);

  // Fly to user location when it becomes available (only once, and only if no nav params)
  useEffect(() => {
    if (userLocation && !hasFlownToUser.current && !center) {
      hasFlownToUser.current = true;
      mapRef.current?.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 6,
        duration: 1500,
      });
    }
  }, [userLocation, center]);

  // Convert MPA geometries to GeoJSON FeatureCollection
  // Supports both Polygon and MultiPolygon types
  const boundariesGeoJSON = useMemo(() => {
    const withGeometry = mpas.filter((mpa) => mpa.geometry);

    const features = withGeometry.map((mpa) => {
      const geom = mpa.geometry!;
      // Cast to GeoJSON.Geometry type for MapLibre compatibility
      const rawGeometry = geom.type === 'Polygon'
        ? { type: 'Polygon' as const, coordinates: geom.coordinates as number[][][] }
        : { type: 'MultiPolygon' as const, coordinates: geom.coordinates as number[][][][] };

      // Normalize geometries that cross the anti-meridian (e.g., New Zealand)
      const geometry = normalizeAntimeridianGeometry(rawGeometry);

      return {
        type: 'Feature' as const,
        properties: {
          id: mpa.id,
          color: getHealthColor(mpa.healthScore),
        },
        geometry,
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [mpas]);

  // Hover handlers - show popup on hover (desktop) or persist on click
  const handleMarkerMouseEnter = useCallback((mpa: MPA) => {
    // Clear any pending close timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMPA(mpa);
  }, []);

  const handleMarkerMouseLeave = useCallback(() => {
    // Delay closing to allow mouse to move to popup
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringPopupRef.current) {
        setHoveredMPA(null);
      }
    }, 150);
  }, []);

  // Click handler for mobile and general interaction
  const handleMarkerClick = useCallback((mpa: MPA) => {
    onMPAClick?.(mpa);
    // Always toggle on click (works for both touch and mouse click)
    setSelectedMPA((prev) => (prev?.id === mpa.id ? null : mpa));
  }, [onMPAClick]);

  // Close popup handler
  const handlePopupClose = useCallback(() => {
    setHoveredMPA(null);
    setSelectedMPA(null);
    isHoveringPopupRef.current = false;
  }, []);

  // Handle popup mouse events to prevent closing when hovering popup
  const handlePopupMouseEnter = useCallback(() => {
    isHoveringPopupRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    isHoveringPopupRef.current = false;
    // Only auto-close hover popup on desktop, not clicked selection
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringPopupRef.current) {
        setHoveredMPA(null);
      }
    }, 150);
  }, []);

  // Determine which MPA to show popup for
  // Hover takes precedence on desktop, selected is used on mobile or when clicked
  const activePopupMPA = hoveredMPA || selectedMPA;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);


  return (
    <div
      className="relative bg-[#a3d5e8]"
      style={{ width: '100%', height: '100%' }}
    >
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        minZoom={1.5}
        maxZoom={18}
        renderWorldCopies={true}
      >
        {/* SST Layer - rendered first so it appears below other layers */}
        <SSTLayer visible={showSST} opacity={0.7} />

        {/* Wind Farm Layer - rendered above SST but below MPA boundaries */}
        {windFarmGeoJSON && (
          <WindFarmLayer
            geojson={windFarmGeoJSON}
            visible={showWindFarms}
            opacity={0.35}
          />
        )}

        {/* MPA Boundaries as GeoJSON layers */}
        <Source
          id="mpa-boundaries"
          type="geojson"
          data={boundariesGeoJSON}
        >
          <Layer {...boundaryFillLayer} />
          <Layer {...boundaryLineLayer} />
        </Source>

        {/* MPA Markers */}
        {mpas.map((mpa) => (
          <MPAMarker
            key={mpa.id}
            mpa={mpa}
            onClick={handleMarkerClick}
            onMouseEnter={handleMarkerMouseEnter}
            onMouseLeave={handleMarkerMouseLeave}
          />
        ))}

        {/* Popup */}
        {activePopupMPA && (
          <div
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
            <MPAPopup mpa={activePopupMPA} onClose={handlePopupClose} mapRef={mapRef} />
          </div>
        )}
      </Map>

      {/* Custom Controls Overlay */}
      <MapControls mapRef={mapRef} />

      {/* SST Legend - shown when SST layer is visible */}
      {showSST && (
        <SSTLegend className="absolute bottom-20 left-4 z-10" />
      )}

      {/* Wind Farm Legend - shown when wind farm layer is visible */}
      {showWindFarms && !showSST && (
        <WindFarmLegend visible={showWindFarms} summary={windFarmSummary} />
      )}
      {showWindFarms && showSST && (
        <div className="absolute bottom-44 left-4 z-10">
          <WindFarmLegend visible={showWindFarms} summary={windFarmSummary} />
        </div>
      )}
    </div>
  );
}
