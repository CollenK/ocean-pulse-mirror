'use client';

import { Marker } from 'react-map-gl/maplibre';
import type { MPA } from '@/types';
import { toMapLibreCoords, getHealthColor } from './map-utils';

interface MPAMarkerProps {
  mpa: MPA;
  onClick: (mpa: MPA) => void;
  onMouseEnter: (mpa: MPA) => void;
  onMouseLeave: () => void;
}

export function MPAMarker({ mpa, onClick, onMouseEnter, onMouseLeave }: MPAMarkerProps) {
  const color = getHealthColor(mpa.healthScore);
  const [lng, lat] = toMapLibreCoords(mpa.center);

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(mpa);
      }}
    >
      <div
        className="mpa-marker cursor-pointer transition-transform hover:scale-110"
        onMouseEnter={() => onMouseEnter(mpa)}
        onMouseLeave={onMouseLeave}
        style={{
          width: 32,
          height: 32,
          backgroundColor: color,
          border: '3px solid white',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i
          className="fi fi-rr-water text-white text-sm"
          style={{ transform: 'rotate(45deg)' }}
        />
      </div>
    </Marker>
  );
}
