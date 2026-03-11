/**
 * In-memory rate limiter using a sliding window approach.
 *
 * Suitable for low-traffic scenarios (e.g., closed beta) where most
 * requests hit the same serverless instance. Not a substitute for
 * infrastructure-level rate limiting in high-traffic production.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Window duration in milliseconds */
  interval: number;
  /** Maximum number of requests allowed per window */
  limit: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const CLEANUP_INTERVAL_MS = 60_000;

export function rateLimit(config: RateLimitConfig): (ip: string) => RateLimitResult {
  const { interval, limit } = config;
  const store = new Map<string, RateLimitEntry>();

  let lastCleanup = Date.now();

  function cleanup(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
      return;
    }
    lastCleanup = now;
    for (const [key, entry] of store) {
      if (now >= entry.resetTime) {
        store.delete(key);
      }
    }
  }

  return function check(ip: string): RateLimitResult {
    cleanup();

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now >= entry.resetTime) {
      const resetTime = now + interval;
      store.set(ip, { count: 1, resetTime });
      return { success: true, remaining: limit - 1, reset: resetTime };
    }

    entry.count += 1;

    if (entry.count > limit) {
      return {
        success: false,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    return {
      success: true,
      remaining: limit - entry.count,
      reset: entry.resetTime,
    };
  };
}

export function getRequestIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
