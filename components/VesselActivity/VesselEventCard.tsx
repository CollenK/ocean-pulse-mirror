'use client';

/**
 * VesselEventCard Component
 *
 * Displays a single vessel activity event from Global Fishing Watch data.
 * Shows event type, vessel info, timestamp, and severity.
 */

import { motion } from 'framer-motion';
import type { GFWVesselActivity } from '@/types/gfw';

interface VesselEventCardProps {
  event: GFWVesselActivity;
  onClick?: (event: GFWVesselActivity) => void;
}

// Event type icons and colors
const EVENT_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  fishing: {
    icon: 'fi-rr-fishing-rod',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  encounter: {
    icon: 'fi-rr-arrow-right-arrow-left',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  loitering: {
    icon: 'fi-rr-marker-time',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  port_visit: {
    icon: 'fi-rr-anchor',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  gap: {
    icon: 'fi-rr-signal-alt-slash',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};

// Severity badge colors
const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  alert: 'bg-red-100 text-red-700',
};

export function VesselEventCard({ event, onClick }: VesselEventCardProps) {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.fishing;
  const severityColor = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info;

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format duration
  const formatDuration = (hours?: number): string => {
    if (!hours) return '';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={() => onClick?.(event)}
      className={`
        p-3 rounded-xl border border-balean-gray-100 bg-white
        hover:border-balean-gray-200 hover:shadow-sm
        transition-all cursor-pointer
      `}
    >
      <div className="flex items-start gap-3">
        {/* Event Type Icon */}
        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <i className={`fi ${config.icon} ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-balean-navy truncate">
              {event.vessel.name}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${severityColor}`}>
              {event.type.replace('_', ' ')}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-balean-gray-600 mb-2 line-clamp-2">
            {event.description}
          </p>

          {/* Meta Row */}
          <div className="flex items-center gap-3 text-[10px] text-balean-gray-400">
            {/* Flag */}
            <div className="flex items-center gap-1">
              <i className="fi fi-rr-flag" />
              <span>{event.vessel.flagName}</span>
            </div>

            {/* Duration */}
            {event.duration && (
              <div className="flex items-center gap-1">
                <i className="fi fi-rr-clock" />
                <span>{formatDuration(event.duration)}</span>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1 ml-auto">
              <i className="fi fi-rr-calendar" />
              <span>{formatTimestamp(event.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compact version for inline display
export function VesselEventCardCompact({ event }: { event: GFWVesselActivity }) {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.fishing;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className={`w-6 h-6 rounded ${config.bgColor} flex items-center justify-center`}>
        <i className={`fi ${config.icon} ${config.color} text-xs`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-balean-navy truncate">{event.vessel.name}</span>
      </div>
      <span className="text-[10px] text-balean-gray-400">{event.vessel.flagName}</span>
    </div>
  );
}
