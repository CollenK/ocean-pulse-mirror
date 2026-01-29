'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  initializeAnalytics,
  trackPageView,
  loadGoogleAnalytics,
  disableGoogleAnalytics,
} from '@/lib/analytics';
import { isAnalyticsConsented, CONSENT_CHANGED_EVENT } from '@/lib/cookie-consent';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize analytics and load GA if consent was already given
  useEffect(() => {
    initializeAnalytics();

    if (isAnalyticsConsented()) {
      loadGoogleAnalytics();
    }
  }, []);

  // React to consent changes in real time
  useEffect(() => {
    const handleConsentChanged = (event: Event) => {
      const { detail } = event as CustomEvent;
      if (detail?.analytics) {
        loadGoogleAnalytics();
      } else {
        disableGoogleAnalytics();
      }
    };

    window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChanged);
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname, document.title);
    }
  }, [pathname]);

  return <>{children}</>;
}
