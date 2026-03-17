'use client';

import { Marker } from 'react-map-gl/maplibre';
import type { MPA } from '@/types';
import { toMapLibreCoords, getHealthColor } from './map-utils';

interface MPAMarkerProps {
  mpa: MPA;
  onClick: (mpa: MPA) => void;
  onMouseEnter: (mpa: MPA) => void;
  onMouseLeave: () => void;
  highlighted?: boolean;
}

export function MPAMarker({ mpa, onClick, onMouseEnter, onMouseLeave, highlighted }: MPAMarkerProps) {
  const color = getHealthColor(mpa.healthScore);
  const [lng, lat] = toMapLibreCoords(mpa.center);

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(mpa);
      }}
    >
      <div
        className="relative flex items-center justify-center"
        onMouseEnter={() => onMouseEnter(mpa)}
        onMouseLeave={onMouseLeave}
      >
        {/* Pulsing rings for highlighted (demo) markers */}
        {highlighted && (
          <>
            <div
              className="absolute rounded-full animate-[demo-ping_2s_ease-out_infinite]"
              style={{
                width: 56,
                height: 56,
                backgroundColor: 'rgba(20,184,166,0.15)',
                border: '2px solid rgba(20,184,166,0.4)',
              }}
            />
            <div
              className="absolute rounded-full animate-[demo-ping_2s_ease-out_0.6s_infinite]"
              style={{
                width: 56,
                height: 56,
                backgroundColor: 'rgba(20,184,166,0.1)',
                border: '2px solid rgba(20,184,166,0.3)',
              }}
            />
          </>
        )}

        {/* Marker pin */}
        <div
          className="mpa-marker cursor-pointer transition-transform hover:scale-110"
          style={{
            width: 32,
            height: 32,
            backgroundColor: color,
            border: highlighted ? '3px solid #14b8a6' : '3px solid white',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            boxShadow: highlighted
              ? '0 3px 14px rgba(20,184,166,0.5)'
              : '0 3px 10px rgba(0,0,0,0.3)',
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
      </div>

      {/* Keyframes injected once via style tag */}
      {highlighted && (
        <style>{`
          @keyframes demo-ping {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}</style>
      )}
    </Marker>
  );
}
