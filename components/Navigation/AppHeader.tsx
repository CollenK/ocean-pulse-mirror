'use client';

import Link from 'next/link';
import { UserMenu } from '@/components/UserMenu';

export function AppHeader() {
  return (
    <header className="h-16 bg-balean-navy px-4 flex items-center justify-between z-[1002] relative">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-balean-cyan via-balean-coral to-balean-yellow flex items-center justify-center shadow-lg">
            <i className="fi fi-rr-whale text-white text-lg" />
          </div>
          <div>
            <h1 className="font-display text-lg text-white tracking-tight">Ocean PULSE</h1>
            <p className="text-xs text-white/50">by Balean</p>
          </div>
        </Link>
      </div>
      <UserMenu />
    </header>
  );
}
