'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface NavItem {
  href: string;
  icon: string;
  iconSolid: string;
  label: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/ocean-pulse-app', icon: 'fi-rr-home', iconSolid: 'fi-sr-home', label: 'Home' },
  { href: '/ocean-pulse-app/nearby', icon: 'fi-rr-marker', iconSolid: 'fi-sr-marker', label: 'Nearby' },
  { href: '/ocean-pulse-app/indicator-species', icon: 'fi-rr-fish', iconSolid: 'fi-sr-fish', label: 'Species' },
  { href: '/ocean-pulse-app/observe', icon: 'fi-rr-camera', iconSolid: 'fi-sr-camera', label: 'Observe' },
  { href: '/ocean-pulse-app/profile', icon: 'fi-rr-user', iconSolid: 'fi-sr-user', label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  // Don't show nav on landing page or marketing pages
  if (pathname === '/' || pathname === '/landing' || pathname === '/welcome' || pathname === '/login') {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Gradient fade effect */}
      <div className="absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />

      <div className="bg-white/95 backdrop-blur-xl border-t border-balean-gray-100/50">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around items-center px-2 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/ocean-pulse-app' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center justify-center group touch-target"
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <motion.div
                    className={`
                      relative flex flex-col items-center justify-center
                      px-4 py-2 rounded-2xl
                      transition-colors duration-200
                      ${isActive
                        ? 'text-balean-cyan'
                        : 'text-balean-gray-400 group-hover:text-balean-navy'
                      }
                    `}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {/* Active indicator pill */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-balean-cyan/10 rounded-2xl"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}

                    {/* Icon */}
                    <i
                      className={`
                        ${isActive ? item.iconSolid : item.icon}
                        text-xl relative z-10
                        transition-transform duration-200
                        ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                      `}
                    />

                    {/* Label */}
                    <span
                      className={`
                        text-[10px] mt-1 relative z-10
                        transition-all duration-200
                        ${isActive ? 'font-bold' : 'font-medium'}
                      `}
                    >
                      {item.label}
                    </span>

                    {/* Badge */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="
                          absolute -top-1 -right-1
                          bg-balean-coral text-white
                          text-[9px] font-bold
                          rounded-full min-w-[16px] h-[16px]
                          flex items-center justify-center px-1
                          shadow-sm shadow-balean-coral/30
                        "
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Floating Action Button for primary actions (alternative nav style)
interface FABProps {
  onClick?: () => void;
  icon?: string;
  label: string;
}

export function FloatingActionButton({ onClick, icon = 'fi-rr-plus', label }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      className="
        fixed bottom-24 right-6 z-40
        w-14 h-14
        bg-balean-cyan text-white
        rounded-full shadow-lg shadow-balean-cyan/30
        flex items-center justify-center
        touch-target
      "
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
    >
      <i className={`${icon} text-xl`} />
    </motion.button>
  );
}
