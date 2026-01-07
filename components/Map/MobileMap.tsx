'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { MPA } from '@/types';
import { HealthBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Next.js
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface MobileMapProps {
  mpas: MPA[];
  center?: LatLngExpression;
  zoom?: number;
  onMPAClick?: (mpa: MPA) => void;
}

// Map height adjustment component
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const updateHeight = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', updateHeight);
    // Initial resize
    setTimeout(updateHeight, 100);

    return () => window.removeEventListener('resize', updateHeight);
  }, [map]);

  return null;
}

// Custom map controls component
function MapControls() {
  const map = useMap();

  return (
    <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={() => map.zoomIn()}
        className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-2xl font-bold text-navy-600 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-2xl font-bold text-navy-600 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        onClick={() => map.locate({ setView: true, maxZoom: 8 })}
        className="touch-target bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl text-navy-600 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="My location"
      >
        <Icon name="marker" />
      </button>
    </div>
  );
}

// Get marker color based on health score
function getMarkerColor(healthScore: number): string {
  if (healthScore >= 80) return '#10B981'; // green
  if (healthScore >= 50) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

// Custom marker icon
function createCustomIcon(healthScore: number) {
  const color = getMarkerColor(healthScore);

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="fi fi-rr-water" style="transform: rotate(45deg); color: white; font-size: 14px;"></i>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function MobileMap({ mpas, center = [0, 20], zoom = 2, onMPAClick }: MobileMapProps) {
  const [mapHeight, setMapHeight] = useState('100vh');

  useEffect(() => {
    const updateHeight = () => {
      setMapHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div style={{ height: mapHeight, width: '100%' }} className="relative">
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        {/* Ocean-themed tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* MPA Markers and Boundaries */}
        {mpas.map((mpa) => (
          <div key={mpa.id}>
            {/* MPA Boundary Rectangle */}
            {mpa.bounds && mpa.bounds.length === 2 && (
              <Rectangle
                bounds={mpa.bounds as LatLngBoundsExpression}
                pathOptions={{
                  color: getMarkerColor(mpa.healthScore),
                  weight: 2,
                  opacity: 0.6,
                  fillOpacity: 0.1,
                }}
              />
            )}

            {/* MPA Marker */}
            <Marker
              position={mpa.center as LatLngExpression}
              icon={createCustomIcon(mpa.healthScore)}
              eventHandlers={{
                click: () => onMPAClick?.(mpa),
              }}
            >
              <Popup maxWidth={300} className="custom-popup">
                <div className="p-2">
                  <h3 className="font-bold text-navy-600 mb-2">{mpa.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{mpa.country}</p>

                  <div className="mb-3">
                    <HealthBadge score={mpa.healthScore} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Species:</span>
                      <span className="font-semibold ml-1">{mpa.speciesCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Est:</span>
                      <span className="font-semibold ml-1">{mpa.establishedYear}</span>
                    </div>
                  </div>

                  <Link
                    href={`/mpa/${mpa.id}`}
                    className="block w-full bg-cyan-500 hover:bg-cyan-600 text-white text-center py-2 rounded-lg font-semibold transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}

        <MapResizer />
        <MapControls />
      </MapContainer>
    </div>
  );
}
