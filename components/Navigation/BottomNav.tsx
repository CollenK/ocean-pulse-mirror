'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '../Icon';

interface NavItem {
  href: string;
  iconName: string;
  label: string;
  badge?: number;
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/', iconName: 'map', label: 'Map' },
    { href: '/nearby', iconName: 'marker', label: 'Nearby' },
    { href: '/species', iconName: 'fish', label: 'Species' },
    { href: '/observe', iconName: 'camera', label: 'Observe' },
    { href: '/profile', iconName: 'user', label: 'Profile' },
  ];

  return (
    <nav
      className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="bg-white/95 backdrop-blur-lg rounded-full shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-gray-100/50">
        <div className="flex justify-around items-center px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center
                  px-4 py-2 rounded-full
                  transition-all duration-300
                  touch-target
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-ocean-primary to-ocean-accent text-white scale-110 shadow-lg'
                      : 'text-gray-500 hover:text-ocean-primary hover:bg-gray-50 active:scale-95'
                  }
                `}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  name={item.iconName}
                  className={`text-xl transition-transform duration-300 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                <span
                  className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  {item.label}
                </span>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
