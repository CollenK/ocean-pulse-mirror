'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MPA } from '@/types';
import { getCountryName } from '@/lib/country-names';
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

// Country to region mapping (ISO alpha-3 codes)
const COUNTRY_TO_REGION: Record<string, string> = {
  // Africa
  AGO: 'Africa', BEN: 'Africa', BWA: 'Africa', BDI: 'Africa', CMR: 'Africa',
  CPV: 'Africa', CAF: 'Africa', TCD: 'Africa', COM: 'Africa', COG: 'Africa',
  COD: 'Africa', CIV: 'Africa', DJI: 'Africa', EGY: 'Africa', GNQ: 'Africa',
  ERI: 'Africa', SWZ: 'Africa', ETH: 'Africa', GAB: 'Africa', GMB: 'Africa',
  GHA: 'Africa', GIN: 'Africa', GNB: 'Africa', KEN: 'Africa', LSO: 'Africa',
  LBR: 'Africa', LBY: 'Africa', MDG: 'Africa', MWI: 'Africa', MLI: 'Africa',
  MRT: 'Africa', MUS: 'Africa', MOZ: 'Africa', NAM: 'Africa', NER: 'Africa',
  NGA: 'Africa', RWA: 'Africa', STP: 'Africa', SEN: 'Africa', SYC: 'Africa',
  SLE: 'Africa', SOM: 'Africa', ZAF: 'Africa', SSD: 'Africa', SDN: 'Africa',
  TZA: 'Africa', TGO: 'Africa', TUN: 'Africa', UGA: 'Africa', ZMB: 'Africa',
  ZWE: 'Africa', MAR: 'Africa', REU: 'Africa', MYT: 'Africa', SHN: 'Africa',
  ESH: 'Africa',
  // Antarctica & Southern Ocean
  ATA: 'Antarctica & Southern Ocean', SGS: 'Antarctica & Southern Ocean',
  BVT: 'Antarctica & Southern Ocean', HMD: 'Antarctica & Southern Ocean',
  ATF: 'Antarctica & Southern Ocean',
  // Asia
  CHN: 'Asia', JPN: 'Asia', KOR: 'Asia', PRK: 'Asia', MNG: 'Asia',
  TWN: 'Asia', HKG: 'Asia', MAC: 'Asia', IND: 'Asia', PAK: 'Asia',
  BGD: 'Asia', LKA: 'Asia', MDV: 'Asia', NPL: 'Asia', BTN: 'Asia',
  IDN: 'Asia', MYS: 'Asia', PHL: 'Asia', VNM: 'Asia', THA: 'Asia',
  MMR: 'Asia', KHM: 'Asia', LAO: 'Asia', SGP: 'Asia', TLS: 'Asia',
  BRN: 'Asia', KAZ: 'Asia', KGZ: 'Asia', TJK: 'Asia', TKM: 'Asia',
  UZB: 'Asia',
  // Caribbean & Central America
  BHS: 'Caribbean & Central America', BRB: 'Caribbean & Central America',
  CUB: 'Caribbean & Central America', DMA: 'Caribbean & Central America',
  DOM: 'Caribbean & Central America', GRD: 'Caribbean & Central America',
  HTI: 'Caribbean & Central America', JAM: 'Caribbean & Central America',
  KNA: 'Caribbean & Central America', LCA: 'Caribbean & Central America',
  VCT: 'Caribbean & Central America', TTO: 'Caribbean & Central America',
  ATG: 'Caribbean & Central America', AIA: 'Caribbean & Central America',
  ABW: 'Caribbean & Central America', BMU: 'Caribbean & Central America',
  CYM: 'Caribbean & Central America', CUW: 'Caribbean & Central America',
  GLP: 'Caribbean & Central America', MTQ: 'Caribbean & Central America',
  MSR: 'Caribbean & Central America', PRI: 'Caribbean & Central America',
  SXM: 'Caribbean & Central America', TCA: 'Caribbean & Central America',
  VGB: 'Caribbean & Central America', VIR: 'Caribbean & Central America',
  BLM: 'Caribbean & Central America', MAF: 'Caribbean & Central America',
  BES: 'Caribbean & Central America', BLZ: 'Caribbean & Central America',
  CRI: 'Caribbean & Central America', SLV: 'Caribbean & Central America',
  GTM: 'Caribbean & Central America', HND: 'Caribbean & Central America',
  NIC: 'Caribbean & Central America', PAN: 'Caribbean & Central America',
  MEX: 'Caribbean & Central America',
  // Europe
  ALB: 'Europe', BEL: 'Europe', BGR: 'Europe', CYP: 'Europe', DEU: 'Europe',
  DNK: 'Europe', ESP: 'Europe', EST: 'Europe', FIN: 'Europe', FRA: 'Europe',
  GBR: 'Europe', GRC: 'Europe', HRV: 'Europe', IRL: 'Europe', ISL: 'Europe',
  ITA: 'Europe', LTU: 'Europe', LVA: 'Europe', MLT: 'Europe', MNE: 'Europe',
  NLD: 'Europe', NOR: 'Europe', POL: 'Europe', PRT: 'Europe', ROU: 'Europe',
  SVN: 'Europe', SWE: 'Europe', TUR: 'Europe', FRO: 'Europe', GIB: 'Europe',
  MCO: 'Europe', SJM: 'Europe', AUT: 'Europe', BIH: 'Europe', BLR: 'Europe',
  CHE: 'Europe', CZE: 'Europe', HUN: 'Europe', LIE: 'Europe', LUX: 'Europe',
  MDA: 'Europe', MKD: 'Europe', SMR: 'Europe', SRB: 'Europe', SVK: 'Europe',
  UKR: 'Europe', RUS: 'Europe',
  // Middle East
  BHR: 'Middle East', IRN: 'Middle East', IRQ: 'Middle East', ISR: 'Middle East',
  JOR: 'Middle East', KWT: 'Middle East', LBN: 'Middle East', OMN: 'Middle East',
  QAT: 'Middle East', SAU: 'Middle East', SYR: 'Middle East', ARE: 'Middle East',
  YEM: 'Middle East', PSE: 'Middle East',
  // North America
  CAN: 'North America', USA: 'North America', GRL: 'North America',
  SPM: 'North America', UMI: 'North America',
  // Oceania & Pacific
  AUS: 'Oceania & Pacific', NZL: 'Oceania & Pacific', FJI: 'Oceania & Pacific',
  PNG: 'Oceania & Pacific', SLB: 'Oceania & Pacific', VUT: 'Oceania & Pacific',
  WSM: 'Oceania & Pacific', TON: 'Oceania & Pacific', KIR: 'Oceania & Pacific',
  MHL: 'Oceania & Pacific', FSM: 'Oceania & Pacific', NRU: 'Oceania & Pacific',
  PLW: 'Oceania & Pacific', TUV: 'Oceania & Pacific', COK: 'Oceania & Pacific',
  NIU: 'Oceania & Pacific', TKL: 'Oceania & Pacific', PCN: 'Oceania & Pacific',
  NFK: 'Oceania & Pacific', NCL: 'Oceania & Pacific', PYF: 'Oceania & Pacific',
  WLF: 'Oceania & Pacific', GUM: 'Oceania & Pacific', MNP: 'Oceania & Pacific',
  CXR: 'Oceania & Pacific', CCK: 'Oceania & Pacific', IOT: 'Oceania & Pacific',
  ASM: 'Oceania & Pacific',
  // South America
  ARG: 'South America', BOL: 'South America', BRA: 'South America',
  CHL: 'South America', COL: 'South America', ECU: 'South America',
  GUY: 'South America', PRY: 'South America', PER: 'South America',
  SUR: 'South America', URY: 'South America', VEN: 'South America',
  GUF: 'South America', FLK: 'South America',
};

