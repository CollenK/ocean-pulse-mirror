'use client';

import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Hook to detect network status and connection quality
 * Provides real-time updates on online/offline status and connection speed
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('4g');
  const [downlink, setDownlink] = useState<number | undefined>(undefined);
  const [rtt, setRtt] = useState<number | undefined>(undefined);
  const [saveData, setSaveData] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Initial online status
    setIsOnline(navigator.onLine);

    // Get connection information
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      // Set initial values
      setConnectionType(connection.type || 'unknown');
      setEffectiveType(connection.effectiveType || '4g');
      setDownlink(connection.downlink);
      setRtt(connection.rtt);
      setSaveData(connection.saveData);

      // Listen for connection changes
      const handleConnectionChange = () => {
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || '4g');
        setDownlink(connection.downlink);
        setRtt(connection.rtt);
        setSaveData(connection.saveData);
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator && 'sync' in (ServiceWorkerRegistration.prototype as any)) {
        navigator.serviceWorker.ready.then((reg: any) => {
          if (reg.sync) {
            reg.sync.register('sync-data').catch((err: Error) => {
              console.log('Background sync failed:', err);
            });
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    saveData,
  };
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(effectiveType: string): boolean {
  return effectiveType === 'slow-2g' || effectiveType === '2g';
}

/**
 * Check if should use reduced data mode
 */
export function shouldReduceData(networkStatus: NetworkStatus): boolean {
  return (
    !networkStatus.isOnline ||
    networkStatus.saveData === true ||
    isSlowConnection(networkStatus.effectiveType)
  );
}
