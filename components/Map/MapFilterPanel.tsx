'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MPA } from '@/types';
import { getCountryName } from '@/lib/country-names';
import { getRegionsForCountry } from '@/lib/country-regions';
import { WIND_FARM_STATUS_COLORS, WIND_FARM_STATUS_LABELS, type WindFarmStatus, type WindFarmSummary } from '@/types/wind-farms';

// Filter types
export interface MapFilters {
  healthStatus: string[];
  protectionLevel: string[];
  region: string[];
  country: string[];
  areaSize: string[];
  windFarmStatus: string[];
  savedOnly: boolean;
  showFishingPressure: boolean;
  showSST: boolean;
  showWindFarms: boolean;
  showLitterHotspots: boolean;
}

export const DEFAULT_FILTERS: MapFilters = {
  healthStatus: [],
  protectionLevel: [],
  region: [],
  country: [],
  areaSize: [],
  windFarmStatus: [],
  savedOnly: false,
  showFishingPressure: false,
  showSST: false,
  showWindFarms: false,
  showLitterHotspots: false,
};

// Health status categories
const HEALTH_STATUS_OPTIONS = [
  { id: 'excellent', label: 'Excellent', range: [80, 100], color: 'bg-healthy' },
  { id: 'good', label: 'Good', range: [60, 79], color: 'bg-balean-cyan' },
  { id: 'moderate', label: 'Moderate', range: [40, 59], color: 'bg-warning' },
  { id: 'poor', label: 'Needs Attention', range: [1, 39], color: 'bg-critical' },
  { id: 'pending', label: 'Pending Data', range: [0, 0], color: 'bg-balean-gray-300' },
];

// Wind farm status display order for inline legend
const WIND_FARM_STATUS_ORDER: WindFarmStatus[] = [
  'Production',
  'Under Construction',
  'Authorised',
  'Pre-Construction',
  'Planned',
  'Concept/Early Planning',
  'Decommissioned',
];

// Area size categories (km²)
const AREA_SIZE_OPTIONS = [
  { id: 'very-large', label: 'Very Large', range: [100000, Infinity], description: '> 100,000 km²' },
  { id: 'large', label: 'Large', range: [10000, 100000], description: '10K - 100K km²' },
  { id: 'medium', label: 'Medium', range: [1000, 10000], description: '1K - 10K km²' },
  { id: 'small', label: 'Small', range: [0, 1000], description: '< 1,000 km²' },
];

interface MapFilterPanelProps {
  mpas: MPA[];
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
  savedMPAIds?: string[];
  windFarmSummary?: WindFarmSummary | null;
}

interface FilterSectionProps {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ title, icon, defaultOpen = true, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-balean-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-balean-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <i className={`fi fi-rr-${icon} text-balean-cyan`} />
          <span className="font-semibold text-balean-navy text-sm">{title}</span>
        </div>
        <motion.i
          className="fi fi-rr-angle-down text-balean-gray-400 text-xs"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilterCheckboxProps {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
  hexColor?: string;
  description?: string;
}

function FilterCheckbox({ id, label, count, checked, onChange, color, hexColor, description: _description }: FilterCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between py-1.5 cursor-pointer group"
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-balean-gray-300 text-balean-cyan focus:ring-balean-cyan"
        />
        <div className="flex items-center gap-2">
          {color && (
            <div className={`w-3 h-3 rounded-full ${color}`} />
          )}
          {hexColor && !color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: hexColor }}
            />
          )}
          <span className="text-sm text-balean-gray-600 group-hover:text-balean-navy transition-colors">
            {label}
          </span>
        </div>
      </div>
      <span className="text-xs text-balean-gray-400">{count}</span>
    </label>
  );
}

interface LayerToggleProps {
  id: string;
  icon: string;
  iconColor: string;
  label: string;
  badgeLabel: string;
  badgeClasses: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}

