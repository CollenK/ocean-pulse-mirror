'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui';
import { getCurrentMarineTip } from '@/lib/marine-tips';

interface ObservationLike {
  report_type?: string;
  reportType?: string;
  species_name?: string | null;
  speciesName?: string | null;
  created_at?: string;
  timestamp?: number;
}

interface WhatsAroundTodayProps {
  observations: ObservationLike[];
}

interface SpeciesGroup {
  name: string;
  count: number;
  mostRecent: number;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

export function WhatsAroundToday({ observations }: WhatsAroundTodayProps) {
  const tip = getCurrentMarineTip();

  const recentSightings = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Filter to species sightings from last 7 days
    // Supports both snake_case (DB) and camelCase (local) field names
    const recent = observations.filter((obs) => {
      const type = obs.report_type || obs.reportType;
      const name = obs.species_name || obs.speciesName;
      const ts = obs.created_at ? new Date(obs.created_at).getTime() : obs.timestamp;
      return type === 'species_sighting' && ts && ts > sevenDaysAgo && name;
    });

    // Group by species name
    const grouped = new Map<string, SpeciesGroup>();
    for (const obs of recent) {
      const name = (obs.species_name || obs.speciesName)!;
      const ts = obs.created_at ? new Date(obs.created_at).getTime() : (obs.timestamp || 0);
      const existing = grouped.get(name);
      if (existing) {
        existing.count++;
        existing.mostRecent = Math.max(existing.mostRecent, ts);
      } else {
        grouped.set(name, { name, count: 1, mostRecent: ts });
      }
    }

    // Sort by most recent
    return Array.from(grouped.values()).sort(
      (a, b) => b.mostRecent - a.mostRecent
    );
  }, [observations]);

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
        <Icon name="binoculars" size="sm" className="text-cyan-600" />
        What's Around Today?
      </h4>

      {recentSightings.length > 0 ? (
        <div className="space-y-2">
          {recentSightings.slice(0, 8).map((species) => (
            <motion.div
              key={species.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-cyan-50/50 border border-cyan-100"
            >
              <div className="flex items-center gap-2">
                <Icon name="fish" size="sm" className="text-cyan-600" />
                <span className="text-sm font-medium text-gray-800">
                  {species.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>
                  {species.count} {species.count === 1 ? 'sighting' : 'sightings'}
                </span>
                <span>{formatTimeAgo(species.mostRecent)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <Icon name="binoculars" className="text-gray-300 text-2xl mb-2" />
          <p className="text-sm text-gray-500">
            No species sightings reported in the last 7 days
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Be the first to report what you see!
          </p>
        </div>
      )}

      {/* Monthly marine tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-3 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Icon name={tip.icon} size="sm" className="text-teal-600" />
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
            Did you know?
          </span>
        </div>
        <p className="text-sm font-medium text-gray-800 mb-1">{tip.title}</p>
        <p className="text-xs text-gray-600 leading-relaxed">{tip.body}</p>
      </motion.div>
    </div>
  );
}
