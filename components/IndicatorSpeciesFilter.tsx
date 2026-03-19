/**
 * IndicatorSpeciesFilter Component
 * Multi-select category filter for indicator species with animations
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './ui';
import {
  SpeciesCategory,
  CATEGORY_INFO,
  ConservationStatus,
  CONSERVATION_STATUS_INFO,
} from '@/types/indicator-species';

interface IndicatorSpeciesFilterProps {
  selectedCategories: SpeciesCategory[];
  onCategoryChange: (categories: SpeciesCategory[]) => void;
  selectedStatuses?: ConservationStatus[];
  onStatusChange?: (statuses: ConservationStatus[]) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showStatusFilter?: boolean;
  showSearch?: boolean;
  compact?: boolean;
}

// Map category to icon names
const CATEGORY_ICONS: Record<SpeciesCategory, string> = {
  [SpeciesCategory.APEX_PREDATOR]: 'shark',
  [SpeciesCategory.CORAL]: 'flower',
  [SpeciesCategory.FOUNDATION]: 'leaf',
  [SpeciesCategory.KEYSTONE]: 'star',
  [SpeciesCategory.SEABIRD]: 'bird',
  [SpeciesCategory.INVERTEBRATE]: 'bug',
};

function SearchBar({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (q: string) => void }) {
  return (
    <div className="px-4 pb-3">
      <div className="relative">
        <Icon name="search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search species..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-primary/20 focus:border-ocean-primary"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <Icon name="xmark" size="sm" />
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryGrid({
  selectedCategories,
  onToggle,
}: {
  selectedCategories: SpeciesCategory[];
  onToggle: (category: SpeciesCategory) => void;
}) {
  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Categories</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.values(SpeciesCategory).map((category) => {
          const info = CATEGORY_INFO[category];
          const isSelected = selectedCategories.includes(category);
          return (
            <motion.button
              key={category}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggle(category)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                isSelected
                  ? 'text-white border-transparent'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300 bg-white'
              }`}
              style={isSelected ? { backgroundColor: info.color, borderColor: info.color } : {}}
              aria-pressed={isSelected}
              role="checkbox"
              aria-checked={isSelected}
            >
              <Icon name={CATEGORY_ICONS[category]} size="sm" />
              <span className="truncate">{info.name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ConservationStatusFilter({
  selectedStatuses,
  onToggle,
}: {
  selectedStatuses: ConservationStatus[];
  onToggle: (status: ConservationStatus) => void;
}) {
  return (
    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Conservation Status</p>
      <div className="space-y-1">
        {Object.values(ConservationStatus).map((status) => {
          const info = CONSERVATION_STATUS_INFO[status];
          const isSelected = selectedStatuses.includes(status);
          return (
            <motion.button
              key={status}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggle(status)}
              className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all border ${
                isSelected ? 'border-current bg-opacity-10' : 'border-transparent hover:bg-gray-50'
              }`}
              style={isSelected ? { color: info.color, backgroundColor: `${info.color}10`, borderColor: `${info.color}40` } : {}}
              aria-pressed={isSelected}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white mt-0.5"
                style={{ backgroundColor: info.color }}
              >
                {status}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isSelected ? '' : 'text-gray-700'}`}>{info.name}</p>
                <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{info.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function FilterHeader({ compact, isExpanded, allCategoriesSelected, onExpand, onToggleAll }: {
  compact: boolean; isExpanded: boolean; allCategoriesSelected: boolean;
  onExpand: () => void; onToggleAll: () => void;
}) {
  return (
    <div
      className={`px-4 py-3 flex items-center justify-between ${compact ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={compact ? onExpand : undefined}
    >
      <div className="flex items-center gap-2">
        <Icon name="filter" size="sm" className="text-ocean-primary" />
        <h3 className="text-sm font-semibold text-ocean-deep">Filter Indicator Species</h3>
      </div>
      {compact && (
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <Icon name="chevron-down" size="sm" className="text-gray-400" />
        </motion.div>
      )}
      {!compact && (
        <button onClick={onToggleAll} className="text-xs text-ocean-primary hover:text-ocean-dark font-medium">
          {allCategoriesSelected ? 'Clear All' : 'Select All'}
        </button>
      )}
    </div>
  );
}

function ActiveFiltersSummary({ count, total, onClear }: { count: number; total: number; onClear: () => void }) {
  if (count === 0 || count === total) return null;
  return (
    <div className="px-4 pb-3 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{count} of {total} categories selected</p>
        <button onClick={onClear} className="text-xs text-ocean-primary hover:text-ocean-dark font-medium">Clear filters</button>
      </div>
    </div>
  );
}

export function IndicatorSpeciesFilter({
  selectedCategories, onCategoryChange, selectedStatuses = [], onStatusChange,
  searchQuery = '', onSearchChange, showStatusFilter = false, showSearch = true, compact = false,
}: IndicatorSpeciesFilterProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const toggleCategory = useCallback((category: SpeciesCategory) => {
    const updated = selectedCategories.includes(category) ? selectedCategories.filter(c => c !== category) : [...selectedCategories, category];
    onCategoryChange(updated);
  }, [selectedCategories, onCategoryChange]);

  const toggleStatus = useCallback((status: ConservationStatus) => {
    if (!onStatusChange) return;
    const updated = selectedStatuses.includes(status) ? selectedStatuses.filter(s => s !== status) : [...selectedStatuses, status];
    onStatusChange(updated);
  }, [selectedStatuses, onStatusChange]);

  const allCategoriesSelected = useMemo(() => selectedCategories.length === Object.values(SpeciesCategory).length, [selectedCategories]);
  const totalCategories = Object.values(SpeciesCategory).length;

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
      <FilterHeader
        compact={compact} isExpanded={isExpanded} allCategoriesSelected={allCategoriesSelected}
        onExpand={() => setIsExpanded(!isExpanded)}
        onToggleAll={() => onCategoryChange(allCategoriesSelected ? [] : Object.values(SpeciesCategory))}
      />
      <AnimatePresence>
        {(isExpanded || !compact) && (
          <motion.div initial={compact ? { height: 0, opacity: 0 } : false} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {showSearch && onSearchChange && <SearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />}
            <CategoryGrid selectedCategories={selectedCategories} onToggle={toggleCategory} />
            {showStatusFilter && onStatusChange && <ConservationStatusFilter selectedStatuses={selectedStatuses} onToggle={toggleStatus} />}
            <ActiveFiltersSummary count={selectedCategories.length} total={totalCategories} onClear={() => onCategoryChange([])} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
