'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CHANGELOG, CATEGORY_CONFIG, groupChangesByPeriod, getLatestChangeDate } from '@/lib/whats-new-data';
import type { ChangeEntry } from '@/lib/whats-new-data';

const LAST_VIEWED_KEY = 'ocean-pulse-whats-new-last-viewed';

function markAsViewed() {
  try {
    localStorage.setItem(LAST_VIEWED_KEY, getLatestChangeDate());
  } catch { /* localStorage unavailable */ }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EntryCard({ entry, index }: { entry: ChangeEntry; index: number }) {
  const config = CATEGORY_CONFIG[entry.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-3 py-4"
    >
      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <i className={`fi ${config.icon} ${config.color} text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[10px] text-gray-300">
            {formatDate(entry.date)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 leading-snug">{entry.title}</p>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{entry.description}</p>
      </div>
    </motion.div>
  );
}

export default function WhatsNewPage() {
  useEffect(() => {
    markAsViewed();
  }, []);

  const groups = groupChangesByPeriod(CHANGELOG);

  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-emerald-400 pt-4 pb-16 px-6">
        <div className="max-w-screen-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <i className="fi fi-rr-sparkles text-white text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">What's New</h1>
                <p className="text-white/70 text-sm">Recent updates and improvements</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-md mx-auto px-6 -mt-10">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {groups.map((group, gi) => (
            <div key={group.label}>
              {/* Period heading */}
              <div className={`px-5 py-3 bg-gray-50 ${gi > 0 ? 'border-t border-gray-100' : ''}`}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </h2>
              </div>

              {/* Entries */}
              <div className="px-5 divide-y divide-gray-100">
                {group.entries.map((entry, ei) => (
                  <EntryCard key={`${entry.date}-${entry.title}`} entry={entry} index={gi * 5 + ei} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">
            Have feedback or a feature request? Let us know at{' '}
            <a
              href="https://www.balean.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-balean-cyan hover:underline"
            >
              balean.org
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
