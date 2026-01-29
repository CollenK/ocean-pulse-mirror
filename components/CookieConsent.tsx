'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import {
  getCookieConsent,
  hasConsentBeenGiven,
  acceptAllCookies,
  rejectAllCookies,
  setCookieConsent,
} from '@/lib/cookie-consent';

/** Custom event name used to open the preferences modal externally. */
export const OPEN_COOKIE_PREFERENCES_EVENT = 'open-cookie-preferences';

/** Dispatch this to open the cookie preferences modal from anywhere. */
export function openCookiePreferences(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
  }
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check consent on mount
  useEffect(() => {
    setMounted(true);
    if (!hasConsentBeenGiven()) {
      setShowBanner(true);
    }
    const existing = getCookieConsent();
    if (existing) {
      setAnalyticsEnabled(existing.preferences.analytics);
    }
  }, []);

  // Listen for external requests to open preferences (e.g. from Profile page)
  useEffect(() => {
    const handler = () => {
      const existing = getCookieConsent();
      if (existing) {
        setAnalyticsEnabled(existing.preferences.analytics);
      }
      setShowBanner(false);
      setShowPreferences(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler);
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleRejectAll = () => {
    rejectAllCookies();
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleSavePreferences = () => {
    setCookieConsent({
      strictlyNecessary: true,
      analytics: analyticsEnabled,
    });
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleOpenPreferences = () => {
    const existing = getCookieConsent();
    if (existing) {
      setAnalyticsEnabled(existing.preferences.analytics);
    }
    setShowBanner(false);
    setShowPreferences(true);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Cookie Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[9999]"
            role="dialog"
            aria-label="Cookie consent"
          >
            <div className="bg-balean-coral backdrop-blur-xl border-t border-white/20 px-6 py-5 pb-24 sm:pb-6">
              <div className="max-w-screen-xl mx-auto">
                <div className="flex items-start gap-3 mb-4">
                  <i className="fi fi-rr-lock text-balean-yellow text-xl mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <h2 className="text-white font-semibold text-lg">Cookie Preferences</h2>
                    <p className="text-white/70 text-sm mt-1">
                      We use cookies to analyse site usage and improve your experience.
                      You can choose which cookies to accept.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 px-5 py-3 bg-balean-cyan text-white font-semibold rounded-xl hover:bg-balean-cyan-dark transition-colors text-sm"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="flex-1 px-5 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors text-sm"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={handleOpenPreferences}
                    className="flex-1 px-5 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors text-sm"
                  >
                    Customise
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <Modal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Cookie Preferences"
        subtitle="Choose which cookies you want to accept"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleRejectAll}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-balean-gray-100 text-balean-navy hover:bg-balean-gray-200 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={handleSavePreferences}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-balean-cyan text-white hover:bg-balean-cyan-dark transition-colors"
            >
              Save Preferences
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Strictly Necessary */}
          <div className="flex items-center justify-between p-4 bg-balean-gray-50 rounded-xl">
            <div className="pr-4">
              <p className="font-semibold text-balean-navy">Strictly Necessary</p>
              <p className="text-sm text-balean-gray-400 mt-1">
                Required for the app to function. These cannot be disabled.
              </p>
            </div>
            <div
              className="w-12 h-7 bg-balean-cyan rounded-full flex items-center justify-end px-1 cursor-not-allowed flex-shrink-0"
              aria-label="Strictly necessary cookies are always enabled"
            >
              <div className="w-5 h-5 bg-white rounded-full shadow-md" />
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between p-4 bg-balean-gray-50 rounded-xl">
            <div className="pr-4">
              <p className="font-semibold text-balean-navy">Analytics</p>
              <p className="text-sm text-balean-gray-400 mt-1">
                Help us understand how you use the app so we can improve it.
              </p>
            </div>
            <button
              onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
              className="relative flex-shrink-0"
              role="switch"
              aria-checked={analyticsEnabled}
              aria-label="Analytics cookies"
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors duration-200 ${
                  analyticsEnabled ? 'bg-balean-cyan' : 'bg-balean-gray-200'
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                  animate={{ x: analyticsEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