function LayerToggle({ id, icon, iconColor, label, badgeLabel, badgeClasses, description, checked, onChange, children }: LayerToggleProps) {
  return (
    <div className="border-b border-balean-gray-100">
      <label
        htmlFor={id}
        className="flex items-center justify-between py-3 px-4 cursor-pointer group hover:bg-balean-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-balean-gray-300 text-balean-cyan focus:ring-balean-cyan"
          />
          <div className="flex items-center gap-2">
            <i className={`fi fi-rr-${icon} ${iconColor}`} />
            <span className="font-semibold text-balean-navy text-sm group-hover:text-balean-navy transition-colors">
              {label}
            </span>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClasses}`}>
          {badgeLabel}
        </span>
      </label>
      <div className="px-4 pb-3">
        <p className="text-[10px] text-balean-gray-400">{description}</p>
        {children}
      </div>
    </div>
  );
}

function useFilterCounts(mpas: MPA[]) {
  return useMemo(() => {
    const counts = {
      healthStatus: {} as Record<string, number>,
      protectionLevel: {} as Record<string, number>,
      region: {} as Record<string, number>,
      country: {} as Record<string, number>,
      areaSize: {} as Record<string, number>,
    };

    mpas.forEach((mpa) => {
      HEALTH_STATUS_OPTIONS.forEach((opt) => {
        if (mpa.healthScore >= opt.range[0] && mpa.healthScore <= opt.range[1]) {
          counts.healthStatus[opt.id] = (counts.healthStatus[opt.id] || 0) + 1;
        }
      });
      const protLevel = mpa.protectionLevel || 'Not Reported';
      counts.protectionLevel[protLevel] = (counts.protectionLevel[protLevel] || 0) + 1;
      const regions = getRegionsForCountry(mpa.country);
      regions.forEach((region) => {
        counts.region[region] = (counts.region[region] || 0) + 1;
      });
      counts.country[mpa.country] = (counts.country[mpa.country] || 0) + 1;
      AREA_SIZE_OPTIONS.forEach((opt) => {
        if (mpa.area >= opt.range[0] && mpa.area < opt.range[1]) {
          counts.areaSize[opt.id] = (counts.areaSize[opt.id] || 0) + 1;
        }
      });
    });

    return counts;
  }, [mpas]);
}

function computeFilteredCount(mpas: MPA[], filters: MapFilters, savedIdSet: Set<string>): number {
  return mpas.filter((mpa) => {
    if (filters.savedOnly && !savedIdSet.has(mpa.dbId || mpa.id)) return false;
    if (filters.healthStatus.length > 0) {
      const matchesHealth = filters.healthStatus.some((statusId) => {
        const opt = HEALTH_STATUS_OPTIONS.find((o) => o.id === statusId);
        return opt && mpa.healthScore >= opt.range[0] && mpa.healthScore <= opt.range[1];
      });
      if (!matchesHealth) return false;
    }
    if (filters.protectionLevel.length > 0) {
      if (!filters.protectionLevel.includes(mpa.protectionLevel || 'Not Reported')) return false;
    }
    if (filters.region.length > 0) {
      const mpaRegions = getRegionsForCountry(mpa.country);
      if (!mpaRegions.some((r) => filters.region.includes(r))) return false;
    }
    if (filters.country.length > 0 && !filters.country.includes(mpa.country)) return false;
    if (filters.areaSize.length > 0) {
      const matchesArea = filters.areaSize.some((sizeId) => {
        const opt = AREA_SIZE_OPTIONS.find((o) => o.id === sizeId);
        return opt && mpa.area >= opt.range[0] && mpa.area < opt.range[1];
      });
      if (!matchesArea) return false;
    }
    return true;
  }).length;
}

type ArrayFilterKey = 'healthStatus' | 'protectionLevel' | 'region' | 'country' | 'areaSize' | 'windFarmStatus';

function FilterPanelBody({ mpas, filters, onFiltersChange, savedMPAIds, windFarmSummary, filterCounts }: {
  mpas: MPA[];
  filters: MapFilters;
  onFiltersChange: (f: MapFilters) => void;
  savedMPAIds: string[];
  windFarmSummary?: WindFarmSummary | null;
  filterCounts: ReturnType<typeof useFilterCounts>;
}) {
  const protectionLevels = useMemo(() => {
    const levels = new Set<string>();
    mpas.forEach((mpa) => levels.add(mpa.protectionLevel || 'Not Reported'));
    return Array.from(levels).sort();
  }, [mpas]);

  const regions = useMemo(() => Object.keys(filterCounts.region).sort(), [filterCounts.region]);
  const countries = useMemo(() => Object.entries(filterCounts.country).sort((a, b) => getCountryName(a[0]).localeCompare(getCountryName(b[0]))).map(([c]) => c), [filterCounts.country]);

  const savedIdSet = useMemo(() => new Set(savedMPAIds), [savedMPAIds]);
  const savedCount = useMemo(() => savedMPAIds.length === 0 ? 0 : mpas.filter((mpa) => savedIdSet.has(mpa.dbId || mpa.id)).length, [mpas, savedMPAIds, savedIdSet]);

  const toggleFilter = (category: ArrayFilterKey, value: string) => {
    const current = filters[category];
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, [category]: updated });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <LayerToggle id="sst-layer" icon="temperature-high" iconColor="text-orange-500" label="Sea Surface Temperature" badgeLabel="Live" badgeClasses="text-balean-cyan bg-balean-cyan/10" description="Real-time SST data from Copernicus Marine Service. Updated daily." checked={filters.showSST} onChange={(v) => onFiltersChange({ ...filters, showSST: v })} />
      <LayerToggle id="wind-farms-layer" icon="wind" iconColor="text-orange-500" label="Offshore Wind Farms" badgeLabel="EMODnet + OSPAR" badgeClasses="text-orange-600 bg-orange-50" description="Offshore wind farm boundaries from EMODnet and OSPAR. Color-coded by development status." checked={filters.showWindFarms} onChange={(v) => onFiltersChange({ ...filters, showWindFarms: v })}>
        <AnimatePresence>
          {filters.showWindFarms && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="mt-2 pt-2 border-t border-balean-gray-100 space-y-1">
                {WIND_FARM_STATUS_ORDER.map((status) => (
                  <FilterCheckbox key={status} id={`wind-farm-status-${status}`} label={WIND_FARM_STATUS_LABELS[status]} count={windFarmSummary?.byStatus[status] ?? 0} checked={filters.windFarmStatus.includes(status)} onChange={() => toggleFilter('windFarmStatus', status)} hexColor={WIND_FARM_STATUS_COLORS[status]} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayerToggle>
      <div className="border-b border-balean-gray-100">
        <div className="flex items-center justify-between py-3 px-4 opacity-60">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fishing-pressure" checked={false} disabled className="w-4 h-4 rounded border-balean-gray-300 text-balean-gray-300 cursor-not-allowed" />
            <div className="flex items-center gap-2">
              <i className="fi fi-rr-ship text-balean-gray-400" />
              <span className="font-semibold text-balean-gray-500 text-sm">Fishing Pressure</span>
            </div>
          </div>
          <span className="text-[10px] text-balean-gray-400 bg-balean-gray-50 px-1.5 py-0.5 rounded">Coming Soon</span>
        </div>
        <div className="px-4 pb-3"><p className="text-[10px] text-balean-gray-400">Global fishing heatmap coming soon. View fishing data on individual MPA detail pages.</p></div>
      </div>
      <LayerToggle id="litter-hotspots-layer" icon="trash" iconColor="text-teal-500" label="Beach Litter Hotspots" badgeLabel="EMODnet" badgeClasses="text-teal-600 bg-teal-50" description="Beach litter survey data from EMODnet Chemistry and OSPAR monitoring. Colour-coded by litter density." checked={filters.showLitterHotspots} onChange={(v) => onFiltersChange({ ...filters, showLitterHotspots: v })} />
      {savedMPAIds.length > 0 && (
        <div className="border-b border-balean-gray-100">
          <label htmlFor="saved-only" className="flex items-center justify-between py-3 px-4 cursor-pointer group hover:bg-balean-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="saved-only" checked={filters.savedOnly} onChange={(e) => onFiltersChange({ ...filters, savedOnly: e.target.checked })} className="w-4 h-4 rounded border-balean-gray-300 text-balean-cyan focus:ring-balean-cyan" />
              <div className="flex items-center gap-2"><i className="fi fi-rr-heart text-red-400" /><span className="font-semibold text-balean-navy text-sm">Saved MPAs only</span></div>
            </div>
            <span className="text-xs text-balean-gray-400">{savedCount}</span>
          </label>
        </div>
      )}
      <FilterSection title="Estimated Health" icon="heart-rate" defaultOpen={false}>
        <p className="text-xs text-balean-gray-400 mb-2">Based on available data</p>
        <div className="space-y-1">{HEALTH_STATUS_OPTIONS.map((opt) => (<FilterCheckbox key={opt.id} id={`health-${opt.id}`} label={opt.label} count={filterCounts.healthStatus[opt.id] || 0} checked={filters.healthStatus.includes(opt.id)} onChange={() => toggleFilter('healthStatus', opt.id)} color={opt.color} />))}</div>
      </FilterSection>
      <FilterSection title="Protection Level" icon="shield-check" defaultOpen={false}>
        <div className="space-y-1">{protectionLevels.map((level) => (<FilterCheckbox key={level} id={`protection-${level}`} label={level} count={filterCounts.protectionLevel[level] || 0} checked={filters.protectionLevel.includes(level)} onChange={() => toggleFilter('protectionLevel', level)} />))}</div>
      </FilterSection>
      <FilterSection title="Area Size" icon="map" defaultOpen={false}>
        <div className="space-y-1">{AREA_SIZE_OPTIONS.map((opt) => (<FilterCheckbox key={opt.id} id={`area-${opt.id}`} label={opt.label} count={filterCounts.areaSize[opt.id] || 0} checked={filters.areaSize.includes(opt.id)} onChange={() => toggleFilter('areaSize', opt.id)} description={opt.description} />))}</div>
      </FilterSection>
      <FilterSection title="Region" icon="earth-americas" defaultOpen={false}>
        <div className="space-y-1">{regions.map((region) => (<FilterCheckbox key={region} id={`region-${region}`} label={region} count={filterCounts.region[region] || 0} checked={filters.region.includes(region)} onChange={() => toggleFilter('region', region)} />))}</div>
      </FilterSection>
      <FilterSection title="Country" icon="globe" defaultOpen={false}>
        <div className="space-y-1 max-h-48 overflow-y-auto">{countries.map((country) => (<FilterCheckbox key={country} id={`country-${country}`} label={getCountryName(country)} count={filterCounts.country[country] || 0} checked={filters.country.includes(country)} onChange={() => toggleFilter('country', country)} />))}</div>
      </FilterSection>
    </div>
  );
}

export function MapFilterPanel({
  mpas, filters, onFiltersChange, isOpen, onToggle, savedMPAIds = [], windFarmSummary,
}: MapFilterPanelProps) {
  const filterCounts = useFilterCounts(mpas);
  const savedIdSet = useMemo(() => new Set(savedMPAIds), [savedMPAIds]);
  const activeFilterCount = filters.healthStatus.length + filters.protectionLevel.length + filters.region.length + filters.country.length + filters.areaSize.length + filters.windFarmStatus.length + (filters.savedOnly ? 1 : 0);
  const filteredCount = useMemo(() => computeFilteredCount(mpas, filters, savedIdSet), [mpas, filters, savedIdSet]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0, x: -320 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-0 left-0 bottom-0 z-[1000] w-80 bg-white shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-balean-gray-100">
            <div className="flex items-center gap-2"><i className="fi fi-rr-filter text-balean-cyan" /><h2 className="font-display text-lg text-balean-navy">Filters</h2></div>
            <button onClick={onToggle} className="w-8 h-8 rounded-lg hover:bg-balean-gray-100 flex items-center justify-center transition-colors"><i className="fi fi-rr-cross-small text-balean-gray-400" /></button>
          </div>
          <div className="px-4 py-3 bg-balean-gray-50 border-b border-balean-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-balean-gray-600"><span className="font-bold text-balean-navy">{filteredCount}</span> of {mpas.length} MPAs</span>
              {activeFilterCount > 0 && (<button onClick={() => onFiltersChange(DEFAULT_FILTERS)} className="text-xs text-balean-cyan hover:text-balean-cyan-dark font-medium">Clear all</button>)}
            </div>
          </div>
          <FilterPanelBody mpas={mpas} filters={filters} onFiltersChange={onFiltersChange} savedMPAIds={savedMPAIds} windFarmSummary={windFarmSummary} filterCounts={filterCounts} />
          <div className="p-4 border-t border-balean-gray-100 bg-white">
            <button onClick={onToggle} className="w-full bg-balean-cyan hover:bg-balean-cyan-dark text-white font-semibold py-3 rounded-xl transition-colors">Show {filteredCount} MPAs</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Export filter helper function for use in parent components
export function filterMPAs(mpas: MPA[], filters: MapFilters, savedMPAIds: string[] = []): MPA[] {
  const savedIdSet = new Set(savedMPAIds);
  return mpas.filter((mpa) => {
    if (filters.savedOnly && !savedIdSet.has(mpa.dbId || mpa.id)) return false;
    if (filters.healthStatus.length > 0) {
      const matchesHealth = filters.healthStatus.some((statusId) => {
        const opt = HEALTH_STATUS_OPTIONS.find((o) => o.id === statusId);
        return opt && mpa.healthScore >= opt.range[0] && mpa.healthScore <= opt.range[1];
      });
      if (!matchesHealth) return false;
    }
    if (filters.protectionLevel.length > 0) {
      if (!filters.protectionLevel.includes(mpa.protectionLevel || 'Not Reported')) return false;
    }
    if (filters.region.length > 0) {
      const mpaRegions = getRegionsForCountry(mpa.country);
      if (!mpaRegions.some((r) => filters.region.includes(r))) return false;
    }
    if (filters.country.length > 0 && !filters.country.includes(mpa.country)) return false;
    if (filters.areaSize.length > 0) {
      const matchesArea = filters.areaSize.some((sizeId) => {
        const opt = AREA_SIZE_OPTIONS.find((o) => o.id === sizeId);
        return opt && mpa.area >= opt.range[0] && mpa.area < opt.range[1];
      });
      if (!matchesArea) return false;
    }
    return true;
  });
}
