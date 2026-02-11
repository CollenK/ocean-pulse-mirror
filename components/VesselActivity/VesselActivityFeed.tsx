'use client';

/**
 * VesselActivityFeed Component
 *
 * Displays a feed of recent vessel activity events near an MPA.
 * Shows fishing events, encounters, loitering, and other vessel behavior.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VesselEventCard } from './VesselEventCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { GFWVesselActivity, GFWEventType } from '@/types/gfw';

interface VesselActivityFeedProps {
  events: GFWVesselActivity[];
  loading?: boolean;
  error?: Error | null;
  maxItems?: number;
  onEventClick?: (event: GFWVesselActivity) => void;
  showFilters?: boolean;
  title?: string;
}

// Filter options for event types
const EVENT_FILTERS: { id: GFWEventType | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'fi-rr-layers' },
  { id: 'fishing', label: 'Fishing', icon: 'fi-rr-fishing-rod' },
  { id: 'encounter', label: 'Encounters', icon: 'fi-rr-arrow-right-arrow-left' },
  { id: 'loitering', label: 'Loitering', icon: 'fi-rr-marker-time' },
];

export function VesselActivityFeed({
  events,
  loading = false,
  error = null,
  maxItems = 10,
  onEventClick,
  showFilters = true,
  title = 'Vessel Activity',
}: VesselActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState<GFWEventType | 'all'>('all');
  const [expanded, setExpanded] = useState(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events;
    return events.filter(e => e.type === activeFilter);
  }, [events, activeFilter]);

  // Limit displayed events
  const displayedEvents = expanded ? filteredEvents : filteredEvents.slice(0, maxItems);
  const hasMore = filteredEvents.length > maxItems;

  // Count by type
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    events.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-32 h-5" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <i className="fi fi-rr-ship text-balean-cyan" />
          <h3 className="font-semibold text-balean-navy">{title}</h3>
        </div>
        <div className="text-center py-6">
          <i className="fi fi-rr-exclamation text-red-400 text-2xl mb-2" />
          <p className="text-sm text-balean-gray-500">Failed to load vessel activity</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <i className="fi fi-rr-ship text-balean-cyan" />
          <h3 className="font-semibold text-balean-navy">{title}</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-balean-gray-50 flex items-center justify-center mx-auto mb-3">
            <i className="fi fi-rr-ship text-balean-gray-300 text-xl" />
          </div>
          <p className="text-sm text-balean-gray-500 mb-1">No recent vessel activity</p>
          <p className="text-xs text-balean-gray-400">
            Check back later for updates from Global Fishing Watch
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="fi fi-rr-ship text-balean-cyan" />
          <h3 className="font-semibold text-balean-navy">{title}</h3>
          <span className="text-xs text-balean-gray-400 bg-balean-gray-50 px-2 py-0.5 rounded-full">
            {events.length} events
          </span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {EVENT_FILTERS.map(filter => {
            const count = eventCounts[filter.id] || 0;
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  whitespace-nowrap transition-colors
                  ${isActive
                    ? 'bg-balean-cyan text-white'
                    : 'bg-balean-gray-50 text-balean-gray-600 hover:bg-balean-gray-100'
                  }
                `}
              >
                <i className={`fi ${filter.icon}`} />
                <span>{filter.label}</span>
                {count > 0 && (
                  <span className={`
                    px-1.5 py-0.5 rounded-full text-[10px]
                    ${isActive ? 'bg-white/20' : 'bg-balean-gray-200'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayedEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
            >
              <VesselEventCard
                event={event}
                onClick={onEventClick}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show More Button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-2 text-sm text-balean-cyan hover:text-balean-cyan-dark font-medium transition-colors"
        >
          {expanded ? (
            <>
              <i className="fi fi-rr-angle-up mr-1" />
              Show less
            </>
          ) : (
            <>
              <i className="fi fi-rr-angle-down mr-1" />
              Show {filteredEvents.length - maxItems} more
            </>
          )}
        </button>
      )}

      {/* Attribution */}
      <div className="mt-3 pt-3 border-t border-balean-gray-100">
        <p className="text-[10px] text-balean-gray-400">
          Data from Global Fishing Watch. Updated every 72-96 hours.
        </p>
      </div>
    </div>
  );
}

// Compact version for sidebar
export function VesselActivityFeedCompact({
  events,
  loading = false,
  maxItems = 5,
}: {
  events: GFWVesselActivity[];
  loading?: boolean;
  maxItems?: number;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-balean-gray-400 text-center py-2">
        No recent activity
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {events.slice(0, maxItems).map(event => (
        <div
          key={event.id}
          className="flex items-center gap-2 py-1 text-xs"
        >
          <span className="text-balean-gray-600 truncate flex-1">
            {event.vessel.name}
          </span>
          <span className="text-balean-gray-400">{event.type}</span>
        </div>
      ))}
    </div>
  );
}
