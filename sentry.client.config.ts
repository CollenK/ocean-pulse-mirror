import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay - capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Only enable in production or if DSN is set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome-extension:\/\//i,
    // Network errors that are expected
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User-triggered navigation
    'ResizeObserver loop',
    // Third-party scripts
    /^Script error\.?$/,
  ],

  // Before sending, filter sensitive data
  beforeSend(event) {
    // Remove sensitive query params
    if (event.request?.query_string) {
      const params = new URLSearchParams(event.request.query_string);
      params.delete('code');
      params.delete('token');
      event.request.query_string = params.toString();
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media for privacy
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
