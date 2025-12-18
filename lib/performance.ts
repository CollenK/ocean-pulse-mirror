/**
 * Performance monitoring and optimization utilities
 */

/**
 * Report Web Vitals to console (development) or analytics (production)
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}:`, metric.value.toFixed(2), 'ms');
  }

  // In production, send to analytics service
  // Example: Google Analytics, Vercel Analytics, etc.
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

/**
 * Measure component render time
 */
export function measureRender(componentName: string, callback: () => void) {
  if (typeof performance === 'undefined') {
    callback();
    return;
  }

  const start = performance.now();
  callback();
  const end = performance.now();

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Render] ${componentName}:`, (end - start).toFixed(2), 'ms');
  }
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if device has slow connection
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const conn = (navigator as any).connection;
  return conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string) {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Lazy load images with IntersectionObserver
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  options: IntersectionObserverInit = {}
) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLImageElement;
          const src = target.dataset.src;

          if (src) {
            target.src = src;
            target.removeAttribute('data-src');
          }

          observer.unobserve(target);
        }
      });
    }, options);

    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    const src = img.dataset.src;
    if (src) {
      img.src = src;
    }
  }
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(callback: () => void) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Measure and log cache hit rates
 */
export class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  report() {
    console.log(`[Cache ${this.name}] Hit rate: ${this.getHitRate().toFixed(1)}%`, {
      hits: this.hits,
      misses: this.misses,
    });
  }
}

/**
 * Monitor memory usage (development only)
 */
export function monitorMemory() {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof performance === 'undefined' || !(performance as any).memory) return;

  const memory = (performance as any).memory;
  console.log('[Memory]', {
    used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
    total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
    limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
  });
}
