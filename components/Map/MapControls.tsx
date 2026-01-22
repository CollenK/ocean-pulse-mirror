'use client';

import type { MapRef } from 'react-map-gl/maplibre';
import { Icon } from '@/components/Icon';

interface MapControlsProps {
  mapRef: React.RefObject<MapRef | null>;
}

export function MapControls({ mapRef }: MapControlsProps) {
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleMyLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapRef.current?.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 8,
            duration: 1500,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-2xl font-bold text-balean-navy hover:bg-balean-gray-50 active:scale-95 transition-all"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={handleZoomOut}
        className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-2xl font-bold text-balean-navy hover:bg-balean-gray-50 active:scale-95 transition-all"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        onClick={handleMyLocation}
        className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl text-balean-navy hover:bg-balean-gray-50 active:scale-95 transition-all"
        aria-label="My location"
      >
        <Icon name="marker" />
      </button>
    </div>
  );
}
