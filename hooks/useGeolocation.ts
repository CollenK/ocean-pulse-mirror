'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackPermissionRequest } from '@/lib/analytics';

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

interface UseGeolocationReturn {
  position: GeolocationData | null;
  error: string | null;
  loading: boolean;
  permission: PermissionStatus;
  requestPermission: () => Promise<void>;
  refetch: () => void;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [position, setPosition] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('prompt');

  // Check if geolocation is supported
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermission('unsupported');
      setError('Geolocation is not supported by your browser');
    }
  }, []);

  // Check permission status
  const checkPermission = useCallback(async () => {
    if (!('permissions' in navigator)) return;

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermission(result.state as PermissionStatus);

      // Listen for permission changes
      result.addEventListener('change', () => {
        setPermission(result.state as PermissionStatus);
      });
    } catch (err) {
      // Permission API not fully supported, will rely on geolocation API
      console.warn('Permission API not available:', err);
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Success callback
  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    });
    setError(null);
    setLoading(false);
    setPermission('granted');
    // Track successful permission grant
    trackPermissionRequest('location', true);
  }, []);

  // Error callback
  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);

    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Please enable location access in your device settings.');
        setPermission('denied');
        // Track permission denial
        trackPermissionRequest('location', false);
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location information unavailable. Please check your device settings.');
        break;
      case err.TIMEOUT:
        setError('Location request timed out. Please try again.');
        break;
      default:
        setError('An unknown error occurred while getting your location.');
    }
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(() => {
    if (!('geolocation' in navigator)) return;

    setLoading(true);
    setError(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geoOptions
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Request permission explicitly
  const requestPermission = useCallback(async () => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  // Watch position
  useEffect(() => {
    if (!watch || permission === 'denied' || permission === 'unsupported') return;

    let watchId: number;

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch, permission, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Auto-fetch on mount if permission already granted
  useEffect(() => {
    if (permission === 'granted' && !watch) {
      getCurrentPosition();
    }
  }, [permission, watch, getCurrentPosition]);

  return {
    position,
    error,
    loading,
    permission,
    requestPermission,
    refetch: getCurrentPosition,
  };
}