/** Resolves region(s) for a country field (handles semicolon-separated codes) */
function getRegionsForCountry(countryField: string): string[] {
  const codes = countryField.split(';').map((c) => c.trim());
  const regions = new Set<string>();
  for (const code of codes) {
    const region = COUNTRY_TO_REGION[code];
    if (region) regions.add(region);
  }
  return Array.from(regions);
}

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

function FilterCheckbox({ id, label, count, checked, onChange, color, hexColor, description }: FilterCheckboxProps) {
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

export function MapFilterPanel({
  mpas,
  filters,
  onFiltersChange,
  isOpen,
  onToggle,
  savedMPAIds = [],
  windFarmSummary,
}: MapFilterPanelProps) {
  // Calculate counts for each filter option
  const filterCounts = useMemo(() => {
    const counts = {
      healthStatus: {} as Record<string, number>,
      protectionLevel: {} as Record<string, number>,
      region: {} as Record<string, number>,
      country: {} as Record<string, number>,
      areaSize: {} as Record<string, number>,
    };

    mpas.forEach((mpa) => {
      // Health status counts
      HEALTH_STATUS_OPTIONS.forEach((opt) => {
        if (mpa.healthScore >= opt.range[0] && mpa.healthScore <= opt.range[1]) {
          counts.healthStatus[opt.id] = (counts.healthStatus[opt.id] || 0) + 1;
        }
      });

      // Protection level counts
      const protLevel = mpa.protectionLevel || 'Not Reported';
      counts.protectionLevel[protLevel] = (counts.protectionLevel[protLevel] || 0) + 1;

      // Region counts
      const regions = getRegionsForCountry(mpa.country);
      regions.forEach((region) => {
        counts.region[region] = (counts.region[region] || 0) + 1;
      });

      // Country counts
      counts.country[mpa.country] = (counts.country[mpa.country] || 0) + 1;

      // Area size counts
      AREA_SIZE_OPTIONS.forEach((opt) => {
        if (mpa.area >= opt.range[0] && mpa.area < opt.range[1]) {
          counts.areaSize[opt.id] = (counts.areaSize[opt.id] || 0) + 1;
        }
      });
    });

    return counts;
  }, [mpas]);

  // Get unique protection levels
  const protectionLevels = useMemo(() => {
    const levels = new Set<string>();
    mpas.forEach((mpa) => levels.add(mpa.protectionLevel || 'Not Reported'));
    return Array.from(levels).sort();
  }, [mpas]);

  // Get unique regions sorted alphabetically
  const regions = useMemo(() => {
    return Object.keys(filterCounts.region).sort();
  }, [filterCounts.region]);

  // Get unique countries sorted alphabetically by display name
  const countries = useMemo(() => {
    const countryList = Object.entries(filterCounts.country)
      .sort((a, b) => getCountryName(a[0]).localeCompare(getCountryName(b[0])))
      .map(([country]) => country);
    return countryList;
  }, [filterCounts.country]);

  // Array filter keys (excludes boolean filters like savedOnly)
  type ArrayFilterKey = 'healthStatus' | 'protectionLevel' | 'region' | 'country' | 'areaSize' | 'windFarmStatus';

  // Toggle filter value
  const toggleFilter = (category: ArrayFilterKey, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [category]: updated });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  // Count of saved MPAs present in the current MPA list
  const savedCount = useMemo(() => {
    if (savedMPAIds.length === 0) return 0;
    const savedSet = new Set(savedMPAIds);
    return mpas.filter((mpa) => savedSet.has(mpa.dbId || mpa.id)).length;
  }, [mpas, savedMPAIds]);

  // Count active filters (exclude savedOnly boolean from the array count)
  const activeFilterCount =
    filters.healthStatus.length +
    filters.protectionLevel.length +
    filters.region.length +
    filters.country.length +
    filters.areaSize.length +
    filters.windFarmStatus.length +
    (filters.savedOnly ? 1 : 0);

  // Build saved ID set for fast lookups
  const savedIdSet = useMemo(() => new Set(savedMPAIds), [savedMPAIds]);

  // Calculate filtered count
  const filteredCount = useMemo(() => {
    return mpas.filter((mpa) => {
      // Saved MPAs filter
      if (filters.savedOnly) {
        if (!savedIdSet.has(mpa.dbId || mpa.id)) return false;
      }

      // Health status filter
      if (filters.healthStatus.length > 0) {
        const matchesHealth = filters.healthStatus.some((statusId) => {
          const opt = HEALTH_STATUS_OPTIONS.find((o) => o.id === statusId);
          return opt && mpa.healthScore >= opt.range[0] && mpa.healthScore <= opt.range[1];
        });
        if (!matchesHealth) return false;
      }

      // Protection level filter
      if (filters.protectionLevel.length > 0) {
        if (!filters.protectionLevel.includes(mpa.protectionLevel || 'Not Reported')) {
          return false;
        }
      }

      // Region filter
      if (filters.region.length > 0) {
        const mpaRegions = getRegionsForCountry(mpa.country);
        if (!mpaRegions.some((r) => filters.region.includes(r))) return false;
      }

      // Country filter
      if (filters.country.length > 0) {
        if (!filters.country.includes(mpa.country)) {
          return false;
        }
      }

      // Area size filter
      if (filters.areaSize.length > 0) {
        const matchesArea = filters.areaSize.some((sizeId) => {
          const opt = AREA_SIZE_OPTIONS.find((o) => o.id === sizeId);
          return opt && mpa.area >= opt.range[0] && mpa.area < opt.range[1];
        });
        if (!matchesArea) return false;
      }

      return true;
    }).length;
  }, [mpas, filters, savedIdSet]);

  return (
    <>
      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 bottom-0 z-[1000] w-80 bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-balean-gray-100">
              <div className="flex items-center gap-2">
                <i className="fi fi-rr-filter text-balean-cyan" />
                <h2 className="font-display text-lg text-balean-navy">Filters</h2>
              </div>
              <button
                onClick={onToggle}
                className="w-8 h-8 rounded-lg hover:bg-balean-gray-100 flex items-center justify-center transition-colors"
              >
                <i className="fi fi-rr-cross-small text-balean-gray-400" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="px-4 py-3 bg-balean-gray-50 border-b border-balean-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-balean-gray-600">
                  <span className="font-bold text-balean-navy">{filteredCount}</span> of {mpas.length} MPAs
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-balean-cyan hover:text-balean-cyan-dark font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Filter Sections */}
            <div className="flex-1 overflow-y-auto">
              {/* SST Layer Toggle */}
              <div className="border-b border-balean-gray-100">
                <label
                  htmlFor="sst-layer"
                  className="flex items-center justify-between py-3 px-4 cursor-pointer group hover:bg-balean-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sst-layer"
                      checked={filters.showSST}
                      onChange={(e) => onFiltersChange({ ...filters, showSST: e.target.checked })}
                      className="w-4 h-4 rounded border-balean-gray-300 text-balean-cyan focus:ring-balean-cyan"
                    />
                    <div className="flex items-center gap-2">
                      <i className="fi fi-rr-temperature-high text-orange-500" />
                      <span className="font-semibold text-balean-navy text-sm group-hover:text-balean-navy transition-colors">
                        Sea Surface Temperature
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-balean-cyan bg-balean-cyan/10 px-1.5 py-0.5 rounded font-medium">
                    Live
                  </span>
                </label>
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-balean-gray-400">
                    Real-time SST data from Copernicus Marine Service. Updated daily.
                  </p>
                </div>
              </div>

              {/* Offshore Wind Farms Layer Toggle */}
              <div className="border-b border-balean-gray-100">
                <label
                  htmlFor="wind-farms-layer"
                  className="flex items-center justify-between py-3 px-4 cursor-pointer group hover:bg-balean-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="wind-farms-layer"
                      checked={filters.showWindFarms}
                      onChange={(e) => onFiltersChange({ ...filters, showWindFarms: e.target.checked })}
                      className="w-4 h-4 rounded border-balean-gray-300 text-balean-cyan focus:ring-balean-cyan"
                    />
                    <div className="flex items-center gap-2">
                      <i className="fi fi-rr-wind text-orange-500" />
                      <span className="font-semibold text-balean-navy text-sm group-hover:text-balean-navy transition-colors">
                        Offshore Wind Farms
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-medium">
                    EMODnet + OSPAR
                  </span>
                </label>
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-balean-gray-400">
                    Offshore wind farm boundaries from EMODnet and OSPAR. Color-coded by development status.
                  </p>

                  {/* Wind farm status filter checkboxes */}
                  <AnimatePresence>
                    {filters.showWindFarms && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-balean-gray-100 space-y-1">
                          {WIND_FARM_STATUS_ORDER.map((status) => (
                            <FilterCheckbox
                              key={status}
                              id={`wind-farm-status-${status}`}
                              label={WIND_FARM_STATUS_LABELS[status]}
                              count={windFarmSummary?.byStatus[status] ?? 0}
                              checked={filters.windFarmStatus.includes(status)}
                              onChange={() => toggleFilter('windFarmStatus', status)}
                              hexColor={WIND_FARM_STATUS_COLORS[status]}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Fishing Pressure Layer Toggle */}
              <div className="border-b border-balean-gray-100">
                <div className="flex items-center justify-between py-3 px-4 opacity-60">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="fishing-pressure"
                      checked={false}
                      disabled
                      className="w-4 h-4 rounded border-balean-gray-300 text-balean-gray-300 cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2">
                      <i className="fi fi-rr-ship text-balean-gray-400" />
                      <span className="font-semibold text-balean-gray-500 text-sm">
                        Fishing Pressure
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-balean-gray-400 bg-balean-gray-50 px-1.5 py-0.5 rounded">
                    Coming Soon
                  </span>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-balean-gray-400">
                    Global fishing heatmap coming soon. View fishing data on individual MPA detail pages.
                  </p>
                </div>
              </div>

              {/* Saved MPAs Toggle */}
              {savedMPAIds.length > 0 && (
                <div className="border-b border-balean-gray-100">
                  <label
                    htmlFor="saved-only"
                    className="flex items-center justify-between py-3 px-4 cursor-pointer group hover:bg-balean-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="saved-only"
                        checked={filters.savedOnly}
                        onChange={(e) => onFiltersChange({ ...filters, savedOnly: e.target.checked })}
                        className="w-4 h-4 rounded border-balean-gray-300 text-balean-cyan focus:ring-balean-cyan"
                      />
                      <div className="flex items-center gap-2">
                        <i className="fi fi-rr-heart text-red-400" />
                        <span className="font-semibold text-balean-navy text-sm group-hover:text-balean-navy transition-colors">
                          Saved MPAs only
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-balean-gray-400">{savedCount}</span>
                  </label>
                </div>
              )}

              {/* Health Status */}
              <FilterSection title="Estimated Health" icon="heart-rate" defaultOpen={false}>
                <p className="text-xs text-balean-gray-400 mb-2">Based on available data</p>
                <div className="space-y-1">
                  {HEALTH_STATUS_OPTIONS.map((opt) => (
                    <FilterCheckbox
                      key={opt.id}
                      id={`health-${opt.id}`}
                      label={opt.label}
                      count={filterCounts.healthStatus[opt.id] || 0}
                      checked={filters.healthStatus.includes(opt.id)}
                      onChange={() => toggleFilter('healthStatus', opt.id)}
                      color={opt.color}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Protection Level */}
              <FilterSection title="Protection Level" icon="shield-check" defaultOpen={false}>
                <div className="space-y-1">
                  {protectionLevels.map((level) => (
                    <FilterCheckbox
                      key={level}
                      id={`protection-${level}`}
                      label={level}
                      count={filterCounts.protectionLevel[level] || 0}
                      checked={filters.protectionLevel.includes(level)}
                      onChange={() => toggleFilter('protectionLevel', level)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Area Size */}
              <FilterSection title="Area Size" icon="map" defaultOpen={false}>
                <div className="space-y-1">
                  {AREA_SIZE_OPTIONS.map((opt) => (
                    <FilterCheckbox
                      key={opt.id}
                      id={`area-${opt.id}`}
                      label={opt.label}
                      count={filterCounts.areaSize[opt.id] || 0}
                      checked={filters.areaSize.includes(opt.id)}
                      onChange={() => toggleFilter('areaSize', opt.id)}
                      description={opt.description}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Region */}
              <FilterSection title="Region" icon="earth-americas" defaultOpen={false}>
                <div className="space-y-1">
                  {regions.map((region) => (
                    <FilterCheckbox
                      key={region}
                      id={`region-${region}`}
                      label={region}
                      count={filterCounts.region[region] || 0}
                      checked={filters.region.includes(region)}
                      onChange={() => toggleFilter('region', region)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Country */}
              <FilterSection title="Country" icon="globe" defaultOpen={false}>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {countries.map((country) => (
                    <FilterCheckbox
                      key={country}
                      id={`country-${country}`}
                      label={getCountryName(country)}
                      count={filterCounts.country[country] || 0}
                      checked={filters.country.includes(country)}
                      onChange={() => toggleFilter('country', country)}
                    />
                  ))}
                </div>
              </FilterSection>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-balean-gray-100 bg-white">
              <button
                onClick={onToggle}
                className="w-full bg-balean-cyan hover:bg-balean-cyan-dark text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Show {filteredCount} MPAs
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Export filter helper function for use in parent components
export function filterMPAs(mpas: MPA[], filters: MapFilters, savedMPAIds: string[] = []): MPA[] {
  const savedIdSet = new Set(savedMPAIds);

  return mpas.filter((mpa) => {
    // Saved MPAs filter
    if (filters.savedOnly) {
      if (!savedIdSet.has(mpa.dbId || mpa.id)) return false;
    }

    // Health status filter
    if (filters.healthStatus.length > 0) {
      const matchesHealth = filters.healthStatus.some((statusId) => {
        const opt = HEALTH_STATUS_OPTIONS.find((o) => o.id === statusId);
        return opt && mpa.healthScore >= opt.range[0] && mpa.healthScore <= opt.range[1];
      });
      if (!matchesHealth) return false;
    }

    // Protection level filter
    if (filters.protectionLevel.length > 0) {
      if (!filters.protectionLevel.includes(mpa.protectionLevel || 'Not Reported')) {
        return false;
      }
    }

    // Region filter
    if (filters.region.length > 0) {
      const mpaRegions = getRegionsForCountry(mpa.country);
      if (!mpaRegions.some((r) => filters.region.includes(r))) return false;
    }

    // Country filter
    if (filters.country.length > 0) {
      if (!filters.country.includes(mpa.country)) {
        return false;
      }
    }

    // Area size filter
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
