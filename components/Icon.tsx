/**
 * Icon Component
 * Wrapper for Flaticon UIcons (regular rounded style)
 *
 * Usage:
 * <Icon name="map" className="text-xl text-ocean-accent" />
 */

interface IconProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'text-sm',      // 14px
  md: 'text-base',    // 16px
  lg: 'text-xl',      // 20px
  xl: 'text-2xl',     // 24px
};

export function Icon({ name, className = '', size = 'md' }: IconProps) {
  const sizeClass = sizeClasses[size];

  return (
    <i
      className={`fi fi-rr-${name} ${sizeClass} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Icon name reference (common icons used in Ocean PULSE):
 *
 * Navigation:
 * - map, map-marker, marker, compass
 * - search, filter, menu-burger, settings
 *
 * Marine/Ocean:
 * - fish, whale, turtle, coral, wave, water
 * - shield-check, shield (protection)
 * - tree (conservation)
 *
 * Actions:
 * - camera, picture, image
 * - heart, star (favorites)
 * - plus, add, create
 * - trash, delete
 * - edit, pencil
 * - share, send
 *
 * UI:
 * - check, cross, circle-xmark
 * - arrow-right, arrow-left, arrow-up, arrow-down
 * - angle-right, angle-left, angle-up, angle-down
 * - refresh, sync
 * - info, exclamation, question
 * - eye, eye-crossed
 * - download, upload
 *
 * Data:
 * - chart-line, chart-pie, chart-histogram
 * - calendar, clock, time
 * - document, folder, file
 * - list, grid, apps
 *
 * User:
 * - user, users, user-add
 * - bell, notification
 * - lock, unlock
 * - sign-out, sign-in
 */
