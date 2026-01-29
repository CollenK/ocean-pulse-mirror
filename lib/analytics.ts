/**
 * Analytics tracking utilities
 * Supports Google Analytics, Plausible, and custom analytics providers
 */

import { isAnalyticsConsented } from '@/lib/cookie-consent';

// Analytics event types
export type AnalyticsEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
  data?: Record<string, any>;
};

// Custom event types for Ocean PULSE
export const EventCategory = {
  MPA: 'MPA',
  SPECIES: 'Species',
  OBSERVATION: 'Observation',
  NAVIGATION: 'Navigation',
  USER: 'User',
  PERFORMANCE: 'Performance',
  ERROR: 'Error',
} as const;

export const EventAction = {
  // MPA events
  MPA_VIEW: 'view_mpa',
  MPA_SEARCH: 'search_mpa',
  MPA_CACHE: 'cache_mpa',
  MPA_FILTER: 'filter_mpa',

  // Species events
  SPECIES_SEARCH: 'search_species',
  SPECIES_VIEW: 'view_species',
  SPECIES_FILTER: 'filter_species',

  // Observation events
  OBSERVATION_START: 'start_observation',
  OBSERVATION_PHOTO: 'capture_photo',
  OBSERVATION_SUBMIT: 'submit_observation',

  // Navigation events
  PAGE_VIEW: 'page_view',
  EXTERNAL_LINK: 'click_external_link',

  // User events
  LOCATION_PERMISSION: 'request_location',
  CAMERA_PERMISSION: 'request_camera',
  INSTALL_PWA: 'install_pwa',

  // Performance events
  LOAD_TIME: 'page_load_time',
  API_CALL: 'api_call',
  CACHE_HIT: 'cache_hit',
  CACHE_MISS: 'cache_miss',

  // Error events
  ERROR: 'error',
  API_ERROR: 'api_error',
} as const;

/**
 * Check if analytics is available and enabled
 */
function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for DNT (Do Not Track)
  if (navigator.doNotTrack === '1' || (window as any).doNotTrack === '1') {
    return false;
  }

  // Check GDPR cookie consent
  if (!isAnalyticsConsented()) {
    return false;
  }

  return true;
}

// --- Google Analytics dynamic loading ---

let gaLoaded = false;

/**
 * Dynamically load Google Analytics gtag.js.
 * Only call after the user has consented to analytics cookies.
 */
export function loadGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (gaLoaded) return;

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return;

  // Clear any previous disable flag (in case consent was revoked then re-granted)
  delete (window as any)[`ga-disable-${gaId}`];

  // Inject the gtag.js script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: unknown[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag('js', new Date());
  gtag('config', gaId, { send_page_view: false });

  gaLoaded = true;
}

/**
 * Disable Google Analytics and clear its cookies.
 * Called when the user revokes analytics consent.
 */
export function disableGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (gaId) {
    (window as any)[`ga-disable-${gaId}`] = true;
  }

  // Remove GA cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }

  gaLoaded = false;
}

/**
 * Track event with Google Analytics
 */
function trackWithGoogleAnalytics(event: AnalyticsEvent) {
  if (typeof window === 'undefined' || !(window as any).gtag) return;

  (window as any).gtag('event', event.action, {
    event_category: event.category,
    event_label: event.label,
    value: event.value,
    ...event.data,
  });
}

/**
 * Track event with Plausible
 */
function trackWithPlausible(event: AnalyticsEvent) {
  if (typeof window === 'undefined' || !(window as any).plausible) return;

  (window as any).plausible(event.action, {
    props: {
      category: event.category,
      label: event.label,
      ...event.data,
    },
  });
}

/**
 * Main analytics tracking function
 */
export function trackEvent(event: AnalyticsEvent) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  // Track with all available providers
  trackWithGoogleAnalytics(event);
  trackWithPlausible(event);
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  trackEvent({
    action: EventAction.PAGE_VIEW,
    category: EventCategory.NAVIGATION,
    label: path,
    data: { path, title },
  });
}

/**
 * Track MPA view
 */
export function trackMPAView(mpaId: string, mpaName: string) {
  trackEvent({
    action: EventAction.MPA_VIEW,
    category: EventCategory.MPA,
    label: mpaName,
    data: { mpaId, mpaName },
  });
}

/**
 * Track species search
 */
export function trackSpeciesSearch(query: string, resultCount: number) {
  trackEvent({
    action: EventAction.SPECIES_SEARCH,
    category: EventCategory.SPECIES,
    label: query,
    value: resultCount,
    data: { query, resultCount },
  });
}

/**
 * Track observation submission
 */
export function trackObservationSubmit(speciesName: string, hasPhoto: boolean, hasLocation: boolean) {
  trackEvent({
    action: EventAction.OBSERVATION_SUBMIT,
    category: EventCategory.OBSERVATION,
    label: speciesName,
    data: { speciesName, hasPhoto, hasLocation },
  });
}

/**
 * Track API performance
 */
export function trackAPICall(endpoint: string, duration: number, success: boolean) {
  trackEvent({
    action: EventAction.API_CALL,
    category: EventCategory.PERFORMANCE,
    label: endpoint,
    value: Math.round(duration),
    data: { endpoint, duration, success },
  });
}

/**
 * Track errors
 */
export function trackError(error: Error, context?: string) {
  trackEvent({
    action: EventAction.ERROR,
    category: EventCategory.ERROR,
    label: error.message,
    data: {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context,
    },
  });
}

/**
 * Track cache hit/miss for performance monitoring
 */
export function trackCachePerformance(cacheKey: string, isHit: boolean) {
  trackEvent({
    action: isHit ? EventAction.CACHE_HIT : EventAction.CACHE_MISS,
    category: EventCategory.PERFORMANCE,
    label: cacheKey,
    data: { cacheKey, isHit },
  });
}

/**
 * Track user permissions
 */
export function trackPermissionRequest(permission: 'location' | 'camera', granted: boolean) {
  trackEvent({
    action: permission === 'location' ? EventAction.LOCATION_PERMISSION : EventAction.CAMERA_PERMISSION,
    category: EventCategory.USER,
    label: granted ? 'granted' : 'denied',
    data: { permission, granted },
  });
}

/**
 * Track PWA installation
 */
export function trackPWAInstall() {
  trackEvent({
    action: EventAction.INSTALL_PWA,
    category: EventCategory.USER,
    label: 'pwa_installed',
  });
}

/**
 * Set analytics consent
 */
export function setAnalyticsConsent(consent: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('analytics-consent', consent.toString());
}

/**
 * Get analytics consent status
 */
export function getAnalyticsConsent(): boolean | null {
  if (typeof window === 'undefined') return null;
  const consent = localStorage.getItem('analytics-consent');
  if (consent === null) return null;
  return consent === 'true';
}

/**
 * Initialize analytics (call once on app load)
 */
export function initializeAnalytics() {
  if (typeof window === 'undefined') return;

  // Track PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    trackEvent({
      action: 'pwa_prompt_shown',
      category: EventCategory.USER,
      label: 'install_prompt',
    });
  });

  // Track PWA install
  window.addEventListener('appinstalled', () => {
    trackPWAInstall();
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackEvent({
        action: 'page_hidden',
        category: EventCategory.NAVIGATION,
        label: window.location.pathname,
      });
    } else {
      trackEvent({
        action: 'page_visible',
        category: EventCategory.NAVIGATION,
        label: window.location.pathname,
      });
    }
  });

}
