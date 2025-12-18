'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initializeAnalytics, trackPageView } from '@/lib/analytics';
import { reportWebVitals } from '@/lib/performance';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize analytics on mount
  useEffect(() => {
    initializeAnalytics();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname, document.title);
    }
  }, [pathname]);

  // Report Web Vitals (optional - enable in production)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // This would be called by Next.js Web Vitals if configured
      // For now, we'll skip automatic tracking
      // You can enable this in _app.tsx with: export { reportWebVitals } from '@/lib/performance';
    }
  }, []);

  return <>{children}</>;
}
