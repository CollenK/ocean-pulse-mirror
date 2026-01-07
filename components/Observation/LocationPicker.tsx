'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGeolocation, GeolocationData } from '@/hooks/useGeolocation';
import { Button, Input } from '@/components/ui';

interface LocationPickerProps {
  value?: {
    lat: number;
    lng: number;
    accuracy?: number;
    manuallyEntered?: boolean;
  };
  onChange: (location: {
    lat: number;
    lng: number;
    accuracy?: number;
    manuallyEntered?: boolean;
  }) => void;
  disabled?: boolean;
}

type LocationMode = 'auto' | 'manual';

export function LocationPicker({ value, onChange, disabled = false }: LocationPickerProps) {
  const { position, error, loading, permission, requestPermission, refetch } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
  });

  const [mode, setMode] = useState<LocationMode>('auto');
  const [manualLat, setManualLat] = useState<string>(value?.lat?.toString() || '');
  const [manualLng, setManualLng] = useState<string>(value?.lng?.toString() || '');
  const [manualError, setManualError] = useState<string | null>(null);

  // Auto-update location when geolocation updates in auto mode
  useEffect(() => {
    if (mode === 'auto' && position && !value?.manuallyEntered) {
      onChange({
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        manuallyEntered: false,
      });
    }
  }, [mode, position, onChange, value?.manuallyEntered]);

  // Initialize manual fields from value
  useEffect(() => {
    if (value) {
      setManualLat(value.lat.toString());
      setManualLng(value.lng.toString());
      if (value.manuallyEntered) {
        setMode('manual');
      }
    }
  }, [value]);

  const handleModeChange = useCallback((newMode: LocationMode) => {
    setMode(newMode);
    setManualError(null);

    if (newMode === 'auto' && position) {
      onChange({
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        manuallyEntered: false,
      });
    }
  }, [position, onChange]);

  const validateAndUpdateManualLocation = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setManualError('Please enter valid numbers for latitude and longitude');
      return false;
    }

    if (lat < -90 || lat > 90) {
      setManualError('Latitude must be between -90 and 90');
      return false;
    }

    if (lng < -180 || lng > 180) {
      setManualError('Longitude must be between -180 and 180');
      return false;
    }

    setManualError(null);
    onChange({
      lat,
      lng,
      manuallyEntered: true,
    });
    return true;
  }, [manualLat, manualLng, onChange]);

  const handleManualLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualLat(e.target.value);
  };

  const handleManualLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualLng(e.target.value);
  };

  const handleManualBlur = () => {
    if (manualLat && manualLng) {
      validateAndUpdateManualLocation();
    }
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const currentLocation = value || (position ? {
    lat: position.latitude,
    lng: position.longitude,
    accuracy: position.accuracy,
    manuallyEntered: false,
  } : null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          Location
        </label>
        {currentLocation && (
          <span className="text-xs text-gray-500">
            {currentLocation.manuallyEntered ? 'Manual' : 'Auto-detected'}
          </span>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => handleModeChange('auto')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'auto'
              ? 'bg-white text-cyan-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Auto-detect
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('manual')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'manual'
              ? 'bg-white text-cyan-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Enter Manually
        </button>
      </div>

      {/* Auto Mode */}
      {mode === 'auto' && (
        <div className="space-y-3">
          {/* Permission Needed */}
          {permission === 'prompt' && !position && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
              <p className="text-sm text-cyan-800 mb-3">
                Allow location access to automatically capture your coordinates.
              </p>
              <Button
                onClick={handleRequestPermission}
                loading={loading}
                disabled={disabled}
                size="sm"
              >
                Enable Location
              </Button>
            </div>
          )}

          {/* Permission Denied */}
          {permission === 'denied' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 mb-2">
                Location access denied. Please enable location in your device settings, or enter coordinates manually.
              </p>
              <Button
                variant="secondary"
                onClick={() => setMode('manual')}
                size="sm"
                disabled={disabled}
              >
                Enter Manually
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
              <p className="text-sm text-gray-600">Getting your location...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">{error}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={refetch} size="sm" disabled={disabled}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={() => setMode('manual')} size="sm" disabled={disabled}>
                  Enter Manually
                </Button>
              </div>
            </div>
          )}

          {/* Success - Location Display */}
          {currentLocation && !loading && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                    <span className="text-lg">📍</span> GPS Coordinates
                  </p>
                  <div className="text-sm text-cyan-800 space-y-1 font-mono">
                    <p>Lat: {currentLocation.lat.toFixed(6)}°</p>
                    <p>Lng: {currentLocation.lng.toFixed(6)}°</p>
                    {currentLocation.accuracy && (
                      <p className="text-xs text-cyan-600 mt-2">
                        Accuracy: ±{currentLocation.accuracy.toFixed(0)}m
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={refetch}
                  size="sm"
                  disabled={disabled || loading}
                >
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Latitude</label>
              <Input
                type="number"
                step="any"
                value={manualLat}
                onChange={handleManualLatChange}
                onBlur={handleManualBlur}
                placeholder="-33.9180"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longitude</label>
              <Input
                type="number"
                step="any"
                value={manualLng}
                onChange={handleManualLngChange}
                onBlur={handleManualBlur}
                placeholder="18.4233"
                disabled={disabled}
              />
            </div>
          </div>

          {manualError && (
            <p className="text-sm text-red-600">{manualError}</p>
          )}

          <p className="text-xs text-gray-500">
            Enter coordinates in decimal degrees format. Use negative values for South latitudes and West longitudes.
          </p>

          {position && (
            <Button
              variant="ghost"
              onClick={() => handleModeChange('auto')}
              size="sm"
              disabled={disabled}
              fullWidth
            >
              Use Current Location Instead
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
