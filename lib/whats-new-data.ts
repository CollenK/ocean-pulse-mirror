export type ChangeCategory = 'new' | 'improved' | 'fixed';

export interface ChangeEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  category: ChangeCategory;
  title: string;
  description: string;
}

export const CATEGORY_CONFIG: Record<ChangeCategory, { label: string; icon: string; color: string; bg: string }> = {
  new: { label: 'New', icon: 'fi-rr-sparkles', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  improved: { label: 'Improved', icon: 'fi-rr-arrow-up', color: 'text-blue-600', bg: 'bg-blue-50' },
  fixed: { label: 'Fixed', icon: 'fi-rr-wrench-simple', color: 'text-amber-600', bg: 'bg-amber-50' },
};

/**
 * Changelog entries, newest first.
 * Keep language simple and non-technical. Any user should understand these.
 */
export const CHANGELOG: ChangeEntry[] = [
  // 2026-03-16 - Beach & Coastal Conditions
  {
    date: '2026-03-16',
    category: 'new',
    title: 'Real-time beach and coastal conditions',
    description: 'Each MPA page now shows live weather, water temperature, wave height, UV levels, wind, and visibility so you can plan your visit before heading out.',
  },
  {
    date: '2026-03-16',
    category: 'new',
    title: 'Swim safety and UV advisories',
    description: 'Automatic safety banners warn you when waves, currents, or UV levels could be dangerous. The app checks conditions and gives clear advice so you can stay safe.',
  },
  {
    date: '2026-03-16',
    category: 'new',
    title: '"What\'s Around Today?" sightings feed',
    description: 'See which species other visitors have spotted near this MPA in the last 7 days, plus a monthly marine wildlife tip to help you know what to look for.',
  },

  // 2026-03-16 - Verification system
  {
    date: '2026-03-16',
    category: 'new',
    title: 'Community verification for species sightings',
    description: 'Other users can now confirm or suggest corrections to species identifications on your observations. When enough people agree, the observation gets upgraded to "Verified" or "Research Grade", making the data more reliable for everyone.',
  },
  {
    date: '2026-03-16',
    category: 'new',
    title: 'Quality badges on observations',
    description: 'Every observation now shows a quality badge: Casual, Unverified, Verified, or Research Grade. This helps you see at a glance how trustworthy each sighting is.',
  },
  {
    date: '2026-03-16',
    category: 'new',
    title: 'Notification system',
    description: 'You now get notified when someone verifies your observation or when your sighting reaches a new quality level. Look for the bell icon in the top bar.',
  },
  {
    date: '2026-03-16',
    category: 'new',
    title: 'Dedicated verification page',
    description: 'A new "Verify" page lets you browse observations that need identification help. Contributing takes just a few taps.',
  },
  {
    date: '2026-03-16',
    category: 'improved',
    title: 'Observation detail view',
    description: 'Tapping "View Details" on an observation now opens a full view with the photo, species info, location, health score, and community verification status.',
  },
  {
    date: '2026-03-16',
    category: 'improved',
    title: 'Filter reports by quality',
    description: 'The live reports section on each MPA page now has filter pills so you can view only verified observations, unverified ones, or research grade data.',
  },
  {
    date: '2026-03-16',
    category: 'improved',
    title: 'Smarter health scores',
    description: 'MPA health scores now only factor in observations that have been verified by the community, making the scores more accurate and trustworthy.',
  },

  // 2026-03-11
  {
    date: '2026-03-11',
    category: 'improved',
    title: 'Faster and more reliable data loading',
    description: 'Environmental data, species information, and abundance trends now load faster thanks to a new server-side processing system.',
  },
  {
    date: '2026-03-11',
    category: 'new',
    title: 'Automatic offline sync',
    description: 'Observations you submit while offline are now automatically synced when your connection returns. No more manual syncing needed.',
  },
  {
    date: '2026-03-11',
    category: 'new',
    title: 'Download your data',
    description: 'You can now export all your personal data (observations, saved MPAs, health assessments) as a file from your Profile page.',
  },
  {
    date: '2026-03-11',
    category: 'new',
    title: 'Account deletion',
    description: 'You can now permanently delete your account and all associated data from the Profile page if you choose to leave.',
  },
  {
    date: '2026-03-11',
    category: 'improved',
    title: 'Security and privacy improvements',
    description: 'We have added stronger security protections across the app, including improved session handling, photo upload safety checks, and stricter data access controls.',
  },

  // 2026-02-27 to 2026-03-05
  {
    date: '2026-03-05',
    category: 'new',
    title: 'Offshore wind farm map layer',
    description: 'You can now see offshore wind farms on the map, color-coded by their development status (operational, under construction, planned). Toggle this layer on or off from the map filters.',
  },
  {
    date: '2026-03-05',
    category: 'new',
    title: 'Wind farm and MPA conflict detection',
    description: 'When a wind farm overlaps with an MPA, the app highlights it with an alert. Check the MPA detail page to see which wind farms are nearby and their potential impact.',
  },
  {
    date: '2026-02-27',
    category: 'improved',
    title: 'Richer wind farm details',
    description: 'Wind farm cards now show capacity, turbine count, developer, water depth, and foundation type when available, drawn from multiple European data sources.',
  },
];

export interface GroupedChanges {
  label: string;
  entries: ChangeEntry[];
}

/**
 * Groups changelog entries into time-based sections relative to today.
 */
export function groupChangesByPeriod(entries: ChangeEntry[]): GroupedChanges[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const periods: { label: string; maxDaysAgo: number; entries: ChangeEntry[] }[] = [
    { label: 'This Week', maxDaysAgo: 7, entries: [] },
    { label: 'Last 2 Weeks', maxDaysAgo: 14, entries: [] },
    { label: 'This Month', maxDaysAgo: 30, entries: [] },
    { label: 'Earlier', maxDaysAgo: Infinity, entries: [] },
  ];

  for (const entry of entries) {
    const entryDate = new Date(entry.date + 'T00:00:00');
    const daysAgo = Math.floor((todayStart.getTime() - entryDate.getTime()) / 86400000);

    for (const period of periods) {
      if (daysAgo < period.maxDaysAgo) {
        period.entries.push(entry);
        break;
      }
    }
  }

  return periods.filter(p => p.entries.length > 0).map(p => ({
    label: p.label,
    entries: p.entries,
  }));
}

/**
 * Returns the date of the most recent changelog entry.
 */
export function getLatestChangeDate(): string {
  return CHANGELOG[0]?.date ?? '';
}
