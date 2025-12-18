'use client';

import { useNetworkStatus, isSlowConnection } from '@/hooks/useNetworkStatus';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const { isOnline, effectiveType } = useNetworkStatus();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  // Only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setMessage('📡 You are offline. Viewing cached data.');
      setShow(true);
    } else if (isSlowConnection(effectiveType)) {
      setMessage(`⚠️ Slow connection (${effectiveType}). Using cached data when possible.`);
      setShow(true);
    } else {
      // Hide after a delay when back online
      const timer = setTimeout(() => {
        setShow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, effectiveType]);

  // Don't render during SSR
  if (!mounted || !show) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
        !isOnline
          ? 'bg-red-500 text-white'
          : 'bg-yellow-500 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
