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
import { LitterHotspotLayer } from './LitterHotspotLayer';
import { LitterHotspotLegend } from './LitterHotspotLegend';
import { toMapLibreCoords, getHealthColor, normalizeAntimeridianGeometry } from './map-utils';
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
  showLitterHotspots?: boolean;
  litterGeoJSON?: GeoJSON.FeatureCollection;
  litterSurveyCount?: number;
  userLocation?: { latitude: number; longitude: number };
  highlightedMpaIds?: Set<string>;
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

function useBoundariesGeoJSON(mpas: MPA[]) {
  return useMemo(() => {
    const features = mpas
      .filter((mpa) => mpa.geometry)
      .map((mpa) => {
        const geom = mpa.geometry!;
        const rawGeometry = geom.type === 'Polygon'
          ? { type: 'Polygon' as const, coordinates: geom.coordinates as number[][][] }
          : { type: 'MultiPolygon' as const, coordinates: geom.coordinates as number[][][][] };
        const geometry = normalizeAntimeridianGeometry(rawGeometry);
        return {
          type: 'Feature' as const,
          properties: { id: mpa.id, color: getHealthColor(mpa.healthScore) },
          geometry,
        };
      });
    return { type: 'FeatureCollection' as const, features };
  }, [mpas]);
}

function useHoverHandlers(onMPAClick?: (mpa: MPA) => void) {
  const [hoveredMPA, setHoveredMPA] = useState<MPA | null>(null);
  const [selectedMPA, setSelectedMPA] = useState<MPA | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringPopupRef = useRef(false);

  const handleMarkerMouseEnter = useCallback((mpa: MPA) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMPA(mpa);
  }, []);

  const handleMarkerMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringPopupRef.current) setHoveredMPA(null);
    }, 150);
  }, []);

  const handleMarkerClick = useCallback((mpa: MPA) => {
    onMPAClick?.(mpa);
    setSelectedMPA((prev) => (prev?.id === mpa.id ? null : mpa));
  }, [onMPAClick]);

  const handlePopupClose = useCallback(() => {
    setHoveredMPA(null);
    setSelectedMPA(null);
    isHoveringPopupRef.current = false;
  }, []);

  const handlePopupMouseEnter = useCallback(() => {
    isHoveringPopupRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    isHoveringPopupRef.current = false;
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringPopupRef.current) setHoveredMPA(null);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return {
    activePopupMPA: hoveredMPA || selectedMPA,
    handleMarkerMouseEnter,
    handleMarkerMouseLeave,
    handleMarkerClick,
    handlePopupClose,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  };
}

function MapLegends({ showSST, showWindFarms, showLitterHotspots, windFarmSummary, litterSurveyCount }: {
  showSST: boolean;
  showWindFarms: boolean;
  showLitterHotspots: boolean;
  windFarmSummary?: WindFarmSummary | null;
  litterSurveyCount?: number;
}) {
  return (
    <>
      {showSST && <SSTLegend className="absolute bottom-20 left-4 z-10" />}
      {showWindFarms && !showSST && (
        <WindFarmLegend visible={showWindFarms} summary={windFarmSummary} />
      )}
      {showWindFarms && showSST && (
        <div className="absolute bottom-44 left-4 z-10">
          <WindFarmLegend visible={showWindFarms} summary={windFarmSummary} />
        </div>
      )}
      {showLitterHotspots && (
        <LitterHotspotLegend
          visible={showLitterHotspots}
          surveyCount={litterSurveyCount}
          className={`absolute ${showSST || showWindFarms ? 'bottom-44' : 'bottom-20'} left-4 z-10`}
        />
      )}
    </>
  );
}

export function MobileMap({
  mpas,
  center,
  zoom,
  onMPAClick,
  focusMpaId: _focusMpaId,
  showSST = false,
  showWindFarms = false,
  windFarmGeoJSON,
  windFarmSummary,
  showLitterHotspots = false,
  litterGeoJSON,
  litterSurveyCount,
  userLocation,
  highlightedMpaIds,
}: MobileMapProps) {
  const mapRef = useRef<MapRef>(null);
  const hasFlownToUser = useRef(false);

  const initialViewState = useMemo(() => {
    if (center && zoom !== undefined) {
      const [lng, lat] = toMapLibreCoords(center);
      return { longitude: lng, latitude: lat, zoom };
    }
    return { longitude: 0, latitude: 20, zoom: 2 };
  }, [center, zoom]);

  useEffect(() => {
    if (userLocation && !hasFlownToUser.current && !center) {
      hasFlownToUser.current = true;
      mapRef.current?.flyTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 6, duration: 1500 });
    }
  }, [userLocation, center]);

  const boundariesGeoJSON = useBoundariesGeoJSON(mpas);
  const hover = useHoverHandlers(onMPAClick);

  return (
    <div className="relative bg-[#a3d5e8]" style={{ width: '100%', height: '100%' }}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        minZoom={1.5}
        maxZoom={18}
        renderWorldCopies={true}
      >
        <SSTLayer visible={showSST} opacity={0.7} />
        {windFarmGeoJSON && <WindFarmLayer geojson={windFarmGeoJSON} visible={showWindFarms} opacity={0.35} />}
        {litterGeoJSON && <LitterHotspotLayer geojson={litterGeoJSON} visible={showLitterHotspots} opacity={0.8} />}
        <Source id="mpa-boundaries" type="geojson" data={boundariesGeoJSON}>
          <Layer {...boundaryFillLayer} />
          <Layer {...boundaryLineLayer} />
        </Source>
        {mpas.map((mpa) => (
          <MPAMarker key={mpa.id} mpa={mpa} onClick={hover.handleMarkerClick} onMouseEnter={hover.handleMarkerMouseEnter} onMouseLeave={hover.handleMarkerMouseLeave} highlighted={highlightedMpaIds?.has(mpa.id)} />
        ))}
        {hover.activePopupMPA && (
          <div onMouseEnter={hover.handlePopupMouseEnter} onMouseLeave={hover.handlePopupMouseLeave}>
            <MPAPopup mpa={hover.activePopupMPA} onClose={hover.handlePopupClose} mapRef={mapRef} />
          </div>
        )}
      </Map>
      <MapControls mapRef={mapRef} />
      <MapLegends showSST={showSST} showWindFarms={showWindFarms} showLitterHotspots={showLitterHotspots} windFarmSummary={windFarmSummary} litterSurveyCount={litterSurveyCount} />
    </div>
  );
}
