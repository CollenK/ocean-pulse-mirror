'use client';

import { useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { Icon } from '@/components/Icon';

const GEO_ERROR_MESSAGES: Record<number, string> = {
  1: 'Location access denied. Please enable location permissions in your browser settings.',
  2: 'Unable to determine your location. Make sure location services are enabled on your device.',
  3: 'Location request timed out. Please try again.',
};

interface MapControlsProps {
  mapRef: React.RefObject<MapRef | null>;
}

export function MapControls({ mapRef }: MapControlsProps) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 8,
          duration: 1500,
        });
      },
      (error) => {
        setLocating(false);
        const message = GEO_ERROR_MESSAGES[error.code] || 'Could not get your location.';
        console.warn('Geolocation error:', error.code, error.message);
        setLocationError(message);
        setTimeout(() => setLocationError(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
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
          disabled={locating}
          className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl text-balean-navy hover:bg-balean-gray-50 active:scale-95 transition-all disabled:opacity-60"
          aria-label="My location"
        >
          {locating ? (
            <div className="w-5 h-5 border-2 border-balean-navy/30 border-t-balean-navy rounded-full animate-spin" />
          ) : (
            <Icon name="marker" />
          )}
        </button>
      </div>

      {locationError && (
        <div className="absolute bottom-24 left-4 right-20 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 text-sm text-balean-navy border border-balean-gray-100">
          <div className="flex items-start gap-2">
            <Icon name="exclamation" className="text-amber-500 flex-shrink-0 mt-0.5" size="sm" />
            <p>{locationError}</p>
          </div>
        </div>
      )}
    </>
  );
}
