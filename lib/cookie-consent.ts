/**
 * Cookie consent state management utilities.
 * Single source of truth for GDPR-compliant cookie preferences.
 */

export interface CookieConsentPreferences {
  strictlyNecessary: true;
  analytics: boolean;
}

export interface StoredCookieConsent {
  preferences: CookieConsentPreferences;
  timestamp: string;
  version: number;
}

const COOKIE_CONSENT_KEY = 'cookieConsent';
const LEGACY_ANALYTICS_KEY = 'analytics-consent';
const CONSENT_VERSION = 1;

/** Custom event dispatched on window when consent changes. */
export const CONSENT_CHANGED_EVENT = 'cookie-consent-changed';

/**
 * Get stored cookie consent, or null if user has not yet responded.
 */
export function getCookieConsent(): StoredCookieConsent | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCookieConsent;
  } catch {
    return null;
  }
}

/**
 * Save cookie consent preferences to localStorage.
 * Dispatches a custom event so other parts of the app can react.
 */
export function setCookieConsent(preferences: CookieConsentPreferences): void {
  if (typeof window === 'undefined') return;

  const stored: StoredCookieConsent = {
    preferences,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(stored));

  // Keep legacy key in sync for backward compatibility with lib/analytics.ts
  localStorage.setItem(LEGACY_ANALYTICS_KEY, preferences.analytics.toString());

  window.dispatchEvent(
    new CustomEvent(CONSENT_CHANGED_EVENT, { detail: preferences })
  );
}

/**
 * Check if the user has made any consent choice.
 */
export function hasConsentBeenGiven(): boolean {
  return getCookieConsent() !== null;
}

/**
 * Check if analytics cookies are consented to.
 */
export function isAnalyticsConsented(): boolean {
  return getCookieConsent()?.preferences.analytics ?? false;
}

/**
 * Accept all cookie categories.
 */
export function acceptAllCookies(): void {
  setCookieConsent({ strictlyNecessary: true, analytics: true });
}

/**
 * Reject all optional cookie categories.
 */
export function rejectAllCookies(): void {
  setCookieConsent({ strictlyNecessary: true, analytics: false });
}
