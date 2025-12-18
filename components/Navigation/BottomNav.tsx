'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/', icon: '🗺️', label: 'Map' },
    { href: '/nearby', icon: '📍', label: 'Nearby' },
    { href: '/species', icon: '🐠', label: 'Species' },
    { href: '/observe', icon: '📷', label: 'Observe' },
    { href: '/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-all duration-200
                touch-target
                ${
                  isActive
                    ? 'text-cyan-600 scale-105'
                    : 'text-gray-600 hover:text-gray-900 active:scale-95'
                }
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-2xl mb-0.5 transition-transform duration-200">
                {item.icon}
              </span>
              <span
                className={`text-xs font-medium transition-all duration-200 ${
                  isActive ? 'font-bold' : ''
                }`}
              >
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 ml-6 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 w-12 h-1 bg-cyan-600 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
