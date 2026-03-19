'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGeolocation, type GeolocationData } from '@/hooks/useGeolocation';
import { Button, Input } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface LocationValue {
  lat: number;
  lng: number;
  accuracy?: number;
  manuallyEntered?: boolean;
}

interface LocationPickerProps {
  value?: LocationValue;
  onChange: (location: LocationValue) => void;
  disabled?: boolean;
}

type LocationMode = 'auto' | 'manual';

function validateCoordinates(latStr: string, lngStr: string): string | null {
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) return 'Please enter valid numbers for latitude and longitude';
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
  if (lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
  return null;
}

function AutoModeContent({
  permission, position, loading, error, currentLocation,
  disabled, onRequestPermission, onRefetch, onSwitchToManual,
}: {
  permission: string;
  position: GeolocationData | null;
  loading: boolean;
  error: string | null;
  currentLocation: LocationValue | null;
  disabled: boolean;
  onRequestPermission: () => void;
  onRefetch: () => void;
  onSwitchToManual: () => void;
}) {
  return (
    <div className="space-y-3">
      {permission === 'prompt' && !position && (
        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
          <p className="text-sm text-cyan-800 mb-3">Allow location access to automatically capture your coordinates.</p>
          <Button onClick={onRequestPermission} loading={loading} disabled={disabled} size="sm">Enable Location</Button>
        </div>
      )}
      {permission === 'denied' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-2">Location access denied. Please enable location in your device settings, or enter coordinates manually.</p>
          <Button variant="secondary" onClick={onSwitchToManual} size="sm" disabled={disabled}>Enter Manually</Button>
        </div>
      )}
      {loading && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Getting your location...</p>
        </div>
      )}
      {error && !loading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-2">{error}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRefetch} size="sm" disabled={disabled}>Try Again</Button>
            <Button variant="ghost" onClick={onSwitchToManual} size="sm" disabled={disabled}>Enter Manually</Button>
          </div>
        </div>
      )}
      {currentLocation && !loading && (
        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                <Icon name="marker" size="lg" /> GPS Coordinates
              </p>
              <div className="text-sm text-cyan-800 space-y-1 font-mono">
                <p>Lat: {currentLocation.lat.toFixed(6)}&deg;</p>
                <p>Lng: {currentLocation.lng.toFixed(6)}&deg;</p>
                {currentLocation.accuracy && (
                  <p className="text-xs text-cyan-600 mt-2">Accuracy: &plusmn;{currentLocation.accuracy.toFixed(0)}m</p>
                )}
              </div>
            </div>
            <Button variant="ghost" onClick={onRefetch} size="sm" disabled={disabled || loading}>Refresh</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualModeContent({
  manualLat, manualLng, manualError, disabled, position,
  onLatChange, onLngChange, onBlur, onSwitchToAuto,
}: {
  manualLat: string;
  manualLng: string;
  manualError: string | null;
  disabled: boolean;
  position: GeolocationData | null;
  onLatChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLngChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onSwitchToAuto: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Latitude</label>
          <Input type="number" step="any" value={manualLat} onChange={onLatChange} onBlur={onBlur} placeholder="-33.9180" disabled={disabled} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Longitude</label>
          <Input type="number" step="any" value={manualLng} onChange={onLngChange} onBlur={onBlur} placeholder="18.4233" disabled={disabled} />
        </div>
      </div>
      {manualError && <p className="text-sm text-red-600">{manualError}</p>}
      <p className="text-xs text-gray-500">Enter coordinates in decimal degrees format. Use negative values for South latitudes and West longitudes.</p>
      {position && (
        <Button variant="ghost" onClick={onSwitchToAuto} size="sm" disabled={disabled} fullWidth>Use Current Location Instead</Button>
      )}
    </div>
  );
}

function positionToLocation(position: GeolocationData): LocationValue {
  return { lat: position.latitude, lng: position.longitude, accuracy: position.accuracy, manuallyEntered: false };
}

function ModeToggle({ mode, disabled, onModeChange }: { mode: LocationMode; disabled: boolean; onModeChange: (m: LocationMode) => void }) {
  const activeClass = 'bg-white text-cyan-600 shadow-sm';
  const inactiveClass = 'text-gray-600 hover:text-gray-800';
  return (
    <div className="flex rounded-lg bg-gray-100 p-1">
      <button type="button" onClick={() => onModeChange('auto')} disabled={disabled} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'auto' ? activeClass : inactiveClass} disabled:opacity-50 disabled:cursor-not-allowed`}>Auto-detect</button>
      <button type="button" onClick={() => onModeChange('manual')} disabled={disabled} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'manual' ? activeClass : inactiveClass} disabled:opacity-50 disabled:cursor-not-allowed`}>Enter Manually</button>
    </div>
  );
}

