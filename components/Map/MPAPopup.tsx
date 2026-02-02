'use client';

import { useMemo } from 'react';
import { Popup, MapRef } from 'react-map-gl/maplibre';
import Link from 'next/link';
import type { MPA } from '@/types';
import { HealthBadge } from '@/components/ui';
import { toMapLibreCoords } from './map-utils';

interface MPAPopupProps {
  mpa: MPA;
  onClose: () => void;
  mapRef?: React.RefObject<MapRef | null>;
}

type AnchorPosition = 'bottom' | 'left' | 'right' | 'top';

export function MPAPopup({ mpa, onClose, mapRef }: MPAPopupProps) {
  const [lng, lat] = toMapLibreCoords(mpa.center);

  // Calculate anchor position based on marker's screen position
  const { anchor, offset } = useMemo<{ anchor: AnchorPosition; offset: [number, number] }>(() => {
    if (!mapRef?.current) {
      return { anchor: 'bottom', offset: [0, -32] };
    }

    const map = mapRef.current;
    const screenPoint = map.project([lng, lat]);
    const container = map.getContainer();
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const leftThreshold = containerWidth * 0.33;
    const rightThreshold = containerWidth * 0.67;
    // Popup card is roughly 200px tall; show below if marker is near top
    const topThreshold = containerHeight * 0.25;

    if (screenPoint.y < topThreshold) {
      // Marker is near the top - show popup below
      return { anchor: 'top', offset: [0, 16] };
    } else if (screenPoint.x < leftThreshold) {
      // Marker is on the left side - show popup to the right
      return { anchor: 'left', offset: [16, 0] };
    } else if (screenPoint.x > rightThreshold) {
      // Marker is on the right side - show popup to the left
      return { anchor: 'right', offset: [-16, 0] };
    } else {
      // Marker is in the middle - show popup above
      return { anchor: 'bottom', offset: [0, -32] };
    }
  }, [mapRef, lng, lat]);

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor={anchor}
      offset={offset}
      closeButton={true}
      closeOnClick={false}
      onClose={onClose}
      className="mpa-popup"
    >
      <div className="p-2">
        <h3 className="font-bold text-balean-navy mb-2">{mpa.name}</h3>
        <p className="text-sm text-balean-gray-500 mb-2">{mpa.country}</p>

        <div className="mb-3">
          <HealthBadge score={mpa.healthScore} size="sm" />
          <p className="text-[10px] text-balean-gray-400 mt-1">Estimated from species, habitat, and environmental data</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-balean-gray-400">Species:</span>
            <span className="font-semibold ml-1">{mpa.speciesCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-balean-gray-400">Est:</span>
            <span className="font-semibold ml-1">{mpa.establishedYear}</span>
          </div>
        </div>

        <Link
          href={`/ocean-pulse-app/mpa/${mpa.id}`}
          className="block w-full bg-balean-cyan hover:bg-balean-cyan-dark text-white text-center py-2 rounded-lg font-semibold transition-colors"
        >
          View Details
        </Link>
      </div>
    </Popup>
  );
}
