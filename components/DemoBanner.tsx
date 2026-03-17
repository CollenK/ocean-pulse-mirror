'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

const DISMISSED_KEY = 'ocean-pulse-demo-banner-dismissed';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch { /* ignore */ }
  };

  return (
    <div className="sticky top-0 z-[1100] bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Icon name="info" className="text-amber-600 flex-shrink-0" size="sm" />
        <span className="text-amber-800 truncate">
          You&apos;re exploring with a demo account
        </span>
        <Link
          href="/login?signup=true"
          className="text-amber-700 font-semibold hover:text-amber-900 underline underline-offset-2 whitespace-nowrap"
        >
          Create your own account
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-amber-500 hover:text-amber-700 flex-shrink-0"
        aria-label="Dismiss demo banner"
      >
        <Icon name="cross" size="sm" />
      </button>
    </div>
  );
}