function useLocationState(value: LocationValue | undefined, onChange: (loc: LocationValue) => void) {
  const { position, error, loading, permission, requestPermission, refetch } = useGeolocation({ enableHighAccuracy: true, timeout: 15000 });
  const [mode, setMode] = useState<LocationMode>('auto');
  const [manualLat, setManualLat] = useState<string>(value?.lat?.toString() || '');
  const [manualLng, setManualLng] = useState<string>(value?.lng?.toString() || '');
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'auto' && position && !value?.manuallyEntered) onChange(positionToLocation(position));
  }, [mode, position, onChange, value?.manuallyEntered]);

  useEffect(() => {
    if (!value) return;
    setManualLat(value.lat.toString());
    setManualLng(value.lng.toString());
    if (value.manuallyEntered) setMode('manual');
  }, [value]);

  const handleModeChange = useCallback((newMode: LocationMode) => {
    setMode(newMode);
    setManualError(null);
    if (newMode === 'auto' && position) onChange(positionToLocation(position));
  }, [position, onChange]);

  const handleManualBlur = useCallback(() => {
    if (!manualLat || !manualLng) return;
    const validationError = validateCoordinates(manualLat, manualLng);
    if (validationError) { setManualError(validationError); return; }
    setManualError(null);
    onChange({ lat: parseFloat(manualLat), lng: parseFloat(manualLng), manuallyEntered: true });
  }, [manualLat, manualLng, onChange]);

  const currentLocation = value || (position ? positionToLocation(position) : null);

  return {
    mode, setMode, position, error, loading, permission, requestPermission, refetch,
    manualLat, setManualLat, manualLng, setManualLng, manualError,
    handleModeChange, handleManualBlur, currentLocation,
  };
}

export function LocationPicker({ value, onChange, disabled = false }: LocationPickerProps) {
  const state = useLocationState(value, onChange);
  const locationLabel = state.currentLocation?.manuallyEntered ? 'Manual' : 'Auto-detected';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">Location</label>
        {state.currentLocation && <span className="text-xs text-gray-500">{locationLabel}</span>}
      </div>
      <ModeToggle mode={state.mode} disabled={disabled} onModeChange={state.handleModeChange} />
      {state.mode === 'auto' && (
        <AutoModeContent permission={state.permission} position={state.position} loading={state.loading} error={state.error} currentLocation={state.currentLocation} disabled={disabled} onRequestPermission={async () => { await state.requestPermission(); }} onRefetch={state.refetch} onSwitchToManual={() => state.setMode('manual')} />
      )}
      {state.mode === 'manual' && (
        <ManualModeContent manualLat={state.manualLat} manualLng={state.manualLng} manualError={state.manualError} disabled={disabled} position={state.position} onLatChange={(e) => state.setManualLat(e.target.value)} onLngChange={(e) => state.setManualLng(e.target.value)} onBlur={state.handleManualBlur} onSwitchToAuto={() => state.handleModeChange('auto')} />
      )}
    </div>
  );
}
