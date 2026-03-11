import * as Sentry from '@sentry/nextjs';

export function captureError(error: unknown, context?: Record<string, string>): void {
  console.error(error);
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
